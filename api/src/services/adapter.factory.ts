/**
 * Adapter Factory
 *
 * Central factory for creating and managing adapter instances.
 * Implements singleton pattern to ensure only one instance of each adapter type.
 */

import type { IEmailAdapter } from './email/email.interface';
import type { ISecretsAdapter } from './secrets/secrets.interface';
import type { IStorageAdapter } from './storage/storage.interface';
import type { IMessageQueueAdapter } from './queue/message-queue.interface';
import type { IAdapterConfig } from './config/adapter.config';
import { loadAdapterConfig } from './config/adapter.config';
import { MockEmailAdapter } from './email/mock.email.adapter';
import { EnvSecretsAdapter } from './secrets/env.secrets.adapter';
import { LocalStorageAdapter } from './storage/local.storage.adapter';
import { MemoryQueueAdapter } from './queue/memory.queue.adapter';
import logger from '../config/logger';

export class AdapterFactory {
  private static instance: AdapterFactory;
  private config: IAdapterConfig;
  private emailAdapter?: IEmailAdapter;
  private secretsAdapter?: ISecretsAdapter;
  private storageAdapter?: IStorageAdapter;
  private messageQueueAdapter?: IMessageQueueAdapter;
  private initialized = false;

  constructor(config?: IAdapterConfig) {
    this.config = config || loadAdapterConfig();
  }

  /**
   * Get singleton instance of the factory
   */
  public static getInstance(config?: IAdapterConfig): AdapterFactory {
    if (!AdapterFactory.instance) {
      AdapterFactory.instance = new AdapterFactory(config);
    }
    return AdapterFactory.instance;
  }

  /**
   * Initialize all configured adapters
   * Should be called at application startup
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('AdapterFactory already initialized');
      return;
    }

    logger.info('Initializing adapters...', {
      email: this.config.email.provider,
      secrets: this.config.secrets.provider,
      storage: this.config.storage.provider,
      messageQueue: this.config.messageQueue.provider,
    });

    // Initialize adapters lazily - they'll be created on first access
    this.initialized = true;

    logger.info('Adapter factory initialized');
  }

  /**
   * Get email adapter instance
   */
  public getEmailAdapter(): IEmailAdapter {
    if (!this.emailAdapter) {
      this.emailAdapter = this.createEmailAdapter();
    }
    return this.emailAdapter;
  }

  /**
   * Get secrets adapter instance
   */
  public getSecretsAdapter(): ISecretsAdapter {
    if (!this.secretsAdapter) {
      this.secretsAdapter = this.createSecretsAdapter();
    }
    return this.secretsAdapter;
  }

  /**
   * Get storage adapter instance
   */
  public getStorageAdapter(): IStorageAdapter {
    if (!this.storageAdapter) {
      this.storageAdapter = this.createStorageAdapter();
    }
    return this.storageAdapter;
  }

  /**
   * Get message queue adapter instance
   */
  public getMessageQueueAdapter(): IMessageQueueAdapter {
    if (!this.messageQueueAdapter) {
      this.messageQueueAdapter = this.createMessageQueueAdapter();
    }
    return this.messageQueueAdapter;
  }

  /**
   * Cleanup all adapters
   * Should be called on application shutdown
   */
  public async cleanup(): Promise<void> {
    logger.info('Cleaning up adapters...');

    const cleanupPromises: Promise<void>[] = [];

    if (this.emailAdapter) {
      cleanupPromises.push(this.emailAdapter.cleanup());
    }
    if (this.secretsAdapter) {
      cleanupPromises.push(this.secretsAdapter.cleanup());
    }
    if (this.storageAdapter) {
      cleanupPromises.push(this.storageAdapter.cleanup());
    }
    if (this.messageQueueAdapter) {
      cleanupPromises.push(this.messageQueueAdapter.cleanup());
    }

    await Promise.all(cleanupPromises);

    this.emailAdapter = undefined;
    this.secretsAdapter = undefined;
    this.storageAdapter = undefined;
    this.messageQueueAdapter = undefined;
    this.initialized = false;

    logger.info('All adapters cleaned up');
  }

  // Private factory methods

  private createEmailAdapter(): IEmailAdapter {
    const provider = this.config.email.provider;
    logger.info(`Creating email adapter: ${provider}`);

    switch (provider) {
      case 'sendgrid':
        // TODO: Implement SendGridAdapter
        throw new Error('SendGrid adapter not yet implemented');
      case 'ses':
        // TODO: Implement SESAdapter
        throw new Error('SES adapter not yet implemented');
      case 'mock':
        return new MockEmailAdapter();
      default:
        throw new Error(`Unknown email provider: ${provider}`);
    }
  }

  private createSecretsAdapter(): ISecretsAdapter {
    const provider = this.config.secrets.provider;
    logger.info(`Creating secrets adapter: ${provider}`);

    switch (provider) {
      case 'gcp':
        // TODO: Implement GCPSecretsAdapter
        throw new Error('GCP Secrets Manager adapter not yet implemented');
      case 'aws':
        // TODO: Implement AWSSecretsAdapter
        throw new Error('AWS Secrets Manager adapter not yet implemented');
      case 'env':
        return new EnvSecretsAdapter();
      default:
        throw new Error(`Unknown secrets provider: ${provider}`);
    }
  }

  private createStorageAdapter(): IStorageAdapter {
    const provider = this.config.storage.provider;
    logger.info(`Creating storage adapter: ${provider}`);

    switch (provider) {
      case 'gcs':
        // TODO: Implement GCSAdapter
        throw new Error('Google Cloud Storage adapter not yet implemented');
      case 's3':
        // TODO: Implement S3Adapter
        throw new Error('AWS S3 adapter not yet implemented');
      case 'local':
        if (!this.config.storage.local) {
          throw new Error('Local storage configuration is missing');
        }
        return new LocalStorageAdapter(this.config.storage.local);
      default:
        throw new Error(`Unknown storage provider: ${provider}`);
    }
  }

  private createMessageQueueAdapter(): IMessageQueueAdapter {
    const provider = this.config.messageQueue.provider;
    logger.info(`Creating message queue adapter: ${provider}`);

    switch (provider) {
      case 'pubsub':
        // TODO: Implement PubSubAdapter
        throw new Error('GCP Pub/Sub adapter not yet implemented');
      case 'sqs':
        // TODO: Implement SQSAdapter
        throw new Error('AWS SQS adapter not yet implemented');
      case 'redis':
        // TODO: Implement RedisAdapter
        throw new Error('Redis adapter not yet implemented');
      case 'kafka':
        // TODO: Implement KafkaAdapter
        throw new Error('Kafka adapter not yet implemented');
      case 'memory':
        return new MemoryQueueAdapter();
      default:
        throw new Error(`Unknown message queue provider: ${provider}`);
    }
  }
}

// Export singleton instance getter
export const getAdapterFactory = AdapterFactory.getInstance;
