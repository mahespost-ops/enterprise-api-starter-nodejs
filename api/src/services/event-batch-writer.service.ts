/**
 * Event Batch Writer Service
 *
 * Batches event writes to database for performance optimization.
 *
 * Features:
 * - Batched database writes (100 events or 50ms interval)
 * - Bulk insert with fallback to individual writes
 * - Write-Ahead Log (WAL) for crash recovery
 * - Graceful shutdown with pending event flush
 *
 * Performance targets:
 * - Reduces DB queries by 100x (1 query per 100 events)
 * - <100ms batch write latency
 * - Zero event loss via WAL
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import Event from '../models/Event.model';
import { eventConfig } from '../config/event.config';
import logger from '../config/logger';
import type { EventData, WALEntry } from '../types/event.types';
import { buildActor, buildObject, buildAudit, buildDescription } from '../utils/event.helpers';

/**
 * EventBatchWriterService Class
 * Singleton pattern for managing batched event writes
 */
class EventBatchWriterService {
  private buffer: EventData[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private walPath: string;

  constructor() {
    this.walPath = path.resolve(eventConfig.walPath);
    this.ensureDataDirectory();
  }

  /**
   * Ensure data directory exists for WAL file
   */
  private async ensureDataDirectory(): Promise<void> {
    const dir = path.dirname(this.walPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create WAL directory', { error, dir });
    }
  }

  /**
   * Enqueue event data to buffer for batched write
   * Triggers flush if batch size reached
   */
  enqueue(eventData: EventData): void {
    if (this.isShuttingDown) {
      logger.warn('Event batch writer is shutting down, writing to WAL', {
        verb: eventData.eventType.verb,
      });
      void this.writeToWAL(eventData);
      return;
    }

    this.buffer.push(eventData);
    logger.debug('Event enqueued to batch writer', {
      verb: eventData.eventType.verb,
      bufferSize: this.buffer.length,
    });

    // Flush on size threshold
    if (this.buffer.length >= eventConfig.batchSize) {
      logger.debug('Batch size threshold reached, flushing', {
        bufferSize: this.buffer.length,
      });
      void this.flush();
      return;
    }

    // Schedule timer-based flush if not already scheduled
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        void this.flush();
      }, eventConfig.flushIntervalMs);
    }
  }

  /**
   * Flush pending events to database
   * Uses bulk insert with fallback to individual writes
   */
  async flush(): Promise<void> {
    // Clear timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Empty buffer check
    if (this.buffer.length === 0) {
      return;
    }

    // Extract batch and clear buffer
    const batch = this.buffer.splice(0, this.buffer.length);

    logger.debug('Flushing event batch to database', {
      batchSize: batch.length,
    });

    try {
      await this.bulkInsertEvents(batch);
      logger.debug('Event batch flushed successfully', {
        count: batch.length,
      });
    } catch (error) {
      logger.error('Bulk insert failed, falling back to individual writes', {
        error,
        batchSize: batch.length,
      });
      await this.fallbackIndividualWrites(batch);
    }
  }

  /**
   * Bulk insert events to database
   */
  private async bulkInsertEvents(batch: EventData[]): Promise<void> {
    const events = batch.map((data) => ({
      id: uuidv4(),
      environmentId: data.context.envId ?? '',
      verb: data.eventType.verb,
      actorType: (data.context.userId ? 'User' : 'System') as 'User' | 'System',
      actor: buildActor(data.context),
      object: buildObject(data.request),
      target: null, // Future enhancement for secondary resources
      audit: buildAudit(data.request, data.response, data.context.requestId),
      description: buildDescription(data),
      timestamp: new Date(),
      organizationId: data.context.orgId ?? '',
      organizationName: data.context.orgName ?? '',
      environmentName: data.context.envName ?? '',
      isWebhookEvent: data.eventType.isWebhookEvent,
    }));

    await Event.bulkCreate(events, { validate: true });
  }

  /**
   * Fallback: Write events individually if bulk insert fails
   * Write to WAL if individual write also fails
   */
  private async fallbackIndividualWrites(batch: EventData[]): Promise<void> {
    for (const eventData of batch) {
      try {
        await Event.create({
          id: uuidv4(),
          environmentId: eventData.context.envId ?? '',
          verb: eventData.eventType.verb,
          actorType: (eventData.context.userId ? 'User' : 'System') as 'User' | 'System',
          actor: buildActor(eventData.context),
          object: buildObject(eventData.request),
          target: null,
          audit: buildAudit(eventData.request, eventData.response, eventData.context.requestId),
          description: buildDescription(eventData),
          timestamp: new Date(),
          organizationId: eventData.context.orgId ?? '',
          organizationName: eventData.context.orgName,
          environmentName: eventData.context.envName,
          isWebhookEvent: eventData.eventType.isWebhookEvent,
        });
      } catch (error) {
        logger.error('Individual event write failed, writing to WAL', {
          error,
          verb: eventData.eventType.verb,
        });
        await this.writeToWAL(eventData);
      }
    }
  }

  /**
   * Write event to Write-Ahead Log for crash recovery
   * Appends JSONL format
   */
  private async writeToWAL(eventData: EventData): Promise<void> {
    if (!eventConfig.enableWAL) {
      logger.warn('WAL disabled, event will be lost', {
        verb: eventData.eventType.verb,
      });
      return;
    }

    const walEntry: WALEntry = {
      timestamp: new Date().toISOString(),
      eventData,
      retries: 0,
    };

    try {
      await fs.appendFile(this.walPath, JSON.stringify(walEntry) + '\n');
      logger.info('Event written to WAL', {
        verb: eventData.eventType.verb,
        walPath: this.walPath,
      });
    } catch (error) {
      logger.error('Failed to write to WAL', {
        error,
        verb: eventData.eventType.verb,
      });
    }
  }

  /**
   * Graceful shutdown: Flush pending events
   * Waits for buffer to empty before resolving
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    logger.info('Event batch writer shutting down', {
      pendingEvents: this.buffer.length,
    });

    await this.flush();

    logger.info('Event batch writer shutdown complete');
  }

  /**
   * Get current buffer statistics
   * Useful for monitoring and debugging
   */
  getStats(): { bufferSize: number; isShuttingDown: boolean } {
    return {
      bufferSize: this.buffer.length,
      isShuttingDown: this.isShuttingDown,
    };
  }
}

// Export singleton instance
export const eventBatchWriterService = new EventBatchWriterService();
export default eventBatchWriterService;
