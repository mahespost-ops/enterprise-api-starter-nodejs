# Event Logging & Webhook Delivery Architecture

**Last Updated:** 2025-10-08

This document describes the architecture for non-blocking event logging and webhook delivery with maximum data integrity guarantees.

---

## Overview

The event logging system captures every API request/response for audit trails, analytics, and webhook delivery. It must meet stringent requirements:

- **Non-blocking**: Response latency <200ms regardless of event processing
- **Zero event loss**: Guaranteed persistence even during high load or crashes
- **Data integrity**: ACID compliance with idempotency
- **CloudEvents 1.0.2**: Standard event format for webhook delivery
- **Performance**: O(1) event type lookup, batched writes, async processing

---

## Architecture Components

### 1. EventType Cache Service (In-Memory Lookup)

**Purpose**: Eliminate database queries for event type resolution on every request.

**Implementation**:
```typescript
// src/services/event-type-cache.service.ts
class EventTypeCache {
  private cache: Map<string, EventType>; // Key: "METHOD:PATH"

  async initialize(): Promise<void>;
  getEventType(method: string, path: string): EventType | null;
  refresh(): Promise<void>; // Called after EventType CRUD
}
```

**Initialization**:
- Load all EventTypes from database on app startup
- Store in Map keyed by `${httpMethod}:${httpPath}`
- Example: `"POST:/api/v1/auth/login"` → EventType object

**Lookup**:
- O(1) constant-time lookup (no database query)
- Returns `{ verb, isWebhookEvent, ... }` for middleware

**Refresh Strategy**:
- Manual refresh after admin EventType mutations
- Future: Redis pub/sub or polling for multi-instance deployments

---

### 2. Audit Logger Middleware (Request/Response Capture)

**Purpose**: Capture HTTP request/response data after response is sent to client.

**Implementation**:
```typescript
// src/middleware/audit-logger.middleware.ts
export const auditLoggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Capture request snapshot
  const requestSnapshot = {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  // Hook into response finish (AFTER response sent to client)
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Lookup event type from cache (O(1))
    const eventType = eventTypeCache.getEventType(req.method, req.path);
    if (!eventType) return; // Skip if no event type configured

    // Emit event to processor (non-blocking)
    eventProcessor.emit('api-request', {
      eventType,
      request: requestSnapshot,
      response: {
        statusCode: res.statusCode,
        duration,
      },
      context: {
        userId: req.user?.id,
        orgId: req.orgId,
        envId: req.envId,
        impersonation: req.impersonation,
      },
    });
  });

  next();
};
```

**Key Features**:
- Runs **after** response via `res.on('finish')` hook
- Non-blocking: Uses EventEmitter pattern
- Zero DB queries: EventType lookup from in-memory cache
- Captures full audit trail: request, response, headers, IP, user agent

**Placement in Middleware Chain**:
```typescript
// app.ts
app.use(requestIdMiddleware);        // 1. Generate request ID
app.use(authMiddleware);             // 2. Authenticate user
app.use(auditLoggerMiddleware);      // 3. Register event listener
app.use('/api/v1', routes);          // 4. Route handlers
// Response sent to client here
// res.on('finish') triggers → event emitted
```

---

### 3. Event Processor (EventEmitter Orchestration)

**Purpose**: Orchestrate parallel event processing streams (database + message queue).

**Implementation**:
```typescript
// src/services/event-processor.service.ts
class EventProcessor extends EventEmitter {
  private batchWriter: EventBatchWriter;
  private messageQueue: IMessageQueueAdapter;

  constructor() {
    super();
    this.on('api-request', this.processEvent.bind(this));
  }

  private async processEvent(eventData: EventData): Promise<void> {
    setImmediate(async () => {
      try {
        // Stream A: Database persistence (batched)
        this.batchWriter.enqueue(eventData);

        // Stream B: Message queue (webhook events only)
        if (eventData.eventType.isWebhookEvent) {
          const cloudEvent = this.toCloudEvent(eventData);
          await this.messageQueue.publish({
            topic: 'events.webhook',
            data: cloudEvent,
            attributes: {
              eventType: eventData.eventType.verb,
              orgId: eventData.context.orgId,
              envId: eventData.context.envId,
            },
          });
        }
      } catch (error) {
        logger.error('Event processing failed', { error, eventData });
        // Fallback: Write to emergency buffer
        this.writeToEmergencyBuffer(eventData);
      }
    });
  }

  private toCloudEvent(eventData: EventData): CloudEvent {
    // CloudEvents 1.0.2 format
    return {
      specversion: '1.0.2',
      type: `com.enterprise.${eventData.eventType.verb}`,
      source: `/orgs/${eventData.context.orgId}/envs/${eventData.context.envId}`,
      id: uuidv4(),
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: {
        actor: eventData.context.actor,
        object: eventData.request.body,
        target: eventData.request.params,
        audit: {
          http: {
            method: eventData.request.method,
            path: eventData.request.path,
            statusCode: eventData.response.statusCode,
            duration: eventData.response.duration,
          },
          ip: eventData.request.ip,
          userAgent: eventData.request.userAgent,
        },
      },
    };
  }

  async shutdown(): Promise<void> {
    await this.batchWriter.flush();
    await this.messageQueue.cleanup();
  }
}
```

