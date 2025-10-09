# Event Logging Architecture Implementation Progress

**Date Started:** 2025-10-08
**Status:** 🟡 IN PROGRESS
**Progress:** 0/9 components complete (0%)

---

## Summary

Implementing non-blocking event logging system with CloudEvents 1.0.2 webhook delivery following the architecture defined in `api/docs/EVENT_LOGGING_ARCHITECTURE.md`.

**Key Goals:**
- ✅ <200ms response latency (non-blocking event capture)
- ✅ Zero event loss (batched writes + WAL)
- ✅ O(1) EventType lookup (in-memory cache)
- ✅ CloudEvents 1.0.2 standard for webhooks
- ✅ Graceful shutdown with event flush

---

## Overall Progress Summary

| Phase | Component | Status | Files | Tests |
|-------|-----------|--------|-------|-------|
| 1 | Configuration & Constants | ⏳ TODO | 0/2 | - |
| 2 | EventType Cache Service | ⏳ TODO | 0/1 | 0/8 |
| 3 | Event Batch Writer | ⏳ TODO | 0/1 | 0/12 |
| 4 | Event Processor | ⏳ TODO | 0/1 | 0/10 |
| 5 | Audit Logger Middleware | ⏳ TODO | 0/1 | 0/6 |
| 6 | App Integration | ⏳ TODO | 0/2 | - |
| 7 | Adapter Factory Updates | ⏳ TODO | 0/1 | - |
| 8 | Helper Utilities | ⏳ TODO | 0/2 | 0/8 |
| 9 | Testing & Validation | ⏳ TODO | 0/0 | 0/10 |

**Total:** 0/11 files created, 0/3 files modified, 0/54 tests written

---

## Architecture Reference

**Design Document:** `api/docs/EVENT_LOGGING_ARCHITECTURE.md`

**Key Components:**
1. **EventTypeCache** - In-memory Map for O(1) endpoint → event type lookup
2. **EventBatchWriter** - Batched database writes (100 events or 50ms)
3. **EventProcessor** - EventEmitter orchestration + CloudEvents formatting
4. **AuditLogger** - Middleware to capture requests after response
5. **WAL** - Write-Ahead Log for crash recovery

**Request Flow:**
```
HTTP Request
  → Auth Middleware (attach req.user)
  → Audit Logger Middleware (register res.on('finish'))
  → Route Handler
  → Response Sent to Client
  ↓
  res.on('finish') fires
  → EventType Cache Lookup (O(1))
  → EventProcessor.emit('api-request')
  → setImmediate() [non-blocking]
    ├─→ EventBatchWriter.enqueue() → Database (batched)
    └─→ MessageQueue.publish() → CloudEvents (webhook events only)
```

---

## Phase 1: Configuration & Constants

### Status: ⏳ TODO

### Files to Create

#### 1.1 Event Configuration (`src/config/event.config.ts`)

**Purpose:** Centralized configuration for event logging system

**Contents:**
```typescript
export const eventConfig = {
  // Batch Writer Settings
  batchSize: parseInt(process.env.EVENT_BATCH_SIZE || '100'),
  flushIntervalMs: parseInt(process.env.EVENT_FLUSH_INTERVAL_MS || '50'),

  // Write-Ahead Log Settings
  enableWAL: process.env.EVENT_ENABLE_WAL !== 'false',
  walPath: process.env.EVENT_WAL_PATH || './data/event-wal.jsonl',

  // CloudEvents Settings
  cloudEventsSpecVersion: '1.0.2',
  cloudEventsSource: process.env.APP_URL || 'http://localhost:3000',

  // Performance Settings
  maxBufferSizeBytes: parseInt(process.env.EVENT_MAX_BUFFER_SIZE || '10485760'), // 10MB
  enableEventCapture: process.env.ENABLE_EVENT_CAPTURE !== 'false',
} as const;
```

**Environment Variables to Document:**
- `EVENT_BATCH_SIZE` (default: 100)
- `EVENT_FLUSH_INTERVAL_MS` (default: 50)
- `EVENT_ENABLE_WAL` (default: true)
- `EVENT_WAL_PATH` (default: ./data/event-wal.jsonl)
- `EVENT_MAX_BUFFER_SIZE` (default: 10MB)
- `ENABLE_EVENT_CAPTURE` (default: true)

