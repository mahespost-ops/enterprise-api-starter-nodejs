# Adapter Pattern Architecture

## Purpose

The adapter pattern provides a consistent interface for external service integrations while enabling:
- **Portability**: Switch between cloud providers (GCP, AWS, Azure) without changing business logic
- **Configuration Drift Reduction**: Standardized interfaces prevent provider-specific code sprawl
- **Testability**: Mock adapters for unit tests without external dependencies
- **Flexibility**: Add new providers by implementing standard interfaces

## Design Principles

1. **Interface-Driven**: All adapters implement provider-agnostic interfaces
2. **Factory Pattern**: Central factory creates adapters based on configuration
3. **Fail-Fast**: Adapter initialization validates configuration and connectivity
4. **Logging**: All adapter operations log with correlation IDs for tracing
5. **Error Handling**: Adapters throw standardized errors for consistent handling

## Adapter Types

### Email Adapter
**Purpose**: Send transactional emails (notifications, alerts, reports)

**Providers**:
- SendGrid (default for GCP environments)
- AWS SES (for AWS environments)
- Mock (for testing)

**Interface**:
```typescript
interface IEmailAdapter {
  sendEmail(params: SendEmailParams): Promise<EmailResult>;
  sendBulkEmail(params: BulkEmailParams): Promise<BulkEmailResult>;
}
```

### Secrets Adapter
**Purpose**: Secure storage and retrieval of sensitive configuration

**Providers**:
- GCP Secret Manager (default for GCP environments)
- AWS Secrets Manager (for AWS environments)
- Environment Variables (for local development)

**Interface**:
```typescript
interface ISecretsAdapter {
  getSecret(name: string): Promise<string>;
  setSecret(name: string, value: string): Promise<void>;
  deleteSecret(name: string): Promise<void>;
}
```

### Storage Adapter
**Purpose**: Object storage for files, images, documents

**Providers**:
- Google Cloud Storage (default for GCP environments)
- AWS S3 (for AWS environments)
- Local filesystem (for local development)

**Interface**:
```typescript
interface IStorageAdapter {
  uploadFile(params: UploadParams): Promise<UploadResult>;
  downloadFile(params: DownloadParams): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  getSignedUrl(key: string, expiration: number): Promise<string>;
}
```

### Message Queue Adapter
**Purpose**: Asynchronous message processing and event-driven architecture

**Providers**:
- GCP Pub/Sub (default for GCP environments)
- AWS SQS (for AWS environments)
- In-memory queue (for local development)

**Interface**:
```typescript
interface IMessageQueueAdapter {
  publish(topic: string, message: any): Promise<string>;
  subscribe(subscription: string, handler: MessageHandler): Promise<void>;
  acknowledgeMessage(messageId: string): Promise<void>;
}
```

## Configuration

Adapters are configured via environment variables:

```bash
# Adapter provider selection
EMAIL_PROVIDER=sendgrid|ses|mock
SECRETS_PROVIDER=gcp|aws|env
STORAGE_PROVIDER=gcs|s3|local
QUEUE_PROVIDER=pubsub|sqs|memory

# Provider-specific configuration
SENDGRID_API_KEY=...
AWS_REGION=...
GCP_PROJECT_ID=...
```

## Usage Example

```typescript
import { AdapterFactory } from './adapters';

// Initialize factory (done once at app startup)
const factory = new AdapterFactory();

// Get adapters (cached singletons)
const emailAdapter = factory.getEmailAdapter();
const secretsAdapter = factory.getSecretsAdapter();

// Use adapters in services
await emailAdapter.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Hello!',
});

const apiKey = await secretsAdapter.getSecret('api-key');
```

## Testing Strategy

1. **Unit Tests**: Use mock adapters to test business logic in isolation
2. **Integration Tests**: Test real adapter implementations against actual services
3. **Contract Tests**: Ensure all providers implement interfaces correctly

## Standards

- All adapter methods are async and return Promises
- All adapters log operations with correlation IDs
- All adapters validate inputs and throw standardized errors
- All adapters support graceful shutdown via cleanup methods
- Adapter configuration is validated at initialization time
