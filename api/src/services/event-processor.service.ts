/**
 * Event Processor Service
 *
 * Orchestrates parallel event processing using EventEmitter pattern.
 *
 * Features:
 * - Non-blocking event processing with setImmediate()
 * - Dual streams: Database writes + Message queue (webhooks only)
 * - CloudEvents 1.0.2 formatting for webhooks
 * - Graceful shutdown with pending event flush
 *
 * Event Flow:
 * HTTP Response → emit('api-request') → setImmediate() → [DB + Queue]
 */

import { EventEmitter } from 'events';
import { eventBatchWriterService } from './event-batch-writer.service';
import { getAdapterFactory } from './adapter.factory';
import logger from '../config/logger';
import type { EventData } from '../types/event.types';
import { toCloudEvent } from '../utils/event.helpers';

/**
 * EventProcessorService Class
 * Extends EventEmitter for event-driven architecture
 */
class EventProcessorService extends EventEmitter {
  private isShuttingDown = false;

  constructor() {
    super();

    // Register listener for 'api-request' events
    this.on('api-request', this.processEvent.bind(this));

    logger.debug('EventProcessorService initialized');
  }

  /**
   * Process event asynchronously (non-blocking)
   * Separates database writes from webhook publishing
   */
  private processEvent(eventData: EventData): void {
    if (this.isShuttingDown) {
      logger.warn('Event processor is shutting down, event may be lost', {
        verb: eventData.eventType.verb,
      });
      return;
    }

    // Use setImmediate for non-blocking async processing
    setImmediate(async () => {
      try {
        // Stream A: Always enqueue to batch writer (database)
        eventBatchWriterService.enqueue(eventData);

        // Stream B: Publish to message queue (webhook events only)
        if (eventData.eventType.isWebhookEvent) {
          await this.publishToQueue(eventData);
        }
      } catch (error) {
        logger.error('Event processing failed', {
          error,
          verb: eventData.eventType.verb,
        });
        // Error handling: Event already in batch writer queue
        // If queue publish fails, retry logic is handled in adapter
      }
    });
  }

  /**
   * Publish CloudEvents-formatted event to message queue
   * Only called for webhook-enabled event types
   */
  private async publishToQueue(eventData: EventData): Promise<void> {
    try {
      const cloudEvent = toCloudEvent(eventData);

      // Get message queue adapter from factory
      const adapterFactory = getAdapterFactory();
      const messageQueue = adapterFactory.getMessageQueueAdapter();

      // Publish to topic/queue
      const topic = `events.${eventData.eventType.verb}`;
      await messageQueue.publish({
        topic,
        data: cloudEvent,
        attributes: {
          event_type: eventData.eventType.verb,
          is_webhook_event: String(eventData.eventType.isWebhookEvent),
        },
      });

      logger.debug('CloudEvent published to queue', {
        verb: eventData.eventType.verb,
        topic,
        eventId: cloudEvent.id,
      });
    } catch (error) {
      logger.error('Failed to publish event to queue', {
        error,
        verb: eventData.eventType.verb,
      });

      // Fallback: Write to emergency buffer (future enhancement)
      // For now, event is still captured in database via batch writer
      await this.writeToEmergencyBuffer(eventData);
    }
  }

  /**
   * Emergency buffer for failed queue publishes
   * Future enhancement: Could write to dead-letter queue or retry queue
   */
  private async writeToEmergencyBuffer(eventData: EventData): Promise<void> {
    logger.warn('Writing event to emergency buffer (queue publish failed)', {
      verb: eventData.eventType.verb,
    });

    // TODO: Implement emergency buffer logic
    // Options:
    // 1. Write to separate file for manual retry
    // 2. Write to dead-letter queue
    // 3. Store in database table for background retry worker

    // For now, just log - event is still in database
  }

  /**
   * Graceful shutdown: Flush pending events
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    logger.info('Event processor shutting down');

    // Remove all listeners to prevent new events
    this.removeAllListeners('api-request');

    // Flush batch writer (waits for pending DB writes)
    await eventBatchWriterService.shutdown();

    // Close message queue adapter
    try {
      const adapterFactory = getAdapterFactory();
      await adapterFactory.cleanup();
      logger.info('Message queue adapter closed');
    } catch (error) {
      logger.error('Error closing message queue adapter', { error });
    }

    logger.info('Event processor shutdown complete');
  }

  /**
   * Get processor statistics
   */
  getStats(): {
    isShuttingDown: boolean;
    batchWriterStats: ReturnType<typeof eventBatchWriterService.getStats>;
  } {
    return {
      isShuttingDown: this.isShuttingDown,
      batchWriterStats: eventBatchWriterService.getStats(),
    };
  }
}

// Export singleton instance
export const eventProcessorService = new EventProcessorService();
export default eventProcessorService;