**Checklist:**
- [ ] Create config file
- [ ] Add JSDoc comments
- [ ] Export as const object
- [ ] Update main config/index.ts to re-export
- [ ] Add to .env.example

---

#### 1.2 Event Types (`src/types/event.types.ts`)

**Purpose:** TypeScript interfaces for event logging system

**Contents:**
```typescript
import { EventType } from '../models/EventType.model';

/**
 * Event data captured from HTTP request/response
 */
export interface EventData {
  eventType: EventType;
  request: RequestSnapshot;
  response: ResponseSnapshot;
  context: EventContext;
}

export interface RequestSnapshot {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
  ip: string;
  userAgent: string;
}

export interface ResponseSnapshot {
  statusCode: number;
  duration: number;
}

export interface EventContext {
  userId?: string;
  orgId?: string;
  envId?: string;
  orgName?: string;
  envName?: string;
  impersonation?: ImpersonationContext | null;
  requestId: string;
}

export interface ImpersonationContext {
  impersonatorId: string;
  impersonatorEmail: string;
  impersonatedAt: Date;
}

/**
 * CloudEvents 1.0.2 format
 * @see https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
 */
export interface CloudEvent {
  specversion: '1.0.2';
  type: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: 'application/json';
  data: CloudEventData;
}

export interface CloudEventData {
  actor: {
    type: 'User' | 'System';
    id?: string;
    name?: string;
    email?: string;
    impersonation?: ImpersonationContext | null;
  };
  object: {
    type: string;
    id?: string;
    [key: string]: unknown;
  };
  target?: {
    type: string;
    id?: string;
    [key: string]: unknown;
  } | null;
  audit: {
    http: {
      method: string;
      path: string;
      statusCode: number;
      duration: number;
    };
    ip: string;
    userAgent: string;
    requestId: string;
  };
}

/**
 * WAL entry format (JSONL)
 */
export interface WALEntry {
  timestamp: string;
  eventData: EventData;
  retries: number;
}
```

**Checklist:**
- [ ] Create types file
- [ ] Add JSDoc comments with CloudEvents spec link
- [ ] Export all interfaces
- [ ] Validate against EventType model

---

## Phase 2: EventType Cache Service

### Status: ⏳ TODO

### Files to Create

#### 2.1 EventType Cache (`src/services/event-type-cache.service.ts`)

**Purpose:** In-memory O(1) lookup for HTTP endpoint → EventType mapping

**Key Features:**
- Map keyed by `"METHOD:PATH"` (e.g., `"POST:/api/v1/auth/login"`)
- Initialize on app startup
- Refresh after EventType CRUD operations
- Singleton pattern

**Implementation Checklist:**
- [ ] Create EventTypeCacheService class
- [ ] `private cache: Map<string, EventType>`
- [ ] `async initialize()` - Load all EventTypes from DB
- [ ] `getEventType(method: string, path: string)` - O(1) lookup
- [ ] `async refresh()` - Reload cache
- [ ] `private buildCacheKey(method, path)` - Generate key
- [ ] Export singleton instance
- [ ] Add logger.debug statements
- [ ] Handle empty cache gracefully

**Cache Key Format:**
```typescript
private buildCacheKey(method: string, path: string): string {
  return `${method.toUpperCase()}:${path}`;
}
// Example: "POST:/api/v1/auth/login"
```

**Unit Tests to Write (8 tests):**
- [ ] Initialize cache from database
- [ ] Initialize with empty database (no crash)
- [ ] Get event type by exact match
- [ ] Get event type returns null for unknown endpoint
- [ ] Refresh updates cache with new event types
- [ ] Refresh removes deleted event types
- [ ] Cache key is case-insensitive for method
- [ ] Singleton pattern enforced

**Success Criteria:**
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Logger statements present
- ✅ Cache initialized on app startup

---

## Phase 3: Event Batch Writer

### Status: ⏳ TODO

### Files to Create

#### 3.1 Event Batch Writer (`src/services/event-batch-writer.service.ts`)

**Purpose:** Batch database writes for performance and atomicity