**Key Features**:
- `setImmediate()`: Defers processing to next event loop tick (non-blocking)
- Parallel streams: Database write + message queue publish
- Error handling: Emergency buffer for failed events
- Graceful shutdown: Flush pending batches

---

### 4. Event Batch Writer (Database Persistence)

**Purpose**: Batch database writes for performance and atomicity.

**Implementation**:
```typescript
// src/services/event-batch-writer.service.ts
class EventBatchWriter {
  private buffer: EventData[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 50;

  enqueue(eventData: EventData): void {
    this.buffer.push(eventData);

    // Trigger flush if batch size reached
    if (this.buffer.length >= this.BATCH_SIZE) {
      this.flush();
    } else if (!this.flushTimer) {
      // Schedule flush after interval
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL_MS);
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.buffer.length);
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      // Bulk insert with RETURNING for idempotency verification
      const events = batch.map(data => ({
        id: uuidv4(), // Idempotency key
        environmentId: data.context.envId,
        verb: data.eventType.verb,
        actorType: data.context.userId ? 'User' : 'System',
        actor: this.buildActor(data.context),
        object: this.buildObject(data.request),
        target: data.request.params,
        audit: this.buildAudit(data.request, data.response),
        description: this.buildDescription(data),
        timestamp: new Date(),
        organizationId: data.context.orgId,
        organizationName: data.context.orgName,
        environmentName: data.context.envName,
        isWebhookEvent: data.eventType.isWebhookEvent,
      }));

      await Event.bulkCreate(events, {
        returning: true,
        validate: true,
      });

      logger.debug(`Flushed ${events.length} events to database`);
    } catch (error) {
      logger.error('Batch write failed', { error, batchSize: batch.length });

      // Fallback: Try individual writes
      await this.fallbackIndividualWrites(batch);
    }
  }

  private async fallbackIndividualWrites(batch: EventData[]): Promise<void> {
    for (const data of batch) {
      try {
        await this.writeSingleEvent(data);
      } catch (error) {
        logger.error('Individual event write failed', { error, eventData: data });
        this.writeToWAL(data); // Write-Ahead Log for recovery
      }
    }
  }

  private writeToWAL(eventData: EventData): void {
    // Append to write-ahead log file for crash recovery
    const walPath = path.join(config.dataDir, 'event-wal.jsonl');
    fs.appendFileSync(walPath, JSON.stringify(eventData) + '\n');
  }
}
```

**Key Features**:
- **Batching**: 100 events or 50ms window (whichever comes first)
- **Atomicity**: PostgreSQL bulk insert with transaction
- **Fallback**: Individual writes if batch fails
- **WAL**: Write-Ahead Log for crash recovery
- **Idempotency**: UUID idempotency keys prevent duplicates

**Configuration**:
```typescript
// src/config/event-config.ts
export const eventConfig = {
  batchSize: parseInt(process.env.EVENT_BATCH_SIZE || '100'),
  flushIntervalMs: parseInt(process.env.EVENT_FLUSH_INTERVAL_MS || '50'),
  enableWAL: process.env.EVENT_ENABLE_WAL !== 'false',
  walPath: process.env.EVENT_WAL_PATH || './data/event-wal.jsonl',
};
```

---

### 5. Message Queue Integration (Webhook Delivery)

**Purpose**: Publish webhook events to message queue for async delivery.

