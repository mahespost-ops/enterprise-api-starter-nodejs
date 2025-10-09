# Adapter Usage Guide

## Overview

This guide demonstrates how to use the adapter pattern infrastructure in the application. Adapters provide a consistent interface for external services, making the codebase portable across cloud providers.

## Quick Start

### 1. Configuration

Set environment variables to configure which providers to use:

```bash
# .env file
EMAIL_PROVIDER=mock
SECRETS_PROVIDER=env
STORAGE_PROVIDER=local
QUEUE_PROVIDER=memory

# Storage configuration
LOCAL_STORAGE_PATH=./storage
LOCAL_STORAGE_URL=http://localhost:3000/files

# Secrets prefix (for env provider)
SECRET_database_url=postgresql://localhost:5432/mydb
SECRET_api_key=my-secret-key
```

### 2. Initialize Factory at Application Startup

```typescript
// src/server.ts or src/app.ts
import { getAdapterFactory } from './services/adapter.factory';

async function initializeApp() {
  // Get factory instance
  const factory = getAdapterFactory();

  // Initialize all adapters
  await factory.initialize();

  // Start your application
  // ...
}
```

### 3. Use Adapters in Services

#### Email Service Example

```typescript
// src/services/notification.service.ts
import { getAdapterFactory } from './adapter.factory';

export class NotificationService {
  private emailAdapter;

  constructor() {
    const factory = getAdapterFactory();
    this.emailAdapter = factory.getEmailAdapter();
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    await this.emailAdapter.sendEmail({
      to: userEmail,
      subject: 'Welcome to Our Platform',
      body: `Hello ${userName}, welcome!`,
      html: `<h1>Hello ${userName}</h1><p>Welcome to our platform!</p>`,
    });
  }

  async sendBulkNotifications(users: Array<{email: string; name: string}>): Promise<void> {
    const result = await this.emailAdapter.sendBulkEmail({
      emails: users.map(user => ({
        to: user.email,
        subject: 'Important Update',
        body: `Hello ${user.name}, we have an important update.`,
      })),
      batchSize: 10,
    });

    console.log(`Sent ${result.successful} emails, ${result.failed} failed`);
  }
}
```

#### Secrets Service Example

```typescript
// src/services/config.service.ts
import { getAdapterFactory } from './adapter.factory';

export class ConfigService {
  private secretsAdapter;

  constructor() {
    const factory = getAdapterFactory();
    this.secretsAdapter = factory.getSecretsAdapter();
  }

  async getDatabaseUrl(): Promise<string> {
    return await this.secretsAdapter.getSecret('database-url');
  }

  async getApiKey(serviceName: string): Promise<string> {
    return await this.secretsAdapter.getSecret(`${serviceName}-api-key`);
  }

  async storeSecret(name: string, value: string): Promise<void> {
    await this.secretsAdapter.setSecret({
      name,
      value,
      labels: {
        environment: process.env.NODE_ENV || 'development',
        createdBy: 'config-service',
      },
    });
  }
}
```

#### Storage Service Example

```typescript
// src/services/file.service.ts
import { getAdapterFactory } from './adapter.factory';

export class FileService {
  private storageAdapter;

  constructor() {
    const factory = getAdapterFactory();
    this.storageAdapter = factory.getStorageAdapter();
  }

  async uploadUserAvatar(userId: string, fileData: Buffer): Promise<string> {
    const result = await this.storageAdapter.uploadFile({
      key: `avatars/${userId}.jpg`,
      data: fileData,
      contentType: 'image/jpeg',
      metadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
      cacheControl: 'public, max-age=31536000',
    });

    return result.url;
  }

  async getTemporaryDownloadUrl(key: string): Promise<string> {
    return await this.storageAdapter.getSignedUrl({
      key,
      expirationSeconds: 3600, // 1 hour
      action: 'read',
    });
  }

  async listUserFiles(userId: string): Promise<any[]> {
    const result = await this.storageAdapter.listFiles({
      prefix: `users/${userId}/`,
      maxResults: 100,
    });

    return result.items;
  }
}
```

#### Message Queue Service Example