**Key Features:**
- Buffer array for pending events
- Flush on batch size (100 events) OR interval (50ms)
- Bulk insert with idempotency
- Fallback to individual writes on batch failure
- WAL for crash recovery

**Implementation Checklist:**
- [ ] Create EventBatchWriterService class
- [ ] `private buffer: EventData[]`
- [ ] `private flushTimer: NodeJS.Timeout | null`
- [ ] `enqueue(eventData: EventData)` - Add to buffer
- [ ] `async flush()` - Bulk insert to database
- [ ] Timer-based flush (50ms default)
- [ ] Size-based flush (100 events default)
- [ ] `async fallbackIndividualWrites(batch)` - Retry logic
- [ ] `writeToWAL(eventData)` - Append to WAL file
- [ ] `async shutdown()` - Flush pending events
- [ ] Export singleton instance
- [ ] Add performance metrics logging

**Bulk Insert Logic:**
```typescript
async flush(): Promise<void> {
  if (this.buffer.length === 0) return;

  const batch = this.buffer.splice(0, this.buffer.length);
  clearTimeout(this.flushTimer);

  const events = batch.map(data => ({
    id: uuidv4(), // Idempotency key
    environmentId: data.context.envId,
    verb: data.eventType.verb,
    actorType: data.context.userId ? 'User' : 'System',
    actor: buildActor(data.context),
    object: buildObject(data.request),
    target: buildTarget(data.request),
    audit: buildAudit(data.request, data.response),
    description: buildDescription(data),
    timestamp: new Date(),
    organizationId: data.context.orgId,
    organizationName: data.context.orgName,
    environmentName: data.context.envName,
    isWebhookEvent: data.eventType.isWebhookEvent,
  }));

  await Event.bulkCreate(events, { validate: true });
}
```

**Unit Tests to Write (12 tests):**
- [ ] Enqueue event to buffer
- [ ] Flush on batch size reached (100 events)
- [ ] Flush on timer interval (50ms)
- [ ] Bulk insert creates all events
- [ ] Batch failure triggers individual writes
- [ ] Individual write failure writes to WAL
- [ ] WAL creates file if not exists
- [ ] WAL appends JSONL format
- [ ] Shutdown flushes pending events
- [ ] Idempotency prevents duplicate events
- [ ] Timer cleared after flush
- [ ] Empty buffer does not trigger database call

**Success Criteria:**
- ✅ All tests passing
- ✅ WAL file created in data/ directory
- ✅ Batching reduces DB queries
- ✅ Graceful shutdown flushes buffer

---

## Phase 4: Event Processor (EventEmitter)

### Status: ⏳ TODO

### Files to Create

#### 4.1 Event Processor (`src/services/event-processor.service.ts`)

**Purpose:** Orchestrate parallel event processing (database + message queue)

**Key Features:**
- Extends EventEmitter
- Listen for 'api-request' events
- Process with `setImmediate()` (non-blocking)
- Stream A: Enqueue to EventBatchWriter
- Stream B: Publish to message queue (webhook events only)
- CloudEvents 1.0.2 formatting

**Implementation Checklist:**
- [ ] Create EventProcessorService class (extends EventEmitter)
- [ ] Constructor registers 'api-request' listener
- [ ] `private processEvent(eventData)` with setImmediate
- [ ] `private toCloudEvent(eventData)` - Transform to CloudEvents
- [ ] Publish to message queue with error handling
- [ ] `private writeToEmergencyBuffer(eventData)` - Fallback
- [ ] `async shutdown()` - Flush batch writer + close queue
- [ ] Export singleton instance
- [ ] Add structured logging

**CloudEvents Transformation:**
```typescript
private toCloudEvent(eventData: EventData): CloudEvent {
  return {
    specversion: '1.0.2',
    type: `com.enterprise.${eventData.eventType.verb}`,
    source: `/orgs/${eventData.context.orgId}/envs/${eventData.context.envId}`,
    id: uuidv4(),
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data: {
      actor: buildCloudEventActor(eventData.context),
      object: buildObject(eventData.request),
      target: buildTarget(eventData.request),
      audit: buildAudit(eventData.request, eventData.response),
    },
  };
}
```

