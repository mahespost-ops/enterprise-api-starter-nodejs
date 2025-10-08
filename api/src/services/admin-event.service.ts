/**
 * Admin Event Service
 *
 * Business logic for admin event management operations.
 * Per CLAUDE.md:
 * - Delegates ALL database operations to model static methods
 * - NO direct Op or sequelize imports (separation of concerns)
 * - Maintains field naming consistency (camelCase across all layers)
 * - Uses cursor pagination for high-volume scenarios (10M+ records)
 */

import { Event } from '../models/Event.model';
import { NotFoundError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import { EVENT_SORTABLE_FIELDS, EVENT_SEARCHABLE_FIELDS } from '../constants/event.constants';
import logger from '../config/logger';

/**
 * Filters for event list queries
 */
export interface ListEventsFilters {
  verb?: string;
  verbIn?: string[];
  actorType?: 'User' | 'System';
  actorId?: string;
  organizationId?: string;
  organizationIdIn?: string[];
  environmentId?: string;
  environmentIdIn?: string[];
  isWebhookEvent?: boolean;
  timestamp?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
    eq?: Date;
    ne?: Date;
  };
}

/**
 * Admin Event Service Class
 */
class AdminEventService {
  /**
   * List all events system-wide with cursor pagination
   */
  async listEvents(options: {
    limit?: number;
    cursor?: string;
    sort?: string;
    search?: string;
    fields?: string[];
    filters?: ListEventsFilters;
  }): Promise<{ data: Event[]; nextCursor: string | null; hasMore: boolean }> {
    logger.debug('Admin listing events', { options });

    const result = await Event.findWithFilters(options.filters || {}, {
      limit: options.limit,
      cursor: options.cursor,
      sort: options.sort,
      search: options.search,
      searchFields: EVENT_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: EVENT_SORTABLE_FIELDS as unknown as string[],
      fields: options.fields,
    });

    logger.info('Admin listed events', { count: result.data.length, hasMore: result.hasMore });
    return result;
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<Event> {
    logger.debug('Admin getting event by ID', { eventId });

    const event = await Event.findByPk(eventId);

    if (!event) {
      logger.warn('Event not found', { eventId });
      throw new NotFoundError(ERROR_MESSAGES.EVENT_NOT_FOUND);
    }

    logger.info('Admin retrieved event', { eventId });
    return event;
  }
}

export const adminEventService = new AdminEventService();
export default adminEventService;
