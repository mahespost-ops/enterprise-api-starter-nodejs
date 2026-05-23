/**
 * Adapter Configuration
 *
 * Defines configuration types and provider selection for all adapters.
 */

export type EmailProvider = 'sendgrid' | 'ses' | 'smtp' | 'mock';
export type SecretsProvider = 'gcp' | 'aws' | 'env' | 'file' | 'memory' | 'vault';
export type StorageProvider = 'gcs' | 's3' | 'local';
export type MessageQueueProvider = 'pubsub' | 'sqs' | 'redis' | 'kafka' | 'memory';

export interface IAdapterConfig {
  email: IEmailAdapterConfig;
  secrets: ISecretsAdapterConfig;
  storage: IStorageAdapterConfig;
  messageQueue: IMessageQueueAdapterConfig;
}

// Email Adapter Configuration

export interface IEmailAdapterConfig {
  provider: EmailProvider;
  defaultFrom?: string;
  sendgrid?: ISendGridConfig;
  ses?: ISESConfig;
  smtp?: ISMTPConfig;
}

export interface ISendGridConfig {
  apiKey: string;
  sandbox?: boolean;
}

export interface ISESConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  configurationSet?: string;
}

export interface ISMTPConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  defaultFrom?: string;
}

// Secrets Adapter Configuration

export interface ISecretsAdapterConfig {
  provider: SecretsProvider;
  gcp?: IGCPSecretsConfig;
  aws?: IAWSSecretsConfig;
  file?: IFileSecretsConfig;
}

export interface IGCPSecretsConfig {
  projectId: string;
  keyFilename?: string;
}

export interface IAWSSecretsConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface IFileSecretsConfig {
  secretsDir: string;
}

// Storage Adapter Configuration

export interface IStorageAdapterConfig {
  provider: StorageProvider;
  defaultBucket?: string;
  gcs?: IGCSConfig;
  s3?: IS3Config;
  local?: ILocalStorageConfig;
}

export interface IGCSConfig {
  projectId: string;
  bucketName: string;
  keyFilename?: string;
}

export interface IS3Config {
  region: string;
  bucketName: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface ILocalStorageConfig {
  basePath: string;
  publicUrl?: string;
}

// Extended storage adapter configs (used by adapters directly)

export interface IGoogleCloudStorageConfig {
  projectId: string;
  bucketName: string;
  keyFilename?: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
}

export interface IAWSS3Config {
  region: string;
  bucketName: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  endpoint?: string;
}

// Message Queue Adapter Configuration

export interface IMessageQueueAdapterConfig {
  provider: MessageQueueProvider;
  pubsub?: IPubSubConfig;
  sqs?: ISQSConfig;
  redis?: IRedisConfig;
  kafka?: IKafkaConfig;
}

export interface IPubSubConfig {
  projectId: string;
  keyFilename?: string;
}

export interface ISQSConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  queueUrlPrefix?: string;
}

export interface IRedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  keyPrefix?: string;
}

export interface IKafkaConfig {
  brokers: string[];
  clientId?: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  connectionTimeout?: number;
  requestTimeout?: number;
}

/**
 * Load adapter configuration from environment variables
 */
export function loadAdapterConfig(): IAdapterConfig {
  return {
    email: {
      provider: (process.env.EMAIL_PROVIDER as EmailProvider) || 'mock',
      defaultFrom: process.env.EMAIL_DEFAULT_FROM || process.env.EMAIL_FROM,
      sendgrid: process.env.SENDGRID_API_KEY
        ? {
            apiKey: process.env.SENDGRID_API_KEY,
            sandbox: process.env.SENDGRID_SANDBOX === 'true',
          }
        : undefined,
      ses: process.env.AWS_REGION
        ? {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            configurationSet: process.env.SES_CONFIGURATION_SET,
          }
        : undefined,
      smtp: process.env.SMTP_HOST
        ? {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || '',
            },
            defaultFrom: process.env.EMAIL_FROM,
          }
        : undefined,
    },
    secrets: {
      provider: (process.env.SECRETS_PROVIDER as SecretsProvider) || 'file',
      gcp: process.env.GCP_PROJECT_ID
        ? {
            projectId: process.env.GCP_PROJECT_ID,
            keyFilename: process.env.GCP_KEY_FILE,
          }
        : undefined,
      aws: process.env.AWS_REGION
        ? {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
      file: {
        secretsDir: process.env.SECRETS_DIR || 'secrets',
      },
    },
    storage: {
      provider: (process.env.STORAGE_PROVIDER as StorageProvider) || 'local',
      defaultBucket: process.env.STORAGE_DEFAULT_BUCKET,
      gcs: process.env.GCS_BUCKET_NAME
        ? {
            projectId: process.env.GCP_PROJECT_ID!,
            bucketName: process.env.GCS_BUCKET_NAME,
            keyFilename: process.env.GCP_KEY_FILE,
          }
        : undefined,
      s3: process.env.S3_BUCKET_NAME
        ? {
            region: process.env.AWS_REGION!,
            bucketName: process.env.S3_BUCKET_NAME,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
      local: {
        basePath: process.env.LOCAL_STORAGE_PATH || './storage',
        publicUrl: process.env.LOCAL_STORAGE_URL,
      },
    },
    messageQueue: {
      provider: (process.env.QUEUE_PROVIDER as MessageQueueProvider) || 'memory',
      pubsub: process.env.GCP_PROJECT_ID
        ? {
            projectId: process.env.GCP_PROJECT_ID,
            keyFilename: process.env.GCP_KEY_FILE,
          }
        : undefined,
      sqs: process.env.AWS_REGION
        ? {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            queueUrlPrefix: process.env.SQS_QUEUE_URL_PREFIX,
          }
        : undefined,
      redis: process.env.REDIS_HOST
        ? {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0', 10),
            tls: process.env.REDIS_TLS === 'true',
            keyPrefix: process.env.REDIS_KEY_PREFIX || 'mq:',
          }
        : undefined,
      kafka: process.env.KAFKA_BROKERS
        ? {
            brokers: process.env.KAFKA_BROKERS.split(','),
            clientId: process.env.KAFKA_CLIENT_ID,
            ssl: process.env.KAFKA_SSL === 'true',
            sasl: process.env.KAFKA_SASL_USERNAME
              ? {
                  mechanism: (process.env.KAFKA_SASL_MECHANISM as 'plain' | 'scram-sha-256' | 'scram-sha-512') || 'plain',
                  username: process.env.KAFKA_SASL_USERNAME,
                  password: process.env.KAFKA_SASL_PASSWORD!,
                }
              : undefined,
            connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || '10000', 10),
            requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000', 10),
          }
        : undefined,
    },
  };
}