**Unit Tests to Write (10 tests):**
- [ ] Process event emits to batch writer
- [ ] Process webhook event publishes to queue
- [ ] Process non-webhook event skips queue
- [ ] CloudEvents format matches spec 1.0.2
- [ ] CloudEvents type format: `com.enterprise.{verb}`
- [ ] CloudEvents source format: `/orgs/{orgId}/envs/{envId}`
- [ ] setImmediate used for async processing
- [ ] Queue publish failure writes to emergency buffer
- [ ] Shutdown flushes batch writer
- [ ] Shutdown closes message queue

**Success Criteria:**
- ✅ All tests passing
- ✅ Non-blocking (setImmediate)
- ✅ CloudEvents spec compliance
- ✅ Error handling with fallback

---

## Phase 5: Audit Logger Middleware

### Status: ⏳ TODO

### Files to Create

#### 5.1 Audit Logger Middleware (`src/middleware/audit-logger.middleware.ts`)

**Purpose:** Capture HTTP request/response after client receives response

**Key Features:**
- Register `res.on('finish')` listener
- Capture request snapshot (method, path, body, headers, IP, user agent)
- Lookup EventType from cache (O(1))
- Emit event to EventProcessor (non-blocking)
- Extract context from `req.user`, `req.orgId`, `req.envId`

**Implementation Checklist:**
- [ ] Export `auditLoggerMiddleware` function
- [ ] Capture request snapshot before handler
- [ ] Register `res.on('finish')` listener
- [ ] Calculate duration from start time
- [ ] Lookup EventType from cache
- [ ] Skip if no EventType configured for endpoint
- [ ] Emit 'api-request' event to processor
- [ ] Extract context from req object
- [ ] Handle missing context gracefully
- [ ] Add JSDoc comments

**Middleware Implementation:**
```typescript
export const auditLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  const requestSnapshot = {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent') || 'unknown',
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const eventType = eventTypeCacheService.getEventType(req.method, req.path);
    if (!eventType) return; // No event type configured

    eventProcessorService.emit('api-request', {
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
        orgName: req.orgName,
        envName: req.envName,
        impersonation: req.impersonation,
        requestId: req.id,
      },
    });
  });

  next();
};
```

**Unit Tests to Write (6 tests):**
- [ ] Middleware calls next() without blocking
- [ ] res.on('finish') listener registered
- [ ] Event emitted after response sent
- [ ] EventType lookup from cache
- [ ] Skip event if no EventType configured
- [ ] Context extracted from req object

**Success Criteria:**
- ✅ All tests passing
- ✅ Non-blocking (calls next immediately)
- ✅ Events captured after response
- ✅ Graceful handling of missing context

---

## Phase 6: App Integration

### Status: ⏳ TODO

### Files to Modify

#### 6.1 Update app.ts

**Changes Required:**
1. Import audit logger middleware
2. Add middleware AFTER auth middleware (before routes)
3. Initialize EventTypeCache on startup

**Middleware Order:**
```typescript
app.use(requestIdMiddleware);       // 1. Generate request ID
app.use(authMiddleware);            // 2. Authenticate user
app.use(auditLoggerMiddleware);     // 3. Register event listener ← NEW
app.use('/api/v1', routes);         // 4. Route handlers
// Response sent to client
// res.on('finish') → event emitted
```

**Initialization:**
```typescript
async function createApp(): Promise<Application> {
  const app = express();

  // ... existing middleware ...

  // Initialize EventTypeCache
  await eventTypeCacheService.initialize();
  logger.info('EventTypeCache initialized');

  // ... rest of app setup ...
}
```

**Checklist:**
- [ ] Import auditLoggerMiddleware
- [ ] Add middleware after auth
- [ ] Initialize EventTypeCache
- [ ] Add logger statement
- [ ] Update comments

---

#### 6.2 Update server.ts

**Changes Required:**
1. Update graceful shutdown to flush EventProcessor
2. Add timeout for pending event flush

**Graceful Shutdown Enhancement:**
```typescript
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err });
      process.exit(1);
    }

    logger.info('Server closed. Flushing pending events...');

    try {
      // Flush pending events
      await eventProcessorService.shutdown();
      logger.info('Event processor flushed');

      // Close database connections
      await sequelize.close();
      logger.info('Database connections closed');

      // Close adapter connections
      await getAdapterFactory().cleanup();
      logger.info('Adapters cleaned up');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during cleanup', { error });
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000);
}
```

