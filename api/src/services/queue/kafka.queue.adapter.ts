/**
 * Kafka Message Queue Adapter
 *
 * High-throughput distributed streaming platform.
 * Supports topics, partitions, consumer groups, and exactly-once semantics.
 */

import {
  Kafka,
  Producer,
  Consumer,
  EachMessagePayload,
  KafkaConfig,
  Message as KafkaMessage,
} from 'kafkajs';
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

interface IActiveConsumer {
  consumer: Consumer;
  topic: string;
  handler: MessageHandler;
  options?: ISubscriptionOptions;
}

export class KafkaQueueAdapter implements IMessageQueueAdapter {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, IActiveConsumer>;
  private topics: Set<string>;
  private messageIdCounter: number;
  private isProducerConnected: boolean;

  constructor(brokers?: string[], clientId?: string) {
    const kafkaBrokers = brokers ||
      (process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092']);
    const kafkaClientId = clientId || process.env.KAFKA_CLIENT_ID || 'api-service';

    const config: KafkaConfig = {
      clientId: kafkaClientId,
      brokers: kafkaBrokers,
    };

    this.kafka = new Kafka(config);
    this.producer = this.kafka.producer();
    this.consumers = new Map();
    this.topics = new Set();
    this.messageIdCounter = 0;
    this.isProducerConnected = false;

    // Connect producer
    void this.connectProducer();
  }

  private async connectProducer(): Promise<void> {
    try {
      await this.producer.connect();
      this.isProducerConnected = true;
      logger.info('Kafka producer connected');
    } catch (error) {
      logger.error('Failed to connect Kafka producer', { error });
      // Retry connection
      setTimeout(() => this.connectProducer(), 5000);
    }
  }

  async publish(params: IPublishParams): Promise<IPublishResult> {
    if (!this.isProducerConnected) {
      await this.connectProducer();
    }

    const messageId = this.generateMessageId();
    const timestamp = new Date();

    const message: KafkaMessage = {
      key: params.orderingKey, // Use ordering key as partition key
      value: JSON.stringify({
        id: messageId,
        data: params.data,
        attributes: params.attributes,
        timestamp: timestamp.toISOString(),
      }),
      headers: params.attributes
        ? Object.entries(params.attributes).reduce((acc, [key, value]) => {
            acc[key] = Buffer.from(value);
            return acc;
          }, {} as Record<string, Buffer>)
        : undefined,
    };

    await this.producer.send({
      topic: params.topic,
      messages: [message],
    });

    logger.info('Message published to Kafka', {
      messageId,
      topic: params.topic,
    });

    return {
      messageId,
      topic: params.topic,
      timestamp,
    };
  }

  async publishBatch(params: IBatchPublishParams): Promise<IBatchPublishResult> {
    if (!this.isProducerConnected) {
      await this.connectProducer();
    }

    const messageIds: string[] = [];
    let successful = 0;
    let failed = 0;

    const kafkaMessages: KafkaMessage[] = [];

    for (const msg of params.messages) {
      try {
        const messageId = this.generateMessageId();
        const timestamp = new Date();

        const kafkaMessage: KafkaMessage = {
          key: msg.orderingKey,
          value: JSON.stringify({
            id: messageId,
            data: msg.data,
            attributes: msg.attributes,
            timestamp: timestamp.toISOString(),
          }),
          headers: msg.attributes
            ? Object.entries(msg.attributes).reduce((acc, [key, value]) => {
                acc[key] = Buffer.from(value);
                return acc;
              }, {} as Record<string, Buffer>)
            : undefined,
        };

        kafkaMessages.push(kafkaMessage);
        messageIds.push(messageId);
        successful++;
      } catch {
        failed++;
      }
    }

    await this.producer.send({
      topic: params.topic,
      messages: kafkaMessages,
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

    // Create consumer with the subscription name as consumer group
    const consumer = this.kafka.consumer({
      groupId: subscription,
      maxWaitTimeInMs: 5000,
    });

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    this.consumers.set(subscription, {
      consumer,
      topic,
      handler,
      options,
    });

    await consumer.run({
      autoCommit: options?.autoAck !== false,
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload, handler, options);
      },
    });

    logger.info('Subscribed to Kafka topic', { topic, subscription });
  }

  async unsubscribe(subscription: string): Promise<void> {
    const activeConsumer = this.consumers.get(subscription);
    if (activeConsumer) {
      await activeConsumer.consumer.disconnect();
      this.consumers.delete(subscription);

      logger.info('Unsubscribed from Kafka', { subscription });
    }
  }

  async acknowledgeMessage(ackId: string): Promise<void> {
    // Kafka auto-commits when autoCommit is enabled
    logger.debug('Message acknowledged (Kafka auto-commit)', { ackId });
  }

  async nackMessage(ackId: string): Promise<void> {
    // Kafka will retry based on consumer settings
    logger.debug('Message negatively acknowledged', { ackId });
  }

  async createTopic(topic: string): Promise<void> {
    if (!this.topics.has(topic)) {
      // Kafka creates topics automatically when first message is published
      // Or you can use Kafka admin client for explicit creation
      this.topics.add(topic);
      logger.info('Topic registered in Kafka adapter', { topic });
    }
  }

  async deleteTopic(topic: string): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();
    await admin.deleteTopics({ topics: [topic] });
    await admin.disconnect();

    this.topics.delete(topic);
    logger.info('Topic deleted from Kafka', { topic });
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
    const admin = this.kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    await admin.disconnect();

    return topics;
  }

