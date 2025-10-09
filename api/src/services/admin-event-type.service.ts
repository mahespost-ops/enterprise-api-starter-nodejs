/**
 * Admin Event Type Service
 * Business logic for admin event type management operations
 *
 * Separation of concerns:
 * - Admin-specific event type operations
 * - All database queries delegated to model static methods (no Op imports)
 */

import { EventType } from '../models/EventType.model';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import {
  EVENT_TYPE_SORTABLE_FIELDS,
  EVENT_TYPE_SEARCHABLE_FIELDS,
} from '../constants/event-type.constants';
import logger from '../config/logger';

/**
 * DTO for creating event type
 */
export interface CreateEventTypeDto {
  verb: string;
  httpMethod: string;
  httpPath: string;
  description?: string | null;
  isWebhookEvent?: boolean;
}

/**
 * DTO for updating event type
 * Note: verb cannot be changed once created
 */
export interface UpdateEventTypeDto {
  httpMethod?: string;
  httpPath?: string;
  description?: string | null;
  isWebhookEvent?: boolean;
}

/**
 * Filter options for listing event types
 */
export interface ListEventTypesFilters {
  verb?: string | string[];
  httpMethod?: string | string[];
  isWebhookEvent?: boolean;
  createdAt?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
    eq?: Date;
    ne?: Date;
  };
}

/**
 * Pagination and query options for list
 */
export interface ListEventTypesOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListEventTypesFilters;
}

class AdminEventTypeService {
  /**
   * List all event types with filters, pagination, sorting, and search
   * Delegates all database logic to EventType model static method
   * @param options - Query options
   * @returns Paginated event type list
   */
  async listEventTypes(options: ListEventTypesOptions): Promise<{ eventTypes: EventType[]; total: number }> {
    logger.debug('Admin: Listing event types', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: eventTypes, count: total } = await EventType.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: EVENT_TYPE_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: EVENT_TYPE_SORTABLE_FIELDS as unknown as string[],
      fields,
    });

    logger.debug('Admin: Event types retrieved', { count: eventTypes.length, total });

    return { eventTypes, total };
  }

  /**
   * Get event type by ID
   * @param eventTypeId - Event type ID
   * @returns Event type
   * @throws NotFoundError if event type not found
   */
  async getEventTypeById(eventTypeId: string): Promise<EventType> {
    logger.debug('Admin: Getting event type', { eventTypeId });

    const eventType = await EventType.findByPk(eventTypeId);

    if (!eventType) {
      throw new NotFoundError(ERROR_MESSAGES.EVENT_TYPE_NOT_FOUND);
    }

    return eventType;
  }

  /**
   * Create new event type
   * @param data - Event type data
   * @returns Created event type
   * @throws ConflictError if event type verb already exists
   */
  async createEventType(data: CreateEventTypeDto): Promise<EventType> {
    logger.debug('Admin: Creating event type', { verb: data.verb });

    // Check if verb already exists
    const existing = await EventType.findOne({ where: { verb: data.verb } });
    if (existing) {
      throw new ConflictError(ERROR_MESSAGES.EVENT_TYPE_VERB_EXISTS);
    }

    // Create event type
    const eventType = await EventType.create({
      verb: data.verb,
      httpMethod: data.httpMethod,
      httpPath: data.httpPath,
      description: data.description ?? null,
      isWebhookEvent: data.isWebhookEvent ?? false,
    });

    logger.info('Admin: Event type created', { eventTypeId: eventType.id, verb: eventType.verb });

    return eventType;
  }

  /**
   * Update event type
   * @param eventTypeId - Event type ID
   * @param data - Update data
   * @returns Updated event type
   * @throws NotFoundError if event type not found
   */
  async updateEventType(eventTypeId: string, data: UpdateEventTypeDto): Promise<EventType> {
    logger.debug('Admin: Updating event type', { eventTypeId, data });

    const eventType = await this.getEventTypeById(eventTypeId);

    // Update fields
    if (data.httpMethod !== undefined) {
      eventType.httpMethod = data.httpMethod;
    }

    if (data.httpPath !== undefined) {
      eventType.httpPath = data.httpPath;
    }

    if (data.description !== undefined) {
      eventType.description = data.description;
    }

    if (data.isWebhookEvent !== undefined) {
      eventType.isWebhookEvent = data.isWebhookEvent;
    }

    await eventType.save();

    logger.info('Admin: Event type updated', { eventTypeId });

    return eventType;
  }

  /**
   * Delete event type
   * @param eventTypeId - Event type ID
   * @throws NotFoundError if event type not found
   */
  async deleteEventType(eventTypeId: string): Promise<void> {
    logger.debug('Admin: Deleting event type', { eventTypeId });

    const eventType = await this.getEventTypeById(eventTypeId);

    await eventType.destroy();

    logger.info('Admin: Event type deleted', { eventTypeId, verb: eventType.verb });
  }
}

export const adminEventTypeService = new AdminEventTypeService();