**Checklist:**
- [ ] Import eventProcessorService
- [ ] Call shutdown in graceful shutdown handler
- [ ] Add logging
- [ ] Ensure 30-second timeout
- [ ] Add adapter cleanup

---

## Phase 7: Adapter Factory Updates

### Status: ⏳ TODO

### Files to Modify

#### 7.1 Update adapter.factory.ts

**Changes Required:**
1. Ensure message queue adapter is initialized
2. Verify cleanup on shutdown

**Checklist:**
- [ ] Verify getMessageQueueAdapter() works
- [ ] Test message queue initialization
- [ ] Verify cleanup() closes queue connections
- [ ] No code changes needed (already implemented)

---

## Phase 8: Helper Utilities

### Status: ⏳ TODO

### Files to Create

#### 8.1 Event Helpers (`src/utils/event.helpers.ts`)

**Purpose:** Reusable functions for building Event JSONB fields

**Functions to Implement:**

```typescript
/**
 * Build actor JSONB field
 */
export function buildActor(context: EventContext): Record<string, unknown> {
  if (!context.userId) {
    return {
      type: 'System',
      id: null,
      name: 'System',
      email: null,
      impersonation: null,
    };
  }

  return {
    type: 'User',
    id: context.userId,
    name: context.userName,
    email: context.userEmail,
    impersonation: context.impersonation ? {
      impersonatorId: context.impersonation.impersonatorId,
      impersonatorEmail: context.impersonation.impersonatorEmail,
      impersonatedAt: context.impersonation.impersonatedAt,
    } : null,
  };
}

/**
 * Build object JSONB field (primary resource)
 */
export function buildObject(request: RequestSnapshot): Record<string, unknown> {
  // Extract from request body or params
  const body = request.body as Record<string, unknown>;
  const params = request.params;

  return {
    type: inferResourceType(request.path),
    id: params.id || params.userId || params.deviceId || null,
    ...body,
  };
}

/**
 * Build target JSONB field (secondary resource)
 */
export function buildTarget(request: RequestSnapshot): Record<string, unknown> | null {
  // Optional: Extract secondary resource (e.g., group when adding member)
  return null;
}

/**
 * Build audit JSONB field (HTTP metadata)
 */
export function buildAudit(
  request: RequestSnapshot,
  response: ResponseSnapshot
): Record<string, unknown> {
  return {
    http: {
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      duration: response.duration,
    },
    ip: request.ip,
    userAgent: request.userAgent,
    requestId: request.headers['x-request-id'],
  };
}

/**
 * Build description text
 */
export function buildDescription(eventData: EventData): string {
  const { verb } = eventData.eventType;
  const { actorType } = eventData.context;

  // Generate human-readable description
  return `${actorType} performed ${verb}`;
}

/**
 * Infer resource type from path
 */
function inferResourceType(path: string): string {
  // Parse path to extract resource type
  // Example: /api/v1/orgs/{orgId}/users/{userId} → User
  const segments = path.split('/');
  const resourceSegment = segments[segments.length - 2];

  return resourceSegment.charAt(0).toUpperCase() + resourceSegment.slice(1, -1);
}
```

**Checklist:**
- [ ] Implement buildActor()
- [ ] Implement buildObject()
- [ ] Implement buildTarget()
- [ ] Implement buildAudit()
- [ ] Implement buildDescription()
- [ ] Add JSDoc comments
- [ ] Export all functions
- [ ] Handle null/undefined gracefully

**Unit Tests to Write (8 tests):**
- [ ] buildActor() for User
- [ ] buildActor() for System
- [ ] buildActor() with impersonation
- [ ] buildObject() extracts resource
- [ ] buildAudit() formats HTTP metadata
- [ ] buildDescription() generates text
- [ ] inferResourceType() parses path
- [ ] Handle missing context gracefully

---

#### 8.2 CloudEvents Constants (`src/constants/cloudevents.constants.ts`)

**Purpose:** Constants for CloudEvents spec compliance

