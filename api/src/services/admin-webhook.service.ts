/**
 * Admin Webhook Service
 * Business logic for admin webhook management operations
 *
 * Separation of concerns:
 * - Admin-specific webhook operations
 * - Manages EventTypeSubscription lifecycle (create, update, delete subscriptions)
 * - All database queries delegated to model static methods (no Op imports)
 */

import { Webhook } from '../models/Webhook.model';
import { Environment } from '../models/Environment.model';
import { EventTypeSubscription } from '../models/EventTypeSubscription.model';
import { WebhookDelivery } from '../models/WebhookDelivery.model';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import {
  WEBHOOK_SORTABLE_FIELDS,
  WEBHOOK_SEARCHABLE_FIELDS,
  WEBHOOK_AUTH_METHOD,
  WEBHOOK_DELIVERY_STATUS,
  type WebhookAuthMethod,
} from '../constants/webhook.constants';
import logger from '../config/logger';

/**
 * DTO for creating webhook
 * environmentId is optional - NULL creates a global webhook that applies to all environments
 */
export interface CreateWebhookDto {
  environmentId?: string | null;
  name: string;
  url: string;
  eventTypes: string[];
  authMethod?: WebhookAuthMethod;
  authConfig?: Record<string, unknown> | null;
  retryConfig?: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffSeconds: number;
  };
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
}

/**
 * DTO for updating webhook
 */
export interface UpdateWebhookDto {
  name?: string;
  url?: string;
  eventTypes?: string[];
  authMethod?: WebhookAuthMethod;
  authConfig?: Record<string, unknown> | null;
  retryConfig?: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffSeconds: number;
  };
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
}

/**
 * Filter options for listing webhooks
 */
export interface ListWebhooksFilters {
  environmentId?: string;
  isActive?: boolean;
  authMethod?: string;
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
  lastSuccessAt?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
    eq?: Date;
    ne?: Date;
  };
  lastFailureAt?: {
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
export interface ListWebhooksOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListWebhooksFilters;
}