```typescript
// src/services/queue.service.ts
import { getAdapterFactory } from './adapter.factory';

export class EventService {
  private queueAdapter;

  constructor() {
    const factory = getAdapterFactory();
    this.queueAdapter = factory.getMessageQueueAdapter();
  }

  async publishUserCreatedEvent(userId: string, email: string): Promise<void> {
    await this.queueAdapter.publish({
      topic: 'user-events',
      data: {
        eventType: 'user.created',
        userId,
        email,
        timestamp: new Date().toISOString(),
      },
      attributes: {
        eventType: 'user.created',
      },
    });
  }

  async subscribeToUserEvents(): Promise<void> {
    await this.queueAdapter.subscribe({
      topic: 'user-events',
      subscription: 'user-events-processor',
      handler: async (message) => {
        console.log('Processing user event:', message.data);

        // Process the event
        if (message.data.eventType === 'user.created') {
          // Send welcome email, create profile, etc.
        }
      },
      options: {
        maxConcurrency: 5,
        ackDeadlineSeconds: 30,
        autoAck: true,
        retry: {
          maxAttempts: 3,
          backoffMs: 1000,
        },
        deadLetterTopic: 'user-events-dlq',
      },
    });
  }

  async publishBatchEvents(events: any[]): Promise<void> {
    await this.queueAdapter.publishBatch({
      topic: 'analytics-events',
      messages: events.map(event => ({
        data: event,
        attributes: {
          eventType: event.type,
        },
      })),
    });
  }
}
```

## Application Shutdown

Clean up all adapters on application shutdown:

```typescript
// src/server.ts
async function gracefulShutdown() {
  console.log('Shutting down gracefully...');

  const factory = getAdapterFactory();
  await factory.cleanup();

  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

## Switching Providers

To switch between cloud providers, simply change environment variables:

### Development (Local)
```bash
EMAIL_PROVIDER=mock
SECRETS_PROVIDER=env
STORAGE_PROVIDER=local
QUEUE_PROVIDER=memory
```

### Production on GCP
```bash
EMAIL_PROVIDER=sendgrid
SECRETS_PROVIDER=gcp
STORAGE_PROVIDER=gcs
QUEUE_PROVIDER=pubsub

SENDGRID_API_KEY=SG.xxx...
GCP_PROJECT_ID=my-project
GCS_BUCKET_NAME=my-bucket
```

### Production on AWS
```bash
EMAIL_PROVIDER=ses
SECRETS_PROVIDER=aws
STORAGE_PROVIDER=s3
QUEUE_PROVIDER=sqs

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx...
S3_BUCKET_NAME=my-bucket
```

## Testing

Use mock adapters in tests:

```typescript
// tests/services/notification.test.ts
import { AdapterFactory } from '../src/services/adapter.factory';
import { NotificationService } from '../src/services/notification.service';

describe('NotificationService', () => {
  let factory: AdapterFactory;
  let service: NotificationService;

  beforeEach(() => {
    // Create factory with mock configuration
    factory = new AdapterFactory({
      email: {
        provider: 'mock',
      },
      // ... other config
    });

    service = new NotificationService();
  });

  afterEach(async () => {
    await factory.cleanup();
  });

  it('should send welcome email', async () => {
    await service.sendWelcomeEmail('test@example.com', 'Test User');

    // Verify email was sent (using mock adapter test helpers)
    const emailAdapter = factory.getEmailAdapter() as MockEmailAdapter;
    const sentEmails = emailAdapter.getSentEmails();

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].params.to).toBe('test@example.com');
    expect(sentEmails[0].params.subject).toBe('Welcome to Our Platform');
  });
});
```

## Best Practices

1. **Initialize Once**: Create the adapter factory singleton at application startup
2. **Inject Dependencies**: Pass adapters to services via constructor or factory
3. **Handle Errors**: All adapter methods can throw - wrap in try/catch
4. **Use Type Safety**: TypeScript interfaces ensure correct usage
5. **Test with Mocks**: Use mock adapters in unit tests
6. **Monitor Operations**: All adapters log operations for observability
7. **Clean Shutdown**: Always call `cleanup()` on shutdown

## Available Implementations

### Email Adapters
- ✅ `mock` - In-memory (testing/dev)
- ⏳ `sendgrid` - SendGrid API (planned)
- ⏳ `ses` - AWS SES (planned)

### Secrets Adapters
- ✅ `env` - Environment variables (dev)
- ⏳ `gcp` - GCP Secret Manager (planned)
- ⏳ `aws` - AWS Secrets Manager (planned)

### Storage Adapters
- ✅ `local` - Local filesystem (dev)
- ⏳ `gcs` - Google Cloud Storage (planned)
- ⏳ `s3` - AWS S3 (planned)

### Message Queue Adapters
- ✅ `memory` - In-memory (dev/testing)
- ⏳ `pubsub` - GCP Pub/Sub (planned)
- ⏳ `sqs` - AWS SQS (planned)
- ⏳ `redis` - Redis (planned)
- ⏳ `kafka` - Apache Kafka (planned)

## Contributing

When implementing new adapter providers:

1. Implement the interface from `services/<type>/<type>.interface.ts`
2. Add configuration to `services/config/adapter.config.ts`
3. Register in `services/adapter.factory.ts`
4. Add tests
5. Update this documentation