**Contents:**
```typescript
/**
 * CloudEvents 1.0.2 Constants
 * @see https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
 */

export const CLOUDEVENTS_SPEC_VERSION = '1.0.2';

export const CLOUDEVENTS_TYPE_PREFIX = 'com.enterprise';

export const CLOUDEVENTS_CONTENT_TYPE = 'application/json';

/**
 * Required CloudEvents attributes
 */
export const CLOUDEVENTS_REQUIRED_ATTRIBUTES = [
  'specversion',
  'type',
  'source',
  'id',
] as const;

/**
 * Optional CloudEvents attributes
 */
export const CLOUDEVENTS_OPTIONAL_ATTRIBUTES = [
  'time',
  'datacontenttype',
  'dataschema',
  'subject',
  'data',
] as const;
```

**Checklist:**
- [ ] Create constants file
- [ ] Add spec version
- [ ] Add type prefix
- [ ] Add content type
- [ ] Add required/optional attributes
- [ ] Add JSDoc with spec link

---

## Phase 9: Testing & Validation

### Status: ⏳ TODO

### Integration Tests to Write (10 tests)

**Test File:** `src/__tests__/integration/event-logging.test.ts`

**Test Scenarios:**
- [ ] End-to-end: API request → Event created in database
- [ ] EventType cache initialized on startup
- [ ] EventType cache lookup returns correct event type
- [ ] Event batch writer flushes on size limit
- [ ] Event batch writer flushes on time interval
- [ ] Webhook event publishes to message queue
- [ ] Non-webhook event skips message queue
- [ ] Graceful shutdown flushes pending events
- [ ] WAL recovery on app restart
- [ ] CloudEvents format validation

**Load Testing (Manual):**
- [ ] 1,000 requests/sec sustained load
- [ ] Verify batching reduces DB queries
- [ ] Verify <200ms response latency
- [ ] Monitor memory usage (buffer size)

**Checklist:**
- [ ] Create integration test file
- [ ] Write all test scenarios
- [ ] Run with `npm test`
- [ ] Verify all tests passing
- [ ] Manual load test
- [ ] Document performance metrics

---

## Additional Files

### Files to Update

#### .gitignore
Add WAL file to ignore:
```
# Event Logging WAL
data/event-wal.jsonl
```

**Checklist:**
- [ ] Add data/event-wal.jsonl to .gitignore
- [ ] Ensure data/ directory exists

---

#### .env.example
Add event logging environment variables:
```bash
# Event Logging Configuration
EVENT_BATCH_SIZE=100
EVENT_FLUSH_INTERVAL_MS=50
EVENT_ENABLE_WAL=true
EVENT_WAL_PATH=./data/event-wal.jsonl
EVENT_MAX_BUFFER_SIZE=10485760
ENABLE_EVENT_CAPTURE=true
```

**Checklist:**
- [ ] Add event logging variables
- [ ] Document defaults
- [ ] Update README if needed

---

## Testing Checklist

### Unit Tests
- [ ] EventTypeCache (8 tests)
- [ ] EventBatchWriter (12 tests)
- [ ] EventProcessor (10 tests)
- [ ] AuditLogger Middleware (6 tests)
- [ ] Event Helpers (8 tests)

**Total Unit Tests:** 44

### Integration Tests
- [ ] Event Logging End-to-End (10 tests)

**Total Integration Tests:** 10

### Manual Testing
- [ ] Load test (1,000 req/sec)
- [ ] Graceful shutdown
- [ ] WAL recovery
- [ ] Memory leak check

---

## Success Criteria

### Phase 1-2 Complete When:
- ✅ Config file created with all settings
- ✅ Types file created with all interfaces
- ✅ EventTypeCache service implemented
- ✅ 8/8 cache tests passing
- ✅ No TypeScript errors
- ✅ Cache initialized on app startup

### Phase 3-4 Complete When:
- ✅ EventBatchWriter service implemented
- ✅ EventProcessor service implemented
- ✅ 22/22 tests passing (12 batch + 10 processor)
- ✅ WAL file created
- ✅ CloudEvents format validated

### Phase 5-6 Complete When:
- ✅ Audit logger middleware implemented
- ✅ Middleware integrated into app.ts
- ✅ Graceful shutdown updated
- ✅ 6/6 middleware tests passing
- ✅ Events captured after response

