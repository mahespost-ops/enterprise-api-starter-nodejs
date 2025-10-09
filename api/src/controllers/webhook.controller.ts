/**
 * Webhook Controller
 * Handles HTTP request/response for webhook-related operations
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import webhookService from '../services/webhook.service';
import logger from '../config/logger';

/**
 * @desc    List webhooks for an environment
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/webhooks
 * @access  Private (requires webhooks:read permission)
 */
export const listWebhooks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId } = req.params;
  const userId = req.user!.sub;
  const { limit, offset, search, fields } = req.query;

  logger.debug(`Listing webhooks for environment: ${envId}`);

  // Extract filters from query params
  const isActiveStr = req.query['filter[isActive]'] as string | undefined;
  const isActive = isActiveStr === 'true' ? true : isActiveStr === 'false' ? false : undefined;
  const authMethod = req.query['filter[authMethod]'] as string | undefined;

  const result = await webhookService.listWebhooks(orgId, envId, userId, {
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
    isActive,
    authMethod,
    search: search as string | undefined,
    fields: fields ? (fields as string).split(',') : undefined,
  });

  // Webhooks already transformed (authConfig masked)
  res.status(HTTP_STATUS.OK).json({
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * @desc    Create new webhook
 * @route   POST /api/v1/orgs/:orgId/envs/:envId/webhooks
 * @access  Private (requires webhooks:manage permission)
 */
export const createWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Creating webhook for environment: ${envId}`);

  const webhook = await webhookService.createWebhook(orgId, envId, userId, req.body);

  // Webhook already transformed (authConfig masked)
  res.status(HTTP_STATUS.CREATED).json(webhook);
});

/**
 * @desc    Get webhook details
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId
 * @access  Private (requires webhooks:read permission)
 */
export const getWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId, webhookId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Getting webhook: ${webhookId}`);

  const webhook = await webhookService.getWebhook(orgId, envId, webhookId, userId);

  // Webhook already transformed (authConfig masked)
  res.status(HTTP_STATUS.OK).json(webhook);
});

/**
 * @desc    Update webhook
 * @route   PUT /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId
 * @access  Private (requires webhooks:manage permission)
 */
export const updateWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId, webhookId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Updating webhook: ${webhookId}`);

  const webhook = await webhookService.updateWebhook(orgId, envId, webhookId, userId, req.body);

  // Webhook already transformed (authConfig masked)
  res.status(HTTP_STATUS.OK).json(webhook);
});

/**
 * @desc    Delete webhook
 * @route   DELETE /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId
 * @access  Private (requires webhooks:manage permission)
 */
export const deleteWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId, webhookId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Deleting webhook: ${webhookId}`);

  await webhookService.deleteWebhook(orgId, envId, webhookId, userId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});

/**
 * @desc    List webhook deliveries
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId/deliveries
 * @access  Private (requires webhooks:read permission)
 */
export const listWebhookDeliveries = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId, webhookId } = req.params;
  const userId = req.user!.sub;
  const { limit, offset } = req.query;

  logger.debug(`Listing deliveries for webhook: ${webhookId}`);

  // Extract filters from query params
  const status = req.query['filter[status]'] as 'pending' | 'success' | 'failed' | 'retrying' | undefined;

  const result = await webhookService.listDeliveries(orgId, envId, webhookId, userId, {
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
    status,
  });

  res.status(HTTP_STATUS.OK).json({
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * @desc    Get webhook delivery details
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId/deliveries/:deliveryId
 * @access  Private (requires webhooks:read permission)
 */
export const getWebhookDelivery = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId, webhookId, deliveryId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Getting delivery: ${deliveryId} for webhook: ${webhookId}`);

  const delivery = await webhookService.getDelivery(orgId, envId, webhookId, deliveryId, userId);

  res.status(HTTP_STATUS.OK).json(delivery);
});

/**
 * @desc    Retry failed webhook delivery
 * @route   POST /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId/deliveries/:deliveryId/retry
 * @access  Private (requires webhooks:manage permission)
 */
export const retryWebhookDelivery = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, envId, webhookId, deliveryId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Retrying delivery: ${deliveryId} for webhook: ${webhookId}`);

  const result = await webhookService.retryDelivery(orgId, envId, webhookId, deliveryId, userId);

  res.status(HTTP_STATUS.ACCEPTED).json(result);
});
