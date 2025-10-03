/**
 * Redis Message Queue Adapter
 *
 * Uses Redis pub/sub for lightweight message queueing.
 * Suitable for real-time messaging and event-driven architectures.
 */

import Redis from 'ioredis';
import type {
  IMessageQueueAdapter,
  IMessage,
  IPublishParams,
  IPublishResult,
  ISubscribeParams,
  ISubscriptionOptions,
  IBatchPublishParams,
  IBatchPublishResult,
  MessageHandler,
} from './message-queue.interface';
import logger from '../../config/logger';

interface IRedisMessage extends IMessage {
  topic: string;
  retryCount: number;
  orderingKey?: string;
}

export class RedisQueueAdapter implements IMessageQueueAdapter {
  private publisher: Redis;
  private subscriber: Redis;
  private subscriptions: Map<string, { handler: MessageHandler; options?: ISubscriptionOptions }>;
  private messageIdCounter: number;
  private topics: Set<string>;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    this.publisher = new Redis(url, {
      retryStrategy: (times): number => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subscriber = new Redis(url, {
      retryStrategy: (times): number => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subscriptions = new Map();
    this.messageIdCounter = 0;
    this.topics = new Set();

    // Set up event listeners
    this.publisher.on('connect', () => {
      logger.info('Redis publisher connected');
    });

    this.subscriber.on('connect', () => {
      logger.info('Redis subscriber connected');
    });

    this.publisher.on('error', (error) => {
      logger.error('Redis publisher error', { error });
    });

    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error', { error });
    });
  }

  async publish(params: IPublishParams): Promise<IPublishResult> {
    const messageId = this.generateMessageId();
    const timestamp = new Date();

    const message: IRedisMessage = {
      id: messageId,
      data: params.data,
      attributes: params.attributes,
      timestamp,
      topic: params.topic,
      retryCount: 0,
      orderingKey: params.orderingKey,
    };

    // Ensure topic exists
    await this.createTopic(params.topic);

    // Publish message to Redis channel
    const messageJson = JSON.stringify(message);
    await this.publisher.publish(params.topic, messageJson);

    logger.info('Message published to Redis', {
      messageId,
      topic: params.topic,
      dataSize: messageJson.length,
    });

    return {
      messageId,
      topic: params.topic,
      timestamp,
    };
  }

  async publishBatch(params: IBatchPublishParams): Promise<IBatchPublishResult> {
    const messageIds: string[] = [];
    let successful = 0;
    let failed = 0;

    // Use pipeline for better performance
    const pipeline = this.publisher.pipeline();

    for (const msg of params.messages) {
      try {
        const messageId = this.generateMessageId();
        const timestamp = new Date();

        const message: IRedisMessage = {
          id: messageId,
          data: msg.data,
          attributes: msg.attributes,
          timestamp,
          topic: params.topic,
          retryCount: 0,
          orderingKey: msg.orderingKey,
        };

        pipeline.publish(params.topic, JSON.stringify(message));
        messageIds.push(messageId);
        successful++;
      } catch {
        failed++;
      }
    }

    await this.createTopic(params.topic);
    await pipeline.exec();

    logger.info('Batch publish completed', {
      topic: params.topic,
      total: params.messages.length,
      successful,
      failed,
    });

    return {
      total: params.messages.length,
      successful,
      failed,
      messageIds,
    };
  }

  async subscribe(params: ISubscribeParams): Promise<void> {
    const { topic, subscription, handler, options } = params;

    // Ensure topic exists
    await this.createTopic(topic);

    // Store subscription handler
    this.subscriptions.set(subscription, { handler, options });

    // Subscribe to Redis channel
    await this.subscriber.subscribe(topic);

    // Set up message handler
    this.subscriber.on('message', async (channel: string, messageJson: string) => {
      if (channel !== topic) return;

      try {
        const message: IRedisMessage = JSON.parse(messageJson);
        message.ackId = `${topic}:${message.id}`;

        const processMessage = async (): Promise<void> => {
          const autoAck = options?.autoAck !== false;

          try {
            await handler(message);

            if (autoAck) {
              await this.acknowledgeMessage(message.ackId!);
            }
          } catch (error) {
            logger.error('Error processing message', {
              messageId: message.id,
              topic,
              error,
            });

            // Handle retry logic
            const maxAttempts = options?.retry?.maxAttempts || 3;
            if (message.retryCount < maxAttempts - 1) {
              message.retryCount++;
              const backoffMs = options?.retry?.backoffMs || 1000;

              setTimeout(async () => {
                await this.publisher.publish(topic, JSON.stringify(message));
              }, backoffMs * message.retryCount);
            } else if (options?.deadLetterTopic) {
              // Move to dead letter queue
              await this.publish({
                topic: options.deadLetterTopic,
                data: message.data,
                attributes: {
                  ...message.attributes,
                  originalTopic: topic,
                  failureReason: error instanceof Error ? error.message : 'Unknown error',
                },
              });
            }
          }
        };

        await processMessage();
      } catch (error) {
        logger.error('Error parsing Redis message', { topic, error });
      }
    });

    logger.info('Subscribed to Redis channel', { topic, subscription });
  }

  async unsubscribe(subscription: string): Promise<void> {
    const sub = this.subscriptions.get(subscription);
    if (sub) {
      this.subscriptions.delete(subscription);
      logger.info('Unsubscribed from Redis channel', { subscription });
    }
  }

  async acknowledgeMessage(ackId: string): Promise<void> {
    logger.debug('Message acknowledged (Redis pub/sub auto-removes)', { ackId });
  }

  async nackMessage(ackId: string): Promise<void> {
    logger.debug('Message negatively acknowledged', { ackId });
    // Redis pub/sub doesn't have explicit nack; requeue via retry logic
  }

  async createTopic(topic: string): Promise<void> {
    if (!this.topics.has(topic)) {
      this.topics.add(topic);
      logger.info('Topic registered in Redis adapter', { topic });
    }
  }

  async deleteTopic(topic: string): Promise<void> {
    this.topics.delete(topic);
    logger.info('Topic unregistered from Redis adapter', { topic });
  }

  async createSubscription(
    topic: string,
    subscription: string,
    _options?: ISubscriptionOptions
  ): Promise<void> {
    logger.info('Subscription will be created on subscribe', {
      topic,
      subscription,
    });
  }

  async deleteSubscription(subscription: string): Promise<void> {
    await this.unsubscribe(subscription);
  }

  async listTopics(): Promise<string[]> {
    return Array.from(this.topics);
  }

  async listSubscriptions(topic: string): Promise<string[]> {
    const subscriptions: string[] = [];

    this.subscriptions.forEach((_, key) => {
      if (key.includes(topic)) {
        subscriptions.push(key);
      }
    });

    return subscriptions;
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.publisher.ping();
      logger.info('Redis queue adapter configuration validated');
      return true;
    } catch (error) {
      logger.error('Redis configuration validation failed', { error });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Redis queue adapter', {
      topicCount: this.topics.size,
      subscriptionCount: this.subscriptions.size,
    });

    // Unsubscribe from all channels
    await this.subscriber.unsubscribe();
    this.subscriber.removeAllListeners('message');

    // Disconnect clients
    await this.publisher.quit();
    await this.subscriber.quit();

    // Clear data
    this.topics.clear();
    this.subscriptions.clear();
  }

  // Helper methods

  private generateMessageId(): string {
    this.messageIdCounter++;
    return `redis-${Date.now()}-${this.messageIdCounter}`;
  }
}
