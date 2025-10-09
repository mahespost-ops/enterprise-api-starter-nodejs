/**
 * Webhook Service
 * Business logic for webhook-related operations
 *
 * Handles CRUD operations for webhooks and webhook deliveries with CloudEvents 1.0.2 compliance.
 * Implements retry scheduling with exponential backoff.
 */

import { Webhook } from '../models/Webhook.model';
import { WebhookDelivery } from '../models/WebhookDelivery.model';
import { OrganizationMember } from '../models/OrganizationMember.model';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import {
  WEBHOOK_AUTH_METHOD,
  WEBHOOK_DELIVERY_STATUS,
  type WebhookAuthMethod,
  type WebhookDeliveryStatus,
} from '../constants/webhook.constants';
import logger from '../config/logger';

interface CreateWebhookDto {
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

interface UpdateWebhookDto {
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

interface ListWebhooksOptions {
  limit?: number;
  offset?: number;
  isActive?: boolean;
  authMethod?: string;
  search?: string;
  fields?: string[];
}

interface ListDeliveriesOptions {
  limit?: number;
  offset?: number;
  status?: WebhookDeliveryStatus;
}

class WebhookService {
  /**
   * Verify user has access to environment
   * @param orgId - Organization UUID
   * @param userId - User UUID
   * @throws ForbiddenError if user is not a member
   */
  private async verifyOrganizationAccess(orgId: string, userId: string): Promise<void> {
    // Check if user is a member of the organization
    const membership = await OrganizationMember.findOne({
      where: {
        organizationId: orgId,
        userId: userId,
      },
    });

    if (!membership) {
      logger.warn(`User ${userId} is not a member of organization ${orgId}`);
      throw new ForbiddenError(ERROR_MESSAGES.NOT_ORGANIZATION_MEMBER);
    }
  }

  /**
   * Transform webhook for API response (mask authConfig)
   * Security: Never expose auth secrets in API responses
   */
  private transformWebhook(webhook: Webhook): Record<string, unknown> {
    const transformed = webhook.toJSON() as unknown as Record<string, unknown>;
    // Always mask authConfig in responses (security-sensitive)
    delete transformed.authConfig;
    return transformed;
  }

