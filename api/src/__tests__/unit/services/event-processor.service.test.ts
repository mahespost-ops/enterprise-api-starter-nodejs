/**
 * Event Processor Service Tests
 *
 * Tests for EventEmitter-based event orchestration with dual stream processing
 */

// Mock dependencies before imports
jest.mock('../../../services/event-batch-writer.service', () => ({
  eventBatchWriterService: {
    enqueue: jest.fn(),
    shutdown: jest.fn(),
    getStats: jest.fn(() => ({
      bufferSize: 0,
      totalEnqueued: 0,
      totalWritten: 0,
    })),
  },
}));

jest.mock('../../../services/adapter.factory', () => ({
  getAdapterFactory: jest.fn(() => ({
    getMessageQueueAdapter: jest.fn(() => ({
      publish: jest.fn(),
    })),
    cleanup: jest.fn(),
  })),
}));

// Mock uuid for deterministic event IDs
jest.mock('uuid', () => ({
  v4: (): string => 'test-event-uuid-v1',
}));

jest.mock('../../../config/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../config/database', () => ({
  __esModule: true,
  default: {},
}));

import { eventBatchWriterService } from '../../../services/event-batch-writer.service';
import { getAdapterFactory } from '../../../services/adapter.factory';
import logger from '../../../config/logger';
import type { EventData } from '../../../types/event.types';

// Import after mocks
import { eventProcessorService } from '../../../services/event-processor.service';

