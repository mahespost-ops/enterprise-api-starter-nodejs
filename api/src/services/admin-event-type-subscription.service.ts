/**
 * Admin Event Type Subscription Service
 * Business logic for admin event type subscription operations
 *
 * Separation of concerns:
 * - Read-only admin queries for subscription monitoring
 * - All database queries delegated to model static methods (no Op imports)
 * - Subscriptions are auto-managed by webhook service (no create/update/delete)
 */

import { EventTypeSubscription } from '../models/EventTypeSubscription.model';
import {
  SUBSCRIPTION_SORTABLE_FIELDS,
  SUBSCRIPTION_SEARCHABLE_FIELDS,
} from '../constants/webhook.constants';
import logger from '../config/logger';

/**
 * Filter options for listing event type subscriptions
 */
export interface ListEventTypeSubscriptionsFilters {
  eventTypeId?: string;
  eventTypeVerb?: string;
  webhookId?: string;
  webhookName?: string;
  webhookUrl?: string;
  isActive?: boolean;
  createdAt?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
    eq?: Date;
    ne?: Date;
  };
  updatedAt?: {
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
export interface ListEventTypeSubscriptionsOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListEventTypeSubscriptionsFilters;
}

class AdminEventTypeSubscriptionService {
  /**
   * List all event type subscriptions with filters, pagination, sorting, and search
   * Delegates all database logic to EventTypeSubscription model static method
   * @param options - Query options
   * @returns Paginated subscription list
   */
  async listEventTypeSubscriptions(
    options: ListEventTypeSubscriptionsOptions
  ): Promise<{ subscriptions: EventTypeSubscription[]; total: number }> {
    logger.debug('Admin: Listing event type subscriptions', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: subscriptions, count: total } = await EventTypeSubscription.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: SUBSCRIPTION_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: SUBSCRIPTION_SORTABLE_FIELDS as unknown as string[],
      fields,
    });

    logger.debug('Admin: Event type subscriptions retrieved', { count: subscriptions.length, total });

    return { subscriptions, total };
  }
}

export const adminEventTypeSubscriptionService = new AdminEventTypeSubscriptionService();
