/**
 * Google Cloud Pub/Sub Message Queue Adapter
 *
 * Enterprise-grade pub/sub for GCP environments.
 * Supports topics, subscriptions, ordering keys, and message acknowledgment.
 */

import { PubSub, Message as PubSubMessage, Topic, Subscription } from '@google-cloud/pubsub';
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

export class GooglePubSubAdapter implements IMessageQueueAdapter {
  private client: PubSub;
  private topics: Map<string, Topic>;
  private subscriptions: Map<string, Subscription>;
  private activeHandlers: Map<string, MessageHandler>;

  constructor(projectId?: string) {
    this.client = new PubSub({
      projectId: projectId || process.env.GOOGLE_CLOUD_PROJECT,
    });

    this.topics = new Map();
    this.subscriptions = new Map();
    this.activeHandlers = new Map();
  }

  async publish(params: IPublishParams): Promise<IPublishResult> {
    const topic = await this.getOrCreateTopic(params.topic);

    const messageData = Buffer.from(JSON.stringify(params.data));
    const messageId = await topic.publishMessage({
      data: messageData,
      attributes: params.attributes || {},
      orderingKey: params.orderingKey,
    });

    const timestamp = new Date();

    logger.info('Message published to Google Pub/Sub', {
      messageId,
      topic: params.topic,
      dataSize: messageData.length,
    });

    return {
      messageId,
      topic: params.topic,
      timestamp,
    };
  }

  async publishBatch(params: IBatchPublishParams): Promise<IBatchPublishResult> {
    const topic = await this.getOrCreateTopic(params.topic);

    const messageIds: string[] = [];
    let successful = 0;
    let failed = 0;

    // Publish all messages in parallel
    const publishPromises = params.messages.map(async (msg) => {
      try {
        const messageData = Buffer.from(JSON.stringify(msg.data));
        const messageId = await topic.publishMessage({
          data: messageData,
          attributes: msg.attributes || {},
          orderingKey: msg.orderingKey,
        });
        return { success: true, messageId };
      } catch (error) {
        logger.error('Failed to publish message', { error });
        return { success: false, messageId: '' };
      }
    });

    const results = await Promise.all(publishPromises);

    results.forEach((result) => {
      if (result.success) {
        messageIds.push(result.messageId);
        successful++;
      } else {
        failed++;
      }
    });

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

    // Create subscription if it doesn't exist
    const sub = await this.getOrCreateSubscription(topic, subscription, options);

    this.activeHandlers.set(subscription, handler);

    // Configure subscription options
    if (options?.maxConcurrency || options?.ackDeadlineSeconds) {
      const subOptions: {
        flowControl?: { maxMessages: number };
        ackDeadline?: number;
      } = {};

      if (options.maxConcurrency) {
        subOptions.flowControl = {
          maxMessages: options.maxConcurrency,
        };
      }

      if (options.ackDeadlineSeconds) {
        subOptions.ackDeadline = options.ackDeadlineSeconds;
      }

      sub.setOptions(subOptions);
    }

    // Set up message handler
    const messageHandler = async (message: PubSubMessage): Promise<void> => {
      const autoAck = options?.autoAck !== false;

      try {
        const data = JSON.parse(message.data.toString());

        const queueMessage: IMessage = {
          id: message.id,
          data,
          attributes: message.attributes,
          timestamp: new Date(message.publishTime as unknown as number),
          ackId: message.ackId,
        };

        await handler(queueMessage);

        if (autoAck) {
          message.ack();
        }
      } catch (error) {
        logger.error('Error processing message', {
          messageId: message.id,
          topic,
          error,
        });

        // Handle retry logic
        const maxAttempts = options?.retry?.maxAttempts || 3;
        const deliveryAttempt = message.deliveryAttempt || 1;

        if (deliveryAttempt < maxAttempts) {
          // Nack to retry
          message.nack();
        } else if (options?.deadLetterTopic) {
          // Move to dead letter queue
          const data = JSON.parse(message.data.toString());
          await this.publish({
            topic: options.deadLetterTopic,
            data,
            attributes: {
              ...message.attributes,
              originalTopic: topic,
              failureReason: error instanceof Error ? error.message : 'Unknown error',
            },
          });
          message.ack();
        } else {
          message.nack();
        }
      }
    };

    sub.on('message', messageHandler);

    sub.on('error', (error) => {
      logger.error('Subscription error', { subscription, error });
    });

    logger.info('Subscribed to Google Pub/Sub topic', { topic, subscription });
  }

  async unsubscribe(subscription: string): Promise<void> {
    const sub = this.subscriptions.get(subscription);
    if (sub) {
      sub.removeAllListeners('message');
      await sub.close();
      this.subscriptions.delete(subscription);
      this.activeHandlers.delete(subscription);

      logger.info('Unsubscribed from Google Pub/Sub', { subscription });
    }
  }