describe('EventProcessorService', () => {
  // Mock EventType instances
  const mockWebhookEventType = {
    id: '11111111-1111-1111-1111-111111111111',
    verb: 'user.update',
    httpMethod: 'PATCH',
    httpPath: '/api/v1/users/:userId',
    isWebhookEvent: true,
    description: 'User profile update',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const mockNonWebhookEventType = {
    id: '22222222-2222-2222-2222-222222222222',
    verb: 'user.list',
    httpMethod: 'GET',
    httpPath: '/api/v1/users',
    isWebhookEvent: false,
    description: 'List users',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  // Test data
  const mockEventData: EventData = {
    eventType: mockWebhookEventType,
    request: {
      method: 'PATCH',
      path: '/api/v1/users/00000000-0000-0000-0000-000000000001',
      headers: { 'content-type': 'application/json' },
      body: { givenName: 'Updated Name' },
      query: {},
      params: { userId: '00000000-0000-0000-0000-000000000001' },
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    },
    response: {
      statusCode: 200,
      duration: 50,
    },
    context: {
      userId: '00000000-0000-0000-0000-000000000001',
      userName: 'Test User',
      userEmail: 'test@example.com',
      orgId: '550e8400-e29b-41d4-a716-446655440002',
      envId: '7c9e6679-7425-40de-944b-e07fc1f90003',
      orgName: 'Test Org',
      envName: 'Live',
      impersonation: null,
      requestId: 'req-123',
    },
  };

  const mockNonWebhookEventData: EventData = {
    ...mockEventData,
    eventType: mockNonWebhookEventType,
    request: {
      ...mockEventData.request,
      method: 'GET',
      path: '/api/v1/users',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Processing', () => {
    it('should enqueue event to batch writer when event is emitted', (done) => {
      // Arrange
      (eventBatchWriterService.enqueue as jest.Mock).mockImplementation(() => {
        // Assert
        expect(eventBatchWriterService.enqueue).toHaveBeenCalledWith(mockEventData);
        done();
      });

      // Act
      eventProcessorService.emit('api-request', mockEventData);
    });

    it('should publish webhook events to message queue', (done) => {
      // Arrange
      const mockPublish = jest.fn().mockResolvedValue(undefined);
      const mockMessageQueue = { publish: mockPublish };
      (getAdapterFactory as jest.Mock).mockReturnValue({
        getMessageQueueAdapter: jest.fn(() => mockMessageQueue),
        cleanup: jest.fn(),
      });

      // Wait for async processing
      setTimeout(() => {
        // Assert
        expect(mockPublish).toHaveBeenCalledWith({
          topic: 'events.user.update',
          data: expect.objectContaining({
            specversion: '1.0.2',
            type: 'com.enterprise.user.update',
            source: '/orgs/550e8400-e29b-41d4-a716-446655440002/envs/7c9e6679-7425-40de-944b-e07fc1f90003',
            id: 'test-event-uuid-v1',
            datacontenttype: 'application/json',
            time: expect.any(String),
            data: expect.objectContaining({
              actor: expect.objectContaining({
                type: 'User',
                id: '00000000-0000-0000-0000-000000000001',
              }),
              object: expect.objectContaining({
                type: 'User',
              }),
              audit: expect.objectContaining({
                http: expect.objectContaining({
                  method: 'PATCH',
                  statusCode: 200,
                }),
              }),
            }),
          }),
          attributes: {
            event_type: 'user.update',
            is_webhook_event: 'true',
          },
        });
        done();
      }, 100);

      // Act
      eventProcessorService.emit('api-request', mockEventData);
    });

    it('should NOT publish non-webhook events to message queue', (done) => {
      // Arrange
      const mockPublish = jest.fn();
      (getAdapterFactory as jest.Mock).mockReturnValue({
        getMessageQueueAdapter: jest.fn(() => ({ publish: mockPublish })),
        cleanup: jest.fn(),
      });

      (eventBatchWriterService.enqueue as jest.Mock).mockImplementation(() => {
        // Wait a bit to ensure publish isn't called
        setTimeout(() => {
          // Assert
          expect(mockPublish).not.toHaveBeenCalled();
          done();
        }, 50);
      });

      // Act
      eventProcessorService.emit('api-request', mockNonWebhookEventData);
    });

    it('should handle queue publish failures gracefully', (done) => {
      // Arrange
      const publishError = new Error('Queue unavailable');
      const mockPublish = jest.fn().mockRejectedValue(publishError);
      (getAdapterFactory as jest.Mock).mockReturnValue({
        getMessageQueueAdapter: jest.fn(() => ({ publish: mockPublish })),
        cleanup: jest.fn(),
      });

      // Wait for async processing
      setTimeout(() => {
        // Assert - should still enqueue to batch writer
        expect(eventBatchWriterService.enqueue).toHaveBeenCalledWith(mockEventData);
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to publish event to queue',
          expect.objectContaining({
            error: publishError,
            verb: 'user.update',
          })
        );
        done();
      }, 100);

      // Act
      eventProcessorService.emit('api-request', mockEventData);
    });

    it('should log warning when event received during shutdown', () => {
      // Arrange - Simulate shutdown on existing processor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalShutdownState = (eventProcessorService as any).isShuttingDown;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (eventProcessorService as any).isShuttingDown = true;

      // Act
      eventProcessorService.emit('api-request', mockEventData);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        'Event processor is shutting down, event may be lost',
        expect.objectContaining({
          verb: 'user.update',
        })
      );
      expect(eventBatchWriterService.enqueue).not.toHaveBeenCalled();

      // Cleanup - Restore state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (eventProcessorService as any).isShuttingDown = originalShutdownState;
    });
  });

  describe('shutdown()', () => {
    it('should flush batch writer on shutdown', async () => {
      // Arrange
      (eventBatchWriterService.shutdown as jest.Mock).mockResolvedValue(undefined);

      // Act
      await eventProcessorService.shutdown();

      // Assert
      expect(eventBatchWriterService.shutdown).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('Event processor shutting down');
    });

    it('should cleanup adapter factory on shutdown', async () => {
      // Arrange
      const mockCleanup = jest.fn().mockResolvedValue(undefined);
      (getAdapterFactory as jest.Mock).mockReturnValue({
        getMessageQueueAdapter: jest.fn(),
        cleanup: mockCleanup,
      });

      // Act
      await eventProcessorService.shutdown();

      // Assert
      expect(mockCleanup).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('Message queue adapter closed');
    });

    it('should handle adapter cleanup errors gracefully', async () => {
      // Arrange
      const cleanupError = new Error('Adapter cleanup failed');
      const mockCleanup = jest.fn().mockRejectedValue(cleanupError);
      (getAdapterFactory as jest.Mock).mockReturnValue({
        getMessageQueueAdapter: jest.fn(),
        cleanup: mockCleanup,
      });

      // Act
      await eventProcessorService.shutdown();

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Error closing message queue adapter',
        expect.objectContaining({ error: cleanupError })
      );
      expect(logger.info).toHaveBeenCalledWith('Event processor shutdown complete');
    });

    it('should remove all listeners on shutdown', async () => {
      // Act
      await eventProcessorService.shutdown();

      // Assert
      expect(eventProcessorService.listenerCount('api-request')).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return processor and batch writer statistics', () => {
      // Arrange
      (eventBatchWriterService.getStats as jest.Mock).mockReturnValue({
        bufferSize: 5,
        totalEnqueued: 100,
        totalWritten: 95,
      });

      // Act
      const stats = eventProcessorService.getStats();

      // Assert
      expect(stats).toEqual({
        isShuttingDown: expect.any(Boolean),
        batchWriterStats: {
          bufferSize: 5,
          totalEnqueued: 100,
          totalWritten: 95,
        },
      });
    });
  });
});