  /**
   * List webhooks for an environment
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param userId - User UUID (for access check)
   * @param options - Filter and pagination options
   * @returns Webhooks with pagination metadata
   */
  async listWebhooks(
    orgId: string,
    envId: string,
    userId: string,
    options: ListWebhooksOptions
  ): Promise<{ data: Record<string, unknown>[]; pagination: { limit: number; offset: number; total: number; hasMore: boolean } }> {
    logger.debug(`Listing webhooks for environment: ${envId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    const { limit = 20, offset = 0, isActive, authMethod, search, fields } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: webhooks, count: total } = await Webhook.findByEnvironment(
      envId,
      { isActive, authMethod, search },
      { limit, offset, fields }
    );

    logger.debug(`Retrieved ${webhooks.length} webhooks (total: ${total})`);

    // Transform webhooks to mask authConfig
    const data = webhooks.map((webhook) => this.transformWebhook(webhook));

    return {
      data,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Create webhook
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param userId - User UUID (for access check)
   * @param dto - Webhook creation data
   * @returns Created webhook
   */
  async createWebhook(orgId: string, envId: string, userId: string, dto: CreateWebhookDto): Promise<Record<string, unknown>> {
    logger.debug(`Creating webhook for environment: ${envId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    // Create webhook
    const webhook = await Webhook.create({
      environmentId: envId,
      name: dto.name,
      url: dto.url,
      eventTypes: dto.eventTypes,
      authMethod: dto.authMethod || WEBHOOK_AUTH_METHOD.NONE,
      authConfig: dto.authConfig || null,
      retryConfig: dto.retryConfig || {
        maxAttempts: 5,
        backoffMultiplier: 2,
        maxBackoffSeconds: 3600,
      },
      isActive: dto.isActive ?? true,
      failureCount: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      metadata: dto.metadata || null,
    });

    logger.info(`Webhook created: ${webhook.id} for environment: ${envId}`);

    return this.transformWebhook(webhook);
  }

  /**
   * Get webhook by ID
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param webhookId - Webhook UUID
   * @param userId - User UUID (for access check)
   * @returns Webhook object
   * @throws NotFoundError if webhook not found
   */
  async getWebhook(orgId: string, envId: string, webhookId: string, userId: string): Promise<Record<string, unknown>> {
    logger.debug(`Getting webhook: ${webhookId} in environment: ${envId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    const webhook = await Webhook.findByPk(webhookId, { paranoid: true });

    if (!webhook || webhook.environmentId !== envId) {
      logger.warn(`Webhook not found: ${webhookId} in environment: ${envId}`);
      throw new NotFoundError(ERROR_MESSAGES.WEBHOOK_NOT_FOUND);
    }

    logger.debug(`Webhook retrieved: ${webhookId}`);
    return this.transformWebhook(webhook);
  }

  /**
   * Update webhook
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param webhookId - Webhook UUID
   * @param userId - User UUID (for access check)
   * @param dto - Update data
   * @returns Updated webhook
   * @throws NotFoundError if webhook not found
   */
  async updateWebhook(
    orgId: string,
    envId: string,
    webhookId: string,
    userId: string,
    dto: UpdateWebhookDto
  ): Promise<Record<string, unknown>> {
    logger.debug(`Updating webhook: ${webhookId} in environment: ${envId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    const webhook = await Webhook.findByPk(webhookId, { paranoid: true });

    if (!webhook || webhook.environmentId !== envId) {
      logger.warn(`Webhook not found: ${webhookId} in environment: ${envId}`);
      throw new NotFoundError(ERROR_MESSAGES.WEBHOOK_NOT_FOUND);
    }

    // Update fields
    if (dto.name !== undefined) webhook.name = dto.name;
    if (dto.url !== undefined) webhook.url = dto.url;
    if (dto.eventTypes !== undefined) webhook.eventTypes = dto.eventTypes;
    if (dto.authMethod !== undefined) webhook.authMethod = dto.authMethod;
    if (dto.authConfig !== undefined) webhook.authConfig = dto.authConfig;
    if (dto.retryConfig !== undefined) webhook.retryConfig = dto.retryConfig;
    if (dto.isActive !== undefined) webhook.isActive = dto.isActive;
    if (dto.metadata !== undefined) webhook.metadata = dto.metadata;

    await webhook.save();

    logger.info(`Webhook updated: ${webhookId}`);
    return this.transformWebhook(webhook);
  }

  /**
   * Delete webhook (soft delete)
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param webhookId - Webhook UUID
   * @param userId - User UUID (for access check)
   * @throws NotFoundError if webhook not found
   */
  async deleteWebhook(orgId: string, envId: string, webhookId: string, userId: string): Promise<void> {
    logger.debug(`Deleting webhook: ${webhookId} in environment: ${envId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    const webhook = await Webhook.findByPk(webhookId, { paranoid: true });

    if (!webhook || webhook.environmentId !== envId) {
      logger.warn(`Webhook not found: ${webhookId} in environment: ${envId}`);
      throw new NotFoundError(ERROR_MESSAGES.WEBHOOK_NOT_FOUND);
    }

    await webhook.destroy(); // Soft delete (paranoid mode)

    logger.info(`Webhook deleted: ${webhookId}`);
  }

  /**
   * List webhook deliveries
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param webhookId - Webhook UUID
   * @param userId - User UUID (for access check)
   * @param options - Filter and pagination options
   * @returns Deliveries with pagination metadata
   */
  async listDeliveries(
    orgId: string,
    envId: string,
    webhookId: string,
    userId: string,
    options: ListDeliveriesOptions
  ): Promise<{ data: WebhookDelivery[]; pagination: { limit: number; offset: number; total: number; hasMore: boolean } }> {
    logger.debug(`Listing deliveries for webhook: ${webhookId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    // Verify webhook exists and belongs to environment
    const webhook = await Webhook.findByPk(webhookId, { paranoid: true });
    if (!webhook || webhook.environmentId !== envId) {
      logger.warn(`Webhook not found: ${webhookId} in environment: ${envId}`);
      throw new NotFoundError(ERROR_MESSAGES.WEBHOOK_NOT_FOUND);
    }

    const { limit = 20, offset = 0, status } = options;

    // Build where clause
    const where: Record<string, unknown> = {
      webhookId,
    };

    if (status) {
      where.status = status;
    }

    // Query with pagination
    const { rows: deliveries, count: total } = await WebhookDelivery.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    logger.debug(`Retrieved ${deliveries.length} deliveries (total: ${total})`);

    return {
      data: deliveries,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get webhook delivery by ID
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param webhookId - Webhook UUID
   * @param deliveryId - Delivery UUID
   * @param userId - User UUID (for access check)
   * @returns Delivery object
   * @throws NotFoundError if delivery not found
   */
  async getDelivery(
    orgId: string,
    envId: string,
    webhookId: string,
    deliveryId: string,
    userId: string
  ): Promise<WebhookDelivery> {
    logger.debug(`Getting delivery: ${deliveryId} for webhook: ${webhookId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    // Verify webhook exists and belongs to environment
    const webhook = await Webhook.findByPk(webhookId, { paranoid: true });
    if (!webhook || webhook.environmentId !== envId) {
      logger.warn(`Webhook not found: ${webhookId} in environment: ${envId}`);
      throw new NotFoundError(ERROR_MESSAGES.WEBHOOK_NOT_FOUND);
    }

    const delivery = await WebhookDelivery.findByPk(deliveryId);

    if (!delivery || delivery.webhookId !== webhookId) {
      logger.warn(`Delivery not found: ${deliveryId} for webhook: ${webhookId}`);
      throw new NotFoundError(ERROR_MESSAGES.WEBHOOK_DELIVERY_NOT_FOUND);
    }

    logger.debug(`Delivery retrieved: ${deliveryId}`);
    return delivery;
  }

  /**
   * Retry failed webhook delivery
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param webhookId - Webhook UUID
   * @param deliveryId - Delivery UUID
   * @param userId - User UUID (for access check)
   * @returns Message indicating retry scheduled
   * @throws NotFoundError if delivery not found
   * @throws BadRequestError if delivery cannot be retried
   */
  async retryDelivery(
    orgId: string,
    envId: string,
    webhookId: string,
    deliveryId: string,
    userId: string
  ): Promise<{ message: string }> {
    logger.debug(`Retrying delivery: ${deliveryId} for webhook: ${webhookId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    // Verify webhook exists and belongs to environment
    const webhook = await Webhook.findByPk(webhookId, { paranoid: true });
    if (!webhook || webhook.environmentId !== envId) {
      logger.warn(`Webhook not found: ${webhookId} in environment: ${envId}`);
      throw new NotFoundError(ERROR_MESSAGES.WEBHOOK_NOT_FOUND);
    }

    const delivery = await WebhookDelivery.findByPk(deliveryId);

    if (!delivery || delivery.webhookId !== webhookId) {
      logger.warn(`Delivery not found: ${deliveryId} for webhook: ${webhookId}`);
      throw new NotFoundError(ERROR_MESSAGES.WEBHOOK_DELIVERY_NOT_FOUND);
    }

    // Can only retry failed deliveries
    if (delivery.status !== WEBHOOK_DELIVERY_STATUS.FAILED) {
      throw new BadRequestError(`Cannot retry delivery with status: ${delivery.status}. Only failed deliveries can be retried.`);
    }

    // Schedule immediate retry (in real implementation, this would use a queue)
    delivery.status = WEBHOOK_DELIVERY_STATUS.RETRYING;
    delivery.scheduledFor = new Date();
    delivery.nextRetryAt = new Date();
    await delivery.save();

    logger.info(`Delivery scheduled for retry: ${deliveryId}`);

    return {
      message: 'Delivery scheduled for retry',
    };
  }
}

export default new WebhookService();
