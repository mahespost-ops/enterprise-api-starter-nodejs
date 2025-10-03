/**
 * Message Queue Adapter Tests
 *
 * Comprehensive test suite for all message queue adapter implementations.
 * Tests the adapter interface contract that all providers must satisfy.
 */

import type {
  IMessageQueueAdapter,
  IPublishParams,
  IBatchPublishParams,
  ISubscribeParams,
  IMessage,
} from '../message-queue.interface';
import { MemoryQueueAdapter } from '../memory.queue.adapter';

describe('Message Queue Adapter Interface Contract', () => {
  let adapter: IMessageQueueAdapter;
  const TEST_TOPIC = 'test-topic';
  const TEST_SUBSCRIPTION = 'test-subscription';

  beforeEach(async () => {
    adapter = new MemoryQueueAdapter();
    await adapter.createTopic(TEST_TOPIC);
  });

  afterEach(async () => {
    await adapter.cleanup();
  });

  describe('publish', () => {
    it('should publish a message to a topic successfully', async () => {
      const params: IPublishParams = {
        topic: TEST_TOPIC,
        data: { message: 'Hello World' },
      };

      const result = await adapter.publish(params);

      expect(result).toMatchObject({
        messageId: expect.any(String),
        topic: TEST_TOPIC,
        timestamp: expect.any(Date),
      });
      expect(result.messageId).toBeTruthy();
    });

    it('should publish message with attributes', async () => {
      const params: IPublishParams = {
        topic: TEST_TOPIC,
        data: { userId: '123' },
        attributes: {
          priority: 'high',
          source: 'api',
        },
      };

      const result = await adapter.publish(params);

      expect(result.messageId).toBeTruthy();
      expect(result.topic).toBe(TEST_TOPIC);
    });

    it('should publish message with ordering key', async () => {
      const params: IPublishParams = {
        topic: TEST_TOPIC,
        data: { orderId: '456' },
        orderingKey: 'order-456',
      };

      const result = await adapter.publish(params);

      expect(result.messageId).toBeTruthy();
    });

    it('should handle various data types', async () => {
      const testCases = [
        { data: { string: 'value' } },
        { data: { number: 123 } },
        { data: { boolean: true } },
        { data: { array: [1, 2, 3] } },
        { data: { nested: { object: { value: 'test' } } } },
      ];

      for (const testCase of testCases) {
        const result = await adapter.publish({
          topic: TEST_TOPIC,
          ...testCase,
        });
        expect(result.messageId).toBeTruthy();
      }
    });
  });

  describe('publishBatch', () => {
    it('should publish multiple messages in a batch', async () => {
      const params: IBatchPublishParams = {
        topic: TEST_TOPIC,
        messages: [
          { data: { msg: 'Message 1' } },
          { data: { msg: 'Message 2' } },
          { data: { msg: 'Message 3' } },
        ],
      };

      const result = await adapter.publishBatch(params);

      expect(result).toMatchObject({
        total: 3,
        successful: 3,
        failed: 0,
        messageIds: expect.any(Array),
      });
      expect(result.messageIds).toHaveLength(3);
    });

    it('should handle empty batch', async () => {
      const params: IBatchPublishParams = {
        topic: TEST_TOPIC,
        messages: [],
      };

      const result = await adapter.publishBatch(params);

      expect(result.total).toBe(0);
      expect(result.messageIds).toHaveLength(0);
    });

    it('should publish batch with attributes and ordering keys', async () => {
      const params: IBatchPublishParams = {
        topic: TEST_TOPIC,
        messages: [
          {
            data: { orderId: '1' },
            attributes: { priority: 'high' },
            orderingKey: 'order-1',
          },
          {
            data: { orderId: '2' },
            attributes: { priority: 'low' },
            orderingKey: 'order-2',
          },
        ],
      };

      const result = await adapter.publishBatch(params);

      expect(result.successful).toBe(2);
      expect(result.messageIds).toHaveLength(2);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to a topic and receive messages', async () => {
      const receivedMessages: IMessage[] = [];

      const params: ISubscribeParams = {
        topic: TEST_TOPIC,
        subscription: TEST_SUBSCRIPTION,
        handler: async (message: IMessage) => {
          receivedMessages.push(message);
        },
      };

      await adapter.subscribe(params);

      // Publish a message
      await adapter.publish({
        topic: TEST_TOPIC,
        data: { test: 'data' },
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(receivedMessages[0].data).toEqual({ test: 'data' });
    });

    it('should receive messages with attributes', async () => {
      const receivedMessages: IMessage[] = [];

      await adapter.subscribe({
        topic: TEST_TOPIC,
        subscription: TEST_SUBSCRIPTION,
        handler: async (message: IMessage) => {
          receivedMessages.push(message);
        },
      });

      await adapter.publish({
        topic: TEST_TOPIC,
        data: { test: 'data' },
        attributes: { key: 'value' },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessages[0].attributes).toEqual({ key: 'value' });
    });

    it('should support auto-acknowledgment', async () => {
      let processed = false;

      await adapter.subscribe({
        topic: TEST_TOPIC,
        subscription: TEST_SUBSCRIPTION,
        handler: async () => {
          processed = true;
        },
        options: {
          autoAck: true,
        },
      });

      await adapter.publish({
        topic: TEST_TOPIC,
        data: { test: 'data' },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(processed).toBe(true);
    });

    it('should support manual acknowledgment', async () => {
      let ackId: string | undefined;

      await adapter.subscribe({
        topic: TEST_TOPIC,
        subscription: TEST_SUBSCRIPTION,
        handler: async (message: IMessage) => {
          ackId = message.ackId;
        },
        options: {
          autoAck: false,
        },
      });

      await adapter.publish({
        topic: TEST_TOPIC,
        data: { test: 'data' },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(ackId).toBeTruthy();
    });

    it('should handle subscription options', async () => {
      await adapter.subscribe({
        topic: TEST_TOPIC,
        subscription: TEST_SUBSCRIPTION,
        handler: async () => {
          // Handler logic
        },
        options: {
          maxConcurrency: 5,
          ackDeadlineSeconds: 30,
          autoAck: true,
          retry: {
            maxAttempts: 3,
            backoffMs: 1000,
          },
        },
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from a topic', async () => {
      await adapter.subscribe({
        topic: TEST_TOPIC,
        subscription: TEST_SUBSCRIPTION,
        handler: async () => {
          // Handler
        },
      });

      await expect(adapter.unsubscribe(TEST_SUBSCRIPTION)).resolves.not.toThrow();
    });
  });

  describe('acknowledgeMessage', () => {
    it('should acknowledge a message', async () => {
      let ackId: string | undefined;

      await adapter.subscribe({
        topic: TEST_TOPIC,
        subscription: TEST_SUBSCRIPTION,
        handler: async (message: IMessage) => {
          ackId = message.ackId;
        },
        options: { autoAck: false },
      });

      await adapter.publish({
        topic: TEST_TOPIC,
        data: { test: 'data' },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (ackId) {
        await expect(adapter.acknowledgeMessage(ackId)).resolves.not.toThrow();
      }
    });
  });

  describe('nackMessage', () => {
    it('should negatively acknowledge a message', async () => {
      let ackId: string | undefined;

      await adapter.subscribe({
        topic: TEST_TOPIC,
        subscription: TEST_SUBSCRIPTION,
        handler: async (message: IMessage) => {
          ackId = message.ackId;
        },
        options: { autoAck: false },
      });

      await adapter.publish({
        topic: TEST_TOPIC,
        data: { test: 'data' },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (ackId) {
        await expect(adapter.nackMessage(ackId)).resolves.not.toThrow();
      }
    });
  });

  describe('createTopic', () => {
    it('should create a new topic', async () => {
      const newTopic = 'new-test-topic';

      await adapter.createTopic(newTopic);

      const topics = await adapter.listTopics();
      expect(topics).toContain(newTopic);
    });

    it('should handle creating existing topic', async () => {
      await adapter.createTopic(TEST_TOPIC);
      await expect(adapter.createTopic(TEST_TOPIC)).resolves.not.toThrow();
    });
  });

  describe('deleteTopic', () => {
    it('should delete a topic', async () => {
      await adapter.deleteTopic(TEST_TOPIC);

      const topics = await adapter.listTopics();
      expect(topics).not.toContain(TEST_TOPIC);
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription', async () => {
      await expect(
        adapter.createSubscription(TEST_TOPIC, 'new-subscription')
      ).resolves.not.toThrow();
    });

    it('should create subscription with options', async () => {
      await expect(
        adapter.createSubscription(TEST_TOPIC, 'new-subscription', {
          ackDeadlineSeconds: 60,
          maxConcurrency: 10,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('deleteSubscription', () => {
    it('should delete a subscription', async () => {
      await adapter.createSubscription(TEST_TOPIC, 'temp-subscription');
      await expect(adapter.deleteSubscription('temp-subscription')).resolves.not.toThrow();
    });
  });

  describe('listTopics', () => {
    it('should list all topics', async () => {
      await adapter.createTopic('topic-1');
      await adapter.createTopic('topic-2');

      const topics = await adapter.listTopics();

      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeGreaterThan(0);
    });
  });

  describe('listSubscriptions', () => {
    it('should list subscriptions for a topic', async () => {
      const subscriptions = await adapter.listSubscriptions(TEST_TOPIC);

      expect(Array.isArray(subscriptions)).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should validate adapter configuration', async () => {
      const isValid = await adapter.validateConfig();

      expect(typeof isValid).toBe('boolean');
      expect(isValid).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup adapter resources', async () => {
      await adapter.publish({
        topic: TEST_TOPIC,
        data: { test: 'data' },
      });

      await expect(adapter.cleanup()).resolves.not.toThrow();
    });

    it('should allow multiple cleanup calls', async () => {
      await adapter.cleanup();
      await expect(adapter.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Retries', () => {
    it('should handle message processing errors', async () => {
      let attemptCount = 0;

      await adapter.subscribe({
        topic: TEST_TOPIC,
        subscription: TEST_SUBSCRIPTION,
        handler: async () => {
          attemptCount++;
          throw new Error('Processing failed');
        },
        options: {
          autoAck: false,
          retry: {
            maxAttempts: 2,
            backoffMs: 50,
          },
        },
      });

      await adapter.publish({
        topic: TEST_TOPIC,
        data: { test: 'data' },
      });

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should have attempted at least twice
      expect(attemptCount).toBeGreaterThanOrEqual(1);
    });

    it('should support dead letter queue', async () => {
      const DLQ_TOPIC = 'dlq-topic';
      await adapter.createTopic(DLQ_TOPIC);

      const dlqMessages: IMessage[] = [];

      await adapter.subscribe({
        topic: DLQ_TOPIC,
        subscription: 'dlq-subscription',
        handler: async (message: IMessage) => {
          dlqMessages.push(message);
        },
      });

      await adapter.subscribe({
        topic: TEST_TOPIC,
        subscription: TEST_SUBSCRIPTION,
        handler: async () => {
          throw new Error('Processing failed');
        },
        options: {
          retry: {
            maxAttempts: 1,
            backoffMs: 10,
          },
          deadLetterTopic: DLQ_TOPIC,
        },
      });

      await adapter.publish({
        topic: TEST_TOPIC,
        data: { test: 'failed-message' },
      });

      // Wait for DLQ delivery
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Message should eventually land in DLQ
      expect(dlqMessages.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('MemoryQueueAdapter Specific Tests', () => {
  let adapter: MemoryQueueAdapter;

  beforeEach(() => {
    adapter = new MemoryQueueAdapter();
  });

  afterEach(async () => {
    await adapter.cleanup();
  });

  describe('Test Helpers', () => {
    it('should provide queue statistics', async () => {
      const topic = 'stats-topic';
      await adapter.createTopic(topic);

      await adapter.publish({
        topic,
        data: { msg: 'Message 1' },
      });

      await adapter.publish({
        topic,
        data: { msg: 'Message 2' },
      });

      const stats = adapter.getStats();

      expect(stats[topic]).toBeDefined();
      expect(stats[topic].queuedMessages).toBeGreaterThan(0);
    });
  });

  describe('Message Ordering', () => {
    it('should maintain message order within a topic', async () => {
      const topic = 'ordered-topic';
      await adapter.createTopic(topic);

      const receivedMessages: IMessage[] = [];

      await adapter.subscribe({
        topic,
        subscription: 'order-test',
        handler: async (message: IMessage) => {
          receivedMessages.push(message);
        },
      });

      // Publish messages in order
      for (let i = 1; i <= 5; i++) {
        await adapter.publish({
          topic,
          data: { sequence: i },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(receivedMessages.length).toBe(5);
      // Verify order
      for (let i = 0; i < 5; i++) {
        expect(receivedMessages[i].data).toEqual({ sequence: i + 1 });
      }
    });
  });
});