  async acknowledgeMessage(ackId: string): Promise<void> {
    // Google Pub/Sub handles ack through the message object
    logger.debug('Message acknowledged', { ackId });
  }

  async nackMessage(ackId: string): Promise<void> {
    // Google Pub/Sub handles nack through the message object
    logger.debug('Message negatively acknowledged', { ackId });
  }

  async createTopic(topic: string): Promise<void> {
    if (this.topics.has(topic)) {
      return;
    }

    try {
      const [topicInstance] = await this.client.createTopic(topic);
      this.topics.set(topic, topicInstance);
      logger.info('Topic created in Google Pub/Sub', { topic });
    } catch (error: unknown) {
      // Type guard to check if error has a code property
      if (error && typeof error === 'object' && 'code' in error && error.code === 6) {
        // Topic already exists
        const topicInstance = this.client.topic(topic);
        this.topics.set(topic, topicInstance);
        logger.debug('Topic already exists in Google Pub/Sub', { topic });
      } else {
        throw error;
      }
    }
  }

  async deleteTopic(topic: string): Promise<void> {
    const topicInstance = this.topics.get(topic);
    if (topicInstance) {
      await topicInstance.delete();
      this.topics.delete(topic);
      logger.info('Topic deleted from Google Pub/Sub', { topic });
    }
  }

  async createSubscription(
    topic: string,
    subscription: string,
    options?: ISubscriptionOptions
  ): Promise<void> {
    await this.getOrCreateSubscription(topic, subscription, options);
  }

  async deleteSubscription(subscription: string): Promise<void> {
    const sub = this.subscriptions.get(subscription);
    if (sub) {
      await sub.delete();
      this.subscriptions.delete(subscription);
      this.activeHandlers.delete(subscription);
      logger.info('Subscription deleted from Google Pub/Sub', { subscription });
    }
  }

  async listTopics(): Promise<string[]> {
    const [topics] = await this.client.getTopics();
    return topics.map((t) => t.name.split('/').pop() || '');
  }

  async listSubscriptions(topic: string): Promise<string[]> {
    const topicInstance = this.topics.get(topic) || this.client.topic(topic);
    const [subscriptions] = await topicInstance.getSubscriptions();
    return subscriptions.map((s) => s.name.split('/').pop() || '');
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.client.getTopics();
      logger.info('Google Pub/Sub configuration validated');
      return true;
    } catch (error) {
      logger.error('Google Pub/Sub configuration validation failed', { error });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Google Pub/Sub adapter', {
      topicCount: this.topics.size,
      subscriptionCount: this.subscriptions.size,
    });

    // Close all subscriptions
    for (const sub of this.subscriptions.values()) {
      sub.removeAllListeners();
      await sub.close();
    }

    // Clear data
    this.topics.clear();
    this.subscriptions.clear();
    this.activeHandlers.clear();
  }

  // Helper methods

  private async getOrCreateTopic(topicName: string): Promise<Topic> {
    if (this.topics.has(topicName)) {
      return this.topics.get(topicName)!;
    }

    await this.createTopic(topicName);
    return this.topics.get(topicName)!;
  }

  private async getOrCreateSubscription(
    topicName: string,
    subscriptionName: string,
    options?: ISubscriptionOptions
  ): Promise<Subscription> {
    if (this.subscriptions.has(subscriptionName)) {
      return this.subscriptions.get(subscriptionName)!;
    }

    const topic = await this.getOrCreateTopic(topicName);

    try {
      const subscriptionOptions: Record<string, unknown> = {};

      if (options?.ackDeadlineSeconds) {
        subscriptionOptions.ackDeadlineSeconds = options.ackDeadlineSeconds;
      }

      if (options?.deadLetterTopic) {
        subscriptionOptions.deadLetterPolicy = {
          deadLetterTopic: `projects/${this.client.projectId}/topics/${options.deadLetterTopic}`,
          maxDeliveryAttempts: options.retry?.maxAttempts || 5,
        };
      }

      const [subscription] = await topic.createSubscription(subscriptionName, subscriptionOptions);
      this.subscriptions.set(subscriptionName, subscription);
      logger.info('Subscription created in Google Pub/Sub', { topicName, subscriptionName });

      return subscription;
    } catch (error: unknown) {
      // Type guard to check if error has a code property
      if (error && typeof error === 'object' && 'code' in error && error.code === 6) {
        // Subscription already exists
        const subscription = topic.subscription(subscriptionName);
        this.subscriptions.set(subscriptionName, subscription);
        logger.debug('Subscription already exists in Google Pub/Sub', { subscriptionName });
        return subscription;
      } else {
        throw error;
      }
    }
  }
}