### Phase 7-8 Complete When:
- ✅ Helper utilities implemented
- ✅ CloudEvents constants created
- ✅ 8/8 helper tests passing
- ✅ Adapter factory verified

### Phase 9 Complete When:
- ✅ 10/10 integration tests passing
- ✅ Load test successful (1,000 req/sec)
- ✅ <200ms response latency verified
- ✅ Graceful shutdown flushes events
- ✅ WAL recovery tested

### Overall Project Complete When:
- ✅ All 54 tests passing (44 unit + 10 integration)
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Performance benchmarks met
- ✅ Documentation updated
- ✅ Code reviewed and committed

---

## Architecture Decisions

### Decision 1: EventEmitter vs Worker Threads
**Date:** 2025-10-08
**Decision:** Use EventEmitter with `setImmediate()`
**Rationale:**
- Simpler architecture
- Sufficient for <10k req/sec
- Easier debugging and testing
- No IPC overhead

### Decision 2: Batch Size (100 events)
**Date:** 2025-10-08
**Decision:** Default batch size of 100 events
**Rationale:**
- Balance between latency and throughput
- Reduces DB queries by 100x
- Fits within single transaction

### Decision 3: Flush Interval (50ms)
**Date:** 2025-10-08
**Decision:** Default flush interval of 50ms
**Rationale:**
- Ensures events flushed within 100ms worst-case
- Prevents buffer overflow
- Balances DB load

### Decision 4: WAL as JSONL File
**Date:** 2025-10-08
**Decision:** Use JSONL file for Write-Ahead Log
**Rationale:**
- Simple, crash-resistant
- Easy to replay on recovery
- No external dependencies

### Decision 5: In-Memory EventType Cache
**Date:** 2025-10-08
**Decision:** Load all EventTypes into memory on startup
**Rationale:**
- Eliminates 1 DB query per request
- Critical for <200ms SLO
- Low memory footprint (~10KB for 100 event types)

---

## Performance Metrics

### Target Metrics
- **Response Latency:** <200ms (user-facing)
- **Event Capture Overhead:** <5ms (non-blocking)
- **Batch Write Latency:** <100ms (asynchronous)
- **EventType Lookup:** <1ms (O(1) cache)
- **Memory Usage:** <10MB (buffer + cache)

### Actual Metrics (To Be Measured)
- **Response Latency:** TBD
- **Event Capture Overhead:** TBD
- **Batch Write Latency:** TBD
- **EventType Lookup:** TBD
- **Memory Usage:** TBD

---

## Known Issues & Risks

### Risk 1: Buffer Overflow
**Likelihood:** Low
**Impact:** High (event loss)
**Mitigation:**
- Max buffer size limit (10MB)
- Circuit breaker pattern
- Backpressure to EventEmitter

### Risk 2: WAL File Growth
**Likelihood:** Medium
**Impact:** Medium (disk space)
**Mitigation:**
- Rotate WAL files daily
- Monitor file size
- Alert on continuous growth

### Risk 3: Message Queue Unavailable
**Likelihood:** Low
**Impact:** Medium (webhook delays)
**Mitigation:**
- Retry with exponential backoff
- Dead-letter queue
- Alert on failures

---

## Related Documentation

- **Architecture Design:** `api/docs/EVENT_LOGGING_ARCHITECTURE.md`
- **Event Model:** `api/src/models/Event.model.ts`
- **EventType Model:** `api/src/models/EventType.model.ts`
- **Service Standards:** `api/src/services/STANDARDS.md`
- **Middleware Standards:** `api/src/middleware/STANDARDS.md`
- **Adapter Pattern:** `api/docs/ADAPTER_PATTERN.md`
- **CloudEvents Spec:** https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md

---

## Timeline Estimate

- **Phase 1-2:** 1-2 hours (config + cache)
- **Phase 3-4:** 2-3 hours (batch writer + processor)
- **Phase 5-6:** 1-2 hours (middleware + integration)
- **Phase 7-8:** 1 hour (helpers + constants)
- **Phase 9:** 2-3 hours (testing + validation)

**Total Estimated Time:** 7-11 hours

---

Last Updated: 2025-10-08