  async listSubscriptions(topic: string): Promise<string[]> {
    const subscriptions: string[] = [];

    this.consumers.forEach((consumer, key) => {
      if (consumer.topic === topic) {
        subscriptions.push(key);
      }
    });

    return subscriptions;
  }

  async validateConfig(): Promise<boolean> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      logger.info('Kafka configuration validated');
      return true;
    } catch (error) {
      logger.error('Kafka configuration validation failed', { error });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Kafka adapter', {
      topicCount: this.topics.size,
      consumerCount: this.consumers.size,
    });

    // Disconnect all consumers
    for (const [subscription, activeConsumer] of this.consumers) {
      await activeConsumer.consumer.disconnect();
      this.consumers.delete(subscription);
    }

    // Disconnect producer
    if (this.isProducerConnected) {
      await this.producer.disconnect();
      this.isProducerConnected = false;
    }

    // Clear data
    this.topics.clear();
  }

  // Helper methods

  private async processMessage(
    payload: EachMessagePayload,
    handler: MessageHandler,
    options?: ISubscriptionOptions
  ): Promise<void> {
    const { message: kafkaMessage, topic, partition } = payload;

    try {
      const messageData = JSON.parse(kafkaMessage.value?.toString() || '{}');

      const attributes: Record<string, string> = {};
      if (kafkaMessage.headers) {
        Object.entries(kafkaMessage.headers).forEach(([key, value]) => {
          if (value) {
            attributes[key] = value.toString();
          }
        });
      }

      const message: IMessage = {
        id: messageData.id || this.generateMessageId(),
        data: messageData.data,
        attributes: { ...attributes, ...messageData.attributes },
        timestamp: new Date(messageData.timestamp),
        ackId: `${topic}:${partition}:${kafkaMessage.offset}`,
      };

      await handler(message);
    } catch (error) {
      logger.error('Error processing Kafka message', {
        topic,
        partition,
        offset: kafkaMessage.offset,
        error,
      });

      // Handle dead letter topic
      if (options?.deadLetterTopic) {
        try {
          const messageData = JSON.parse(kafkaMessage.value?.toString() || '{}');
          await this.publish({
            topic: options.deadLetterTopic,
            data: messageData.data,
            attributes: {
              ...messageData.attributes,
              originalTopic: topic,
              failureReason: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } catch (dlqError) {
          logger.error('Failed to publish to dead letter topic', {
            topic: options.deadLetterTopic,
            error: dlqError,
          });
        }
      }

      // Rethrow to let Kafka handle retry
      throw error;
    }
  }

  private generateMessageId(): string {
    this.messageIdCounter++;
    return `kafka-${Date.now()}-${this.messageIdCounter}`;
  }
}