class AdminWebhookService {
  /**
   * List all webhooks with filters, pagination, sorting, and search
   * Delegates all database logic to Webhook model static method
   * @param options - Query options
   * @returns Paginated webhook list
   */
  async listWebhooks(options: ListWebhooksOptions): Promise<{ webhooks: Webhook[]; total: number }> {
    logger.debug('Admin: Listing webhooks', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: webhooks, count: total } = await Webhook.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: WEBHOOK_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: WEBHOOK_SORTABLE_FIELDS as unknown as string[],
      fields,
    });

    logger.debug('Admin: Webhooks retrieved', { count: webhooks.length, total });

    return { webhooks, total };
  }

  /**
   * Get webhook by ID
   * @param webhookId - Webhook ID
   * @returns Webhook
   * @throws NotFoundError if webhook not found
   */
  async getWebhookById(webhookId: string): Promise<Webhook> {
    logger.debug('Admin: Getting webhook', { webhookId });

    const webhook = await Webhook.findByPk(webhookId);

    if (!webhook) {
      throw new NotFoundError(ERROR_MESSAGES.WEBHOOK_NOT_FOUND);
    }

    return webhook;
  }

  /**
   * Create new webhook
   * CRITICAL: Creates event_type_subscription records for fast event → webhook lookups
   * @param data - Webhook data
   * @returns Created webhook
   * @throws NotFoundError if environment not found
   */
  async createWebhook(data: CreateWebhookDto): Promise<Webhook> {
    logger.debug('Admin: Creating webhook', { environmentId: data.environmentId, name: data.name });

    // Verify environment exists (if specified)
    if (data.environmentId) {
      const environment = await Environment.findByPk(data.environmentId);
      if (!environment) {
        throw new NotFoundError(ERROR_MESSAGES.ENVIRONMENT_NOT_FOUND);
      }
    }

    // Create webhook
    const webhook = await Webhook.create({
      environmentId: data.environmentId ?? null,
      name: data.name,
      url: data.url,
      eventTypes: data.eventTypes,
      authMethod: data.authMethod ?? WEBHOOK_AUTH_METHOD.NONE,
      authConfig: data.authConfig ?? null,
      retryConfig: data.retryConfig ?? {
        maxAttempts: 5,
        backoffMultiplier: 2,
        maxBackoffSeconds: 3600,
      },
      isActive: data.isActive ?? true,
      metadata: data.metadata ?? null,
    });

    // Create event type subscriptions (denormalized reverse-lookup table)
    await EventTypeSubscription.createForWebhook(webhook.id, data.eventTypes, {
      name: webhook.name,
      url: webhook.url,
      authMethod: webhook.authMethod,
      authConfig: webhook.authConfig,
      retryConfig: webhook.retryConfig,
      metadata: webhook.metadata,
      isActive: webhook.isActive,
    });

    logger.info('Admin: Webhook created', { webhookId: webhook.id, name: webhook.name });

    return webhook;
  }

  /**
   * Update webhook
   * CRITICAL: Syncs event_type_subscription records when eventTypes or webhook fields change
   * @param webhookId - Webhook ID
   * @param data - Update data
   * @returns Updated webhook
   * @throws NotFoundError if webhook not found
   */
  async updateWebhook(webhookId: string, data: UpdateWebhookDto): Promise<Webhook> {
    logger.debug('Admin: Updating webhook', { webhookId, data });

    const webhook = await this.getWebhookById(webhookId);

    // Track if eventTypes changed (need to sync subscriptions)
    const eventTypesChanged = data.eventTypes && JSON.stringify(data.eventTypes) !== JSON.stringify(webhook.eventTypes);

    // Update webhook fields
    if (data.name !== undefined) {
      webhook.name = data.name;
    }

    if (data.url !== undefined) {
      webhook.url = data.url;
    }

    if (data.eventTypes !== undefined) {
      webhook.eventTypes = data.eventTypes;
    }

    if (data.authMethod !== undefined) {
      webhook.authMethod = data.authMethod;
    }

    if (data.authConfig !== undefined) {
      webhook.authConfig = data.authConfig;
    }

    if (data.retryConfig !== undefined) {
      webhook.retryConfig = { ...webhook.retryConfig, ...data.retryConfig };
    }

    if (data.isActive !== undefined) {
      webhook.isActive = data.isActive;
    }

    if (data.metadata !== undefined) {
      webhook.metadata = data.metadata;
    }

    await webhook.save();

    // Sync event_type_subscription records
    if (eventTypesChanged) {
      // Delete all existing subscriptions for this webhook
      const oldEventTypes = (await EventTypeSubscription.findByWebhookId(webhookId)).map(
        (sub) => sub.eventTypeVerb
      );
      if (oldEventTypes.length > 0) {
        await EventTypeSubscription.deleteForWebhookEventTypes(webhookId, oldEventTypes);
      }

      // Create new subscriptions
      await EventTypeSubscription.createForWebhook(webhookId, data.eventTypes!, {
        name: webhook.name,
        url: webhook.url,
        authMethod: webhook.authMethod,
        authConfig: webhook.authConfig,
        retryConfig: webhook.retryConfig,
        metadata: webhook.metadata,
        isActive: webhook.isActive,
      });
    } else {
      // Update denormalized fields in existing subscriptions
      const updates: Parameters<typeof EventTypeSubscription.updateWebhookFields>[1] = {};
      if (data.name !== undefined) updates.webhookName = data.name;
      if (data.url !== undefined) updates.webhookUrl = data.url;
      if (data.authMethod !== undefined) updates.webhookAuthMethod = data.authMethod;
      if (data.authConfig !== undefined) updates.webhookAuthConfig = data.authConfig;
      if (data.retryConfig !== undefined) updates.webhookRetryConfig = webhook.retryConfig;
      if (data.metadata !== undefined) updates.webhookMetadata = data.metadata;
      if (data.isActive !== undefined) updates.isActive = data.isActive;

      if (Object.keys(updates).length > 0) {
        await EventTypeSubscription.updateWebhookFields(webhookId, updates);
      }
    }

    logger.info('Admin: Webhook updated', { webhookId });

    return webhook;
  }

  /**
   * Delete webhook (soft delete)
   * Manually deletes EventTypeSubscription records (FK CASCADE doesn't fire on soft delete)
   * @param webhookId - Webhook ID
   * @throws NotFoundError if webhook not found
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    logger.debug('Admin: Deleting webhook', { webhookId });

    const webhook = await this.getWebhookById(webhookId);

    // Delete all subscriptions (hard delete since EventTypeSubscription isn't paranoid)
    // Must do this before soft-deleting webhook since FK CASCADE only fires on hard delete
    const eventTypes = webhook.eventTypes;
    if (eventTypes.length > 0) {
      await EventTypeSubscription.deleteForWebhookEventTypes(webhookId, eventTypes);
    }

    // Soft delete webhook
    await webhook.destroy();

    logger.info('Admin: Webhook deleted', { webhookId, name: webhook.name });
  }

  /**
   * Retry failed webhook delivery
   * @param deliveryId - Delivery ID
   * @returns Message indicating retry scheduled
   * @throws NotFoundError if delivery not found
   * @throws BadRequestError if delivery cannot be retried (not in failed status)
   */
  async retryDelivery(deliveryId: string): Promise<{ message: string }> {
    logger.debug('Admin: Retrying webhook delivery', { deliveryId });

    const delivery = await WebhookDelivery.findByPk(deliveryId);

    if (!delivery) {
      throw new NotFoundError(ERROR_MESSAGES.WEBHOOK_DELIVERY_NOT_FOUND);
    }

    // Can only retry failed deliveries
    if (delivery.status !== WEBHOOK_DELIVERY_STATUS.FAILED) {
      throw new BadRequestError(
        `Cannot retry delivery with status: ${delivery.status}. Only failed deliveries can be retried.`
      );
    }

    // Update delivery status to 'retrying' and schedule for immediate retry
    // In production, this would enqueue the delivery to a message queue (Pub/Sub, SQS, etc.)
    delivery.status = WEBHOOK_DELIVERY_STATUS.RETRYING;
    delivery.scheduledFor = new Date();
    delivery.nextRetryAt = new Date();
    await delivery.save();

    logger.info('Admin: Delivery scheduled for retry', { deliveryId });

    return {
      message: 'Delivery scheduled for retry',
    };
  }
}

export const adminWebhookService = new AdminWebhookService();
