/**
 * In-Memory Message Queue Adapter
 *
 * Simple in-memory queue for local development and testing.
 * Messages are stored in memory and lost on restart.
 */

import { EventEmitter } from 'events';
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

interface IQueuedMessage extends IMessage {
  topic: string;
  retryCount: number;
  processingDeadline?: number;
}

export class MemoryQueueAdapter implements IMessageQueueAdapter {
  private topics: Map<string, IQueuedMessage[]>;
  private subscriptions: Map<string, EventEmitter>;
  private activeHandlers: Map<string, MessageHandler>;
  private messageIdCounter: number;

  constructor() {
    this.topics = new Map();
    this.subscriptions = new Map();
    this.activeHandlers = new Map();
    this.messageIdCounter = 0;
  }

  async publish(params: IPublishParams): Promise<IPublishResult> {
    const messageId = this.generateMessageId();
    const ackId = `${params.topic}:${messageId}`;

    const message: IQueuedMessage = {
      id: messageId,
      data: params.data,
      attributes: params.attributes,
      timestamp: new Date(),
      ackId,
      topic: params.topic,
      retryCount: 0,
    };

    // Ensure topic exists
    if (!this.topics.has(params.topic)) {
      await this.createTopic(params.topic);
    }

    // Add message to topic queue
    this.topics.get(params.topic)!.push(message);

    // Emit to subscribers
    const emitter = this.subscriptions.get(params.topic);
    if (emitter) {
      emitter.emit('message', message);
    }

    logger.info('Message published to in-memory queue', {
      messageId,
      topic: params.topic,
      dataSize: JSON.stringify(params.data).length,
    });

    return {
      messageId,
      topic: params.topic,
      timestamp: message.timestamp,
    };
  }

  async publishBatch(params: IBatchPublishParams): Promise<IBatchPublishResult> {
    const messageIds: string[] = [];
    let successful = 0;
    let failed = 0;

    for (const msg of params.messages) {
      try {
        const result = await this.publish({
          topic: params.topic,
          data: msg.data,
          attributes: msg.attributes,
          orderingKey: msg.orderingKey,
        });
        messageIds.push(result.messageId);
        successful++;
      } catch {
        failed++;
      }
    }

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
    if (!this.topics.has(topic)) {
      await this.createTopic(topic);
    }

    // Create subscription event emitter if it doesn't exist
    if (!this.subscriptions.has(topic)) {
      const emitter = new EventEmitter();
      this.subscriptions.set(topic, emitter);
    }

    const emitter = this.subscriptions.get(topic)!;
    this.activeHandlers.set(subscription, handler);

    const processMessage = async (message: IQueuedMessage): Promise<void> => {
      // Note: maxConcurrency would be used in a production implementation with a worker pool
      // For this in-memory implementation, messages are processed sequentially
      const ackDeadline = (options?.ackDeadlineSeconds || 60) * 1000;
      const autoAck = options?.autoAck !== false;

      message.processingDeadline = Date.now() + ackDeadline;

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

          setTimeout(() => {
            emitter.emit('message', message);
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

    emitter.on('message', processMessage);

    // Process any existing messages in the queue
    const queue = this.topics.get(topic)!;
    queue.forEach((msg) => emitter.emit('message', msg));

    logger.info('Subscribed to in-memory queue', {
      topic,
      subscription,
      queuedMessages: queue.length,
    });
  }

  async unsubscribe(subscription: string): Promise<void> {
    this.activeHandlers.delete(subscription);

    logger.info('Unsubscribed from in-memory queue', { subscription });
  }

  async acknowledgeMessage(ackId: string): Promise<void> {
    // Remove message from queue
    const [topic, messageId] = ackId.split(':');

    if (!this.topics.has(topic)) {
      return;
    }

    const queue = this.topics.get(topic)!;
    const index = queue.findIndex((msg) => msg.id === messageId);

    if (index !== -1) {
      queue.splice(index, 1);
      logger.debug('Message acknowledged and removed', { ackId });
    }
  }

  async nackMessage(ackId: string): Promise<void> {
    // Reset processing deadline to make message available again
    const [topic, messageId] = ackId.split(':');

    if (!this.topics.has(topic)) {
      return;
    }

    const queue = this.topics.get(topic)!;
    const message = queue.find((msg) => msg.id === messageId);

    if (message) {
      message.processingDeadline = undefined;
      logger.debug('Message negatively acknowledged', { ackId });

      // Re-emit message
      const emitter = this.subscriptions.get(topic);
      if (emitter) {
        setImmediate(() => emitter.emit('message', message));
      }
    }
  }

  async createTopic(topic: string): Promise<void> {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, []);
      logger.info('Topic created in memory', { topic });
    }
  }

  async deleteTopic(topic: string): Promise<void> {
    this.topics.delete(topic);
    this.subscriptions.delete(topic);

    logger.info('Topic deleted from memory', { topic });
  }

  async createSubscription(
    topic: string,
    subscription: string,
    _options?: ISubscriptionOptions
  ): Promise<void> {
    // In memory implementation, subscription is created on subscribe
    logger.info('Subscription will be created on subscribe', {
      topic,
      subscription,
    });
  }

  async deleteSubscription(subscription: string): Promise<void> {
    await this.unsubscribe(subscription);
  }

  async listTopics(): Promise<string[]> {
    return Array.from(this.topics.keys());
  }

  async listSubscriptions(topic: string): Promise<string[]> {
    const subscriptions: string[] = [];

    this.activeHandlers.forEach((_, key) => {
      if (key.startsWith(topic)) {
        subscriptions.push(key);
      }
    });

    return subscriptions;
  }

  async validateConfig(): Promise<boolean> {
    logger.info('Validating in-memory queue adapter configuration');
    return true;
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up in-memory queue adapter', {
      topicCount: this.topics.size,
      subscriptionCount: this.subscriptions.size,
    });

    // Remove all event listeners
    this.subscriptions.forEach((emitter) => emitter.removeAllListeners());

    // Clear all data
    this.topics.clear();
    this.subscriptions.clear();
    this.activeHandlers.clear();
  }

  // Helper methods

  private generateMessageId(): string {
    this.messageIdCounter++;
    return `mem-${Date.now()}-${this.messageIdCounter}`;
  }

  /**
   * Test helper: Get queue stats
   */
  public getStats(): Record<string, { queuedMessages: number; oldestMessage?: Date }> {
    const stats: Record<string, { queuedMessages: number; oldestMessage?: Date }> = {};

    this.topics.forEach((queue, topic) => {
      stats[topic] = {
        queuedMessages: queue.length,
        oldestMessage: queue[0]?.timestamp,
      };
    });

    return stats;
  }
}
