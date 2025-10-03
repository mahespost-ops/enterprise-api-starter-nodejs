/**
 * AWS SQS Message Queue Adapter
 *
 * Queue-based messaging for AWS environments.
 * Supports standard and FIFO queues, message groups, and dead letter queues.
 */

import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueUrlCommand,
  ListQueuesCommand,
  type Message as SQSMessage,
} from '@aws-sdk/client-sqs';
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

interface IPollingSubscription {
  topic: string;
  handler: MessageHandler;
  options?: ISubscriptionOptions;
  isActive: boolean;
  pollingInterval?: NodeJS.Timeout;
}

export class AWSSQSAdapter implements IMessageQueueAdapter {
  private client: SQSClient;
  private queueUrls: Map<string, string>;
  private subscriptions: Map<string, IPollingSubscription>;

  constructor(region?: string) {
    this.client = new SQSClient({
      region: region || process.env.AWS_REGION || 'us-east-1',
    });

    this.queueUrls = new Map();
    this.subscriptions = new Map();
  }

  async publish(params: IPublishParams): Promise<IPublishResult> {
    const queueUrl = await this.getOrCreateQueue(params.topic);

    const messageAttributes: Record<string, { DataType: string; StringValue: string }> = {};
    if (params.attributes) {
      Object.entries(params.attributes).forEach(([key, value]) => {
        messageAttributes[key] = {
          DataType: 'String',
          StringValue: value,
        };
      });
    }

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(params.data),
      MessageAttributes: messageAttributes,
      MessageGroupId: params.orderingKey, // For FIFO queues
      MessageDeduplicationId: params.orderingKey ? `${params.orderingKey}-${Date.now()}` : undefined,
    });

    const response = await this.client.send(command);
    const timestamp = new Date();

    logger.info('Message published to AWS SQS', {
      messageId: response.MessageId,
      topic: params.topic,
    });

    return {
      messageId: response.MessageId!,
      topic: params.topic,
      timestamp,
    };
  }

  async publishBatch(params: IBatchPublishParams): Promise<IBatchPublishResult> {
    const queueUrl = await this.getOrCreateQueue(params.topic);

    const entries = params.messages.map((msg, index) => {
      const messageAttributes: Record<string, { DataType: string; StringValue: string }> = {};
      if (msg.attributes) {
        Object.entries(msg.attributes).forEach(([key, value]) => {
          messageAttributes[key] = {
            DataType: 'String',
            StringValue: value,
          };
        });
      }

      return {
        Id: `msg-${index}`,
        MessageBody: JSON.stringify(msg.data),
        MessageAttributes: messageAttributes,
        MessageGroupId: msg.orderingKey,
        MessageDeduplicationId: msg.orderingKey ? `${msg.orderingKey}-${Date.now()}-${index}` : undefined,
      };
    });

    const command = new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: entries,
    });

    const response = await this.client.send(command);

    const successful = response.Successful?.length || 0;
    const failed = response.Failed?.length || 0;
    const messageIds = response.Successful?.map((s) => s.MessageId!) || [];

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

    const queueUrl = await this.getOrCreateQueue(topic);

    const pollingSubscription: IPollingSubscription = {
      topic,
      handler,
      options,
      isActive: true,
    };

    this.subscriptions.set(subscription, pollingSubscription);

    // Start polling for messages
    const poll = async (): Promise<void> => {
      if (!pollingSubscription.isActive) {
        return;
      }

      try {
        const maxMessages = options?.maxConcurrency || 10;
        const visibilityTimeout = options?.ackDeadlineSeconds || 60;

        const command = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: Math.min(maxMessages, 10), // AWS max is 10
          WaitTimeSeconds: 20, // Long polling
          VisibilityTimeout: visibilityTimeout,
          MessageAttributeNames: ['All'],
        });

        const response = await this.client.send(command);

        if (response.Messages && response.Messages.length > 0) {
          await Promise.all(
            response.Messages.map((sqsMessage) => this.processMessage(sqsMessage, topic, queueUrl, handler, options))
          );
        }

        // Continue polling
        pollingSubscription.pollingInterval = setTimeout(poll, 0);
      } catch (error) {
        logger.error('Error polling SQS queue', { topic, error });
        // Retry after delay
        pollingSubscription.pollingInterval = setTimeout(poll, 5000);
      }
    };

    // Start polling
    void poll();

    logger.info('Subscribed to AWS SQS queue', { topic, subscription });
  }

  async unsubscribe(subscription: string): Promise<void> {
    const sub = this.subscriptions.get(subscription);
    if (sub) {
      sub.isActive = false;
      if (sub.pollingInterval) {
        clearTimeout(sub.pollingInterval);
      }
      this.subscriptions.delete(subscription);

      logger.info('Unsubscribed from AWS SQS', { subscription });
    }
  }

  async acknowledgeMessage(ackId: string): Promise<void> {
    const [queueUrl, receiptHandle] = ackId.split('|');

    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.client.send(command);
    logger.debug('Message acknowledged and deleted', { ackId });
  }

  async nackMessage(ackId: string): Promise<void> {
    const [queueUrl, receiptHandle] = ackId.split('|');

    const command = new ChangeMessageVisibilityCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: 0, // Make immediately available
    });

    await this.client.send(command);
    logger.debug('Message negatively acknowledged', { ackId });
  }

  async createTopic(topic: string): Promise<void> {
    await this.getOrCreateQueue(topic);
  }

  async deleteTopic(topic: string): Promise<void> {
    const queueUrl = this.queueUrls.get(topic);
    if (queueUrl) {
      const command = new DeleteQueueCommand({ QueueUrl: queueUrl });
      await this.client.send(command);
      this.queueUrls.delete(topic);

      logger.info('Queue deleted from AWS SQS', { topic });
    }
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
    const command = new ListQueuesCommand({});
    const response = await this.client.send(command);

    if (!response.QueueUrls) {
      return [];
    }

    return response.QueueUrls.map((url) => {
      const parts = url.split('/');
      return parts[parts.length - 1];
    });
  }

  async listSubscriptions(topic: string): Promise<string[]> {
    const subscriptions: string[] = [];

    this.subscriptions.forEach((sub, key) => {
      if (sub.topic === topic) {
        subscriptions.push(key);
      }
    });

    return subscriptions;
  }

  async validateConfig(): Promise<boolean> {
    try {
      const command = new ListQueuesCommand({});
      await this.client.send(command);
      logger.info('AWS SQS configuration validated');
      return true;
    } catch (error) {
      logger.error('AWS SQS configuration validation failed', { error });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up AWS SQS adapter', {
      queueCount: this.queueUrls.size,
      subscriptionCount: this.subscriptions.size,
    });

    // Stop all subscriptions
    for (const [subscription] of this.subscriptions) {
      await this.unsubscribe(subscription);
    }

    // Clear data
    this.queueUrls.clear();
    this.subscriptions.clear();
  }

  // Helper methods

  private async getOrCreateQueue(queueName: string): Promise<string> {
    if (this.queueUrls.has(queueName)) {
      return this.queueUrls.get(queueName)!;
    }

    try {
      // Try to get existing queue
      const getCommand = new GetQueueUrlCommand({ QueueName: queueName });
      const getResponse = await this.client.send(getCommand);

      if (getResponse.QueueUrl) {
        this.queueUrls.set(queueName, getResponse.QueueUrl);
        return getResponse.QueueUrl;
      }
    } catch {
      // Queue doesn't exist, create it
    }

    const createCommand = new CreateQueueCommand({
      QueueName: queueName,
      Attributes: {
        MessageRetentionPeriod: '345600', // 4 days
      },
    });

    const createResponse = await this.client.send(createCommand);
    const queueUrl = createResponse.QueueUrl!;

    this.queueUrls.set(queueName, queueUrl);
    logger.info('Queue created in AWS SQS', { queueName, queueUrl });

    return queueUrl;
  }

  private async processMessage(
    sqsMessage: SQSMessage,
    topic: string,
    queueUrl: string,
    handler: MessageHandler,
    options?: ISubscriptionOptions
  ): Promise<void> {
    const autoAck = options?.autoAck !== false;

    try {
      const data = JSON.parse(sqsMessage.Body || '{}');

      const attributes: Record<string, string> = {};
      if (sqsMessage.MessageAttributes) {
        Object.entries(sqsMessage.MessageAttributes).forEach(([key, value]) => {
          if (value.StringValue) {
            attributes[key] = value.StringValue;
          }
        });
      }

      const message: IMessage = {
        id: sqsMessage.MessageId!,
        data,
        attributes,
        timestamp: new Date(),
        ackId: `${queueUrl}|${sqsMessage.ReceiptHandle}`,
      };

      await handler(message);

      if (autoAck) {
        await this.acknowledgeMessage(message.ackId!);
      }
    } catch (error) {
      logger.error('Error processing message', {
        messageId: sqsMessage.MessageId,
        topic,
        error,
      });

      // Get receive count from message attributes
      const receiveCount = parseInt(
        sqsMessage.Attributes?.ApproximateReceiveCount || '1',
        10
      );
      const maxAttempts = options?.retry?.maxAttempts || 3;

      if (receiveCount >= maxAttempts) {
        if (options?.deadLetterTopic) {
          // Move to dead letter queue
          const data = JSON.parse(sqsMessage.Body || '{}');
          await this.publish({
            topic: options.deadLetterTopic,
            data,
            attributes: {
              originalTopic: topic,
              failureReason: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }

        // Remove from original queue
        await this.acknowledgeMessage(`${queueUrl}|${sqsMessage.ReceiptHandle}`);
      } else {
        // Nack to retry
        await this.nackMessage(`${queueUrl}|${sqsMessage.ReceiptHandle}`);
      }
    }
  }
}