**Flow**:
1. EventProcessor publishes CloudEvents to `events.webhook` topic
2. Separate consumer service (future: `webhook-worker`) subscribes to topic
3. Consumer processes webhook deliveries with retry/backoff
4. Dead-letter queue for failed deliveries

**CloudEvents 1.0.2 Format**:
```json
{
  "specversion": "1.0.2",
  "type": "com.enterprise.device.update",
  "source": "/orgs/a1b2c3d4/envs/e5f6g7h8",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "time": "2025-10-08T12:34:56.789Z",
  "datacontenttype": "application/json",
  "data": {
    "actor": {
      "type": "User",
      "id": "u1u2u3u4",
      "name": "John Doe",
      "impersonation": null
    },
    "object": {
      "type": "Device",
      "id": "d1d2d3d4",
      "name": "John's iPhone"
    },
    "target": null,
    "audit": {
      "http": {
        "method": "PATCH",
        "path": "/api/v1/orgs/a1b2c3d4/envs/e5f6g7h8/devices/d1d2d3d4",
        "statusCode": 200,
        "duration": 45
      },
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  }
}
```

**Message Attributes** (for filtering):
- `eventType`: `device.update`
- `orgId`: `a1b2c3d4`
- `envId`: `e5f6g7h8`

---

### 6. Graceful Shutdown (Zero Event Loss)

**Purpose**: Ensure all pending events are persisted before process exits.

**Implementation**:
```typescript
// src/server.ts
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  // 1. Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // 2. Flush pending event batches
  await eventProcessor.shutdown();
  logger.info('Event processor flushed');

  // 3. Close database connections
  await sequelize.close();
  logger.info('Database connections closed');

  // 4. Exit process
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Timeout fallback (force exit after 30s)
setTimeout(() => {
  logger.error('Graceful shutdown timeout, forcing exit');
  process.exit(1);
}, 30000).unref();
```

**Guarantees**:
- All buffered events flushed to database
- In-flight message queue publishes completed
- WAL persists unflushed events for recovery
- 30-second timeout prevents hanging

---

## Event Data Model

### Event Table Schema
```sql
CREATE TABLE event (
  id UUID PRIMARY KEY,
  environment_id UUID NOT NULL,
  verb VARCHAR(100) NOT NULL,           -- From EventType
  actor_type ENUM('User', 'System'),
  actor JSONB NOT NULL,                 -- User ID, name, impersonation chain
  object JSONB NOT NULL,                -- Primary resource being acted upon
  target JSONB,                         -- Secondary resource (optional)
  audit JSONB,                          -- HTTP metadata, IP, user agent
  description TEXT,
  timestamp TIMESTAMP NOT NULL,
  organization_id UUID NOT NULL,        -- Denormalized for read performance
  organization_name VARCHAR(255) NOT NULL,
  environment_name VARCHAR(255) NOT NULL,
  is_webhook_event BOOLEAN DEFAULT FALSE
);

-- Cursor pagination index (critical for <200ms SLO)
CREATE INDEX idx_event_cursor_pagination ON event (environment_id, timestamp DESC, id DESC);
CREATE INDEX idx_event_webhook ON event (is_webhook_event, timestamp DESC) WHERE is_webhook_event = TRUE;
```

### EventType Table Schema
```sql
CREATE TABLE event_type (
  id UUID PRIMARY KEY,
  verb VARCHAR(100) UNIQUE NOT NULL,    -- e.g., "auth.logout", "device.update"
  http_method VARCHAR(10) NOT NULL,     -- GET, POST, PUT, PATCH, DELETE
  http_path VARCHAR(500) NOT NULL,      -- e.g., "/api/v1/auth/logout"
  is_webhook_event BOOLEAN DEFAULT FALSE,
  description TEXT
);

CREATE UNIQUE INDEX idx_event_type_endpoint ON event_type (http_method, http_path);
```

---

## Performance Characteristics

### Latency Budget (200ms SLO)
- **Request processing**: 150ms (business logic)
- **Response sent to client**: 0ms (response finishes)
- **Event capture**: 1ms (EventEmitter.emit)
- **EventType cache lookup**: <1ms (O(1) Map lookup)
- **Batch enqueue**: <1ms (array push)
- **Total user-facing latency**: ~150ms ✅

### Throughput
- **EventEmitter**: Millions of events/sec (in-memory)
- **Batch writes**: 2,000 events/sec (100 events × 20 batches/sec)
- **Message queue**: Provider-dependent (Pub/Sub: 10k msg/sec per topic)

