/**
 * Message Queue Adapter Interface
 *
 * Provides a provider-agnostic interface for asynchronous messaging.
 * Supports pub/sub patterns and message acknowledgment.
 *
 * Supported Providers:
 * - GCP Pub/Sub (cloud-native for GCP)
 * - AWS SQS (cloud-native for AWS)
 * - Redis (lightweight, in-memory)
 * - Kafka (high-throughput streaming)
 * - In-memory (local development/testing)
 */

export type MessageHandler = (message: IMessage) => Promise<void>;

export interface IMessage<T = unknown> {
  id: string;
  data: T;
  attributes?: Record<string, string>;
  timestamp: Date;
  ackId?: string;
}

export interface IPublishParams<T = unknown> {
  topic: string;
  data: T;
  attributes?: Record<string, string>;
  orderingKey?: string; // For Kafka partitioning and Pub/Sub ordering
}

export interface IPublishResult {
  messageId: string;
  topic: string;
  timestamp: Date;
}

export interface ISubscribeParams {
  topic: string;
  subscription: string;
  handler: MessageHandler;
  options?: ISubscriptionOptions;
}

export interface ISubscriptionOptions {
  /**
   * Maximum number of concurrent messages to process
   */
  maxConcurrency?: number;

  /**
   * Message acknowledgment deadline in seconds
   */
  ackDeadlineSeconds?: number;

  /**
   * Auto-acknowledge messages after successful processing
   */
  autoAck?: boolean;

  /**
   * Retry configuration
   */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };

  /**
   * Dead letter queue/topic for failed messages
   */
  deadLetterTopic?: string;
}

export interface IBatchPublishParams<T = unknown> {
  topic: string;
  messages: Array<{
    data: T;
    attributes?: Record<string, string>;
    orderingKey?: string;
  }>;
}

export interface IBatchPublishResult {
  total: number;
  successful: number;
  failed: number;
  messageIds: string[];
}

export interface IMessageQueueAdapter {
  /**
   * Publish a single message to a topic
   */
  publish(params: IPublishParams): Promise<IPublishResult>;

  /**
   * Publish multiple messages in a batch
   */
  publishBatch(params: IBatchPublishParams): Promise<IBatchPublishResult>;

  /**
   * Subscribe to a topic and process messages
   */
  subscribe(params: ISubscribeParams): Promise<void>;

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(subscription: string): Promise<void>;

  /**
   * Acknowledge message processing completion
   */
  acknowledgeMessage(ackId: string): Promise<void>;

  /**
   * Negatively acknowledge a message (requeue for retry)
   */
  nackMessage(ackId: string): Promise<void>;

  /**
   * Create a new topic (if it doesn't exist)
   */
  createTopic(topic: string): Promise<void>;

  /**
   * Delete a topic
   */
  deleteTopic(topic: string): Promise<void>;

  /**
   * Create a subscription to a topic
   */
  createSubscription(topic: string, subscription: string, options?: ISubscriptionOptions): Promise<void>;

  /**
   * Delete a subscription
   */
  deleteSubscription(subscription: string): Promise<void>;

  /**
   * List all topics
   */
  listTopics(): Promise<string[]>;

  /**
   * List all subscriptions for a topic
   */
  listSubscriptions(topic: string): Promise<string[]>;

  /**
   * Validate configuration and connectivity
   */
  validateConfig(): Promise<boolean>;

  /**
   * Cleanup resources and close connections
   */
  cleanup(): Promise<void>;
}