### Memory Footprint
- **EventType cache**: ~10KB for 100 event types
- **Event buffer**: ~100KB for 100 pending events
- **EventEmitter**: Negligible (listener references)

---

## Failure Scenarios & Recovery

### Scenario 1: Database Unavailable
- **Behavior**: Batch write fails
- **Recovery**:
  1. Fallback to individual writes with retry
  2. If still failing, write to WAL
  3. Background job replays WAL on DB recovery

### Scenario 2: Message Queue Unavailable
- **Behavior**: CloudEvents publish fails
- **Recovery**:
  1. Retry with exponential backoff (3 attempts)
  2. If still failing, send to dead-letter queue
  3. Alert on-call engineer

### Scenario 3: Process Crash (SIGKILL)
- **Behavior**: Buffered events lost
- **Recovery**:
  1. On restart, replay WAL (if enabled)
  2. WAL entries marked as processed after successful insert
  3. Idempotency keys prevent duplicates

### Scenario 4: High Load (Buffer Overflow)
- **Behavior**: Buffer exceeds memory limits
- **Recovery**:
  1. Trigger immediate flush (bypass timer)
  2. Apply backpressure (pause EventEmitter)
  3. Circuit breaker: Skip event capture if buffer critical

---

## Testing Strategy

### Unit Tests
- EventTypeCache: Initialization, lookup, refresh
- AuditLoggerMiddleware: Request/response capture
- EventProcessor: CloudEvents format, error handling
- EventBatchWriter: Batching logic, flush timing, WAL writes

### Integration Tests
- End-to-end: API request → Event table insert
- Message queue: CloudEvents published correctly
- Graceful shutdown: Pending events flushed

### Load Tests
- 10,000 req/sec sustained: Verify batching efficiency
- Database failure: Verify WAL recovery
- Process restart: Verify no duplicate events

### Chaos Tests
- Kill process during batch write
- Disconnect database mid-flush
- Saturate message queue

---

## Migration Plan

### Phase 1: Foundation (Week 1)
- EventTypeCache service + initialization
- Configuration management
- Unit tests

### Phase 2: Event Capture (Week 2)
- AuditLoggerMiddleware implementation
- EventProcessor with EventEmitter
- Integration tests

### Phase 3: Persistence (Week 3)
- EventBatchWriter with batching logic
- WAL implementation
- Graceful shutdown hooks

### Phase 4: Message Queue (Week 4)
- CloudEvents formatting
- Message queue integration
- Dead-letter queue setup

### Phase 5: Monitoring & Tuning (Week 5)
- Metrics: batch size, flush latency, queue depth
- Alerts: WAL growth, queue failures
- Performance tuning: batch size, flush interval

---

## Monitoring & Observability

### Metrics (Prometheus)
- `event_capture_total` - Total events captured
- `event_batch_size` - Histogram of batch sizes
- `event_flush_duration_ms` - Histogram of flush latency
- `event_wal_entries` - Count of WAL entries (alert if growing)
- `event_queue_publish_errors` - Count of queue publish failures

### Logs (Structured JSON)
- Event capture: `{ level: 'debug', event: 'event_captured', verb, duration }`
- Batch flush: `{ level: 'info', event: 'batch_flushed', count, duration }`
- Errors: `{ level: 'error', event: 'batch_write_failed', error, batchSize }`

### Dashboards
- Real-time event throughput
- Batch efficiency (avg batch size)
- Error rate (WAL writes, queue failures)

---

## References

- **CloudEvents Spec**: https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
- **W3C Activity Streams**: https://www.w3.org/TR/activitystreams-core/
- **Node.js EventEmitter**: https://nodejs.org/api/events.html
- **PostgreSQL Bulk Insert**: https://www.postgresql.org/docs/current/sql-insert.html

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-08 | Use EventEmitter over worker threads | Simpler architecture, sufficient for <10k req/sec |
| 2025-10-08 | Batch size 100 events or 50ms | Balance between latency and throughput |
| 2025-10-08 | WAL as JSONL file | Simple, crash-resistant, easy to replay |
| 2025-10-08 | CloudEvents 1.0.2 standard | Industry standard, interoperable, future-proof |
| 2025-10-08 | In-memory EventType cache | Eliminates 1 DB query per request (200ms SLO) |
