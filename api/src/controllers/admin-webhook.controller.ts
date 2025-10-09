/**
 * Admin Webhook Controller
 * Handles HTTP request/response for admin webhook management operations
 *
 * Per CLAUDE.md:
 * - Handle HTTP concerns (req/res)
 * - Extract params and delegate to service
 * - NO field name transformations (keep camelCase consistent)
 * - Format response with pagination info
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import { adminWebhookService, ListWebhooksFilters } from '../services/admin-webhook.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListWebhooksFilters {
  const filters: ListWebhooksFilters = {};

  // Parse environmentId
  if (query['filter[environmentId]']) {
    filters.environmentId = query['filter[environmentId]'] as string;
  }

  // Parse isActive
  if (query['filter[isActive]'] !== undefined) {
    filters.isActive =
      query['filter[isActive]'] === 'true' || query['filter[isActive]'] === true;
  }

  // Parse authMethod
  if (query['filter[authMethod]']) {
    filters.authMethod = query['filter[authMethod]'] as string;
  }

  // Parse createdAt filters
  if (
    query['filter[createdAt][gte]'] ||
    query['filter[createdAt][lte]'] ||
    query['filter[createdAt][gt]'] ||
    query['filter[createdAt][lt]'] ||
    query['filter[createdAt][eq]'] ||
    query['filter[createdAt][ne]']
  ) {
    filters.createdAt = {};
    if (query['filter[createdAt][gte]'])
      filters.createdAt.gte = new Date(query['filter[createdAt][gte]'] as string);
    if (query['filter[createdAt][lte]'])
      filters.createdAt.lte = new Date(query['filter[createdAt][lte]'] as string);
    if (query['filter[createdAt][gt]'])
      filters.createdAt.gt = new Date(query['filter[createdAt][gt]'] as string);
    if (query['filter[createdAt][lt]'])
      filters.createdAt.lt = new Date(query['filter[createdAt][lt]'] as string);
    if (query['filter[createdAt][eq]'])
      filters.createdAt.eq = new Date(query['filter[createdAt][eq]'] as string);
    if (query['filter[createdAt][ne]'])
      filters.createdAt.ne = new Date(query['filter[createdAt][ne]'] as string);
  }

  // Parse updatedAt filters
  if (
    query['filter[updatedAt][gte]'] ||
    query['filter[updatedAt][lte]'] ||
    query['filter[updatedAt][gt]'] ||
    query['filter[updatedAt][lt]'] ||
    query['filter[updatedAt][eq]'] ||
    query['filter[updatedAt][ne]']
  ) {
    filters.updatedAt = {};
    if (query['filter[updatedAt][gte]'])
      filters.updatedAt.gte = new Date(query['filter[updatedAt][gte]'] as string);
    if (query['filter[updatedAt][lte]'])
      filters.updatedAt.lte = new Date(query['filter[updatedAt][lte]'] as string);
    if (query['filter[updatedAt][gt]'])
      filters.updatedAt.gt = new Date(query['filter[updatedAt][gt]'] as string);
    if (query['filter[updatedAt][lt]'])
      filters.updatedAt.lt = new Date(query['filter[updatedAt][lt]'] as string);
    if (query['filter[updatedAt][eq]'])
      filters.updatedAt.eq = new Date(query['filter[updatedAt][eq]'] as string);
    if (query['filter[updatedAt][ne]'])
      filters.updatedAt.ne = new Date(query['filter[updatedAt][ne]'] as string);
  }

  // Parse lastSuccessAt filters
  if (
    query['filter[lastSuccessAt][gte]'] ||
    query['filter[lastSuccessAt][lte]'] ||
    query['filter[lastSuccessAt][gt]'] ||
    query['filter[lastSuccessAt][lt]'] ||
    query['filter[lastSuccessAt][eq]'] ||
    query['filter[lastSuccessAt][ne]']
  ) {
    filters.lastSuccessAt = {};
    if (query['filter[lastSuccessAt][gte]'])
      filters.lastSuccessAt.gte = new Date(query['filter[lastSuccessAt][gte]'] as string);
    if (query['filter[lastSuccessAt][lte]'])
      filters.lastSuccessAt.lte = new Date(query['filter[lastSuccessAt][lte]'] as string);
    if (query['filter[lastSuccessAt][gt]'])
      filters.lastSuccessAt.gt = new Date(query['filter[lastSuccessAt][gt]'] as string);
    if (query['filter[lastSuccessAt][lt]'])
      filters.lastSuccessAt.lt = new Date(query['filter[lastSuccessAt][lt]'] as string);
    if (query['filter[lastSuccessAt][eq]'])
      filters.lastSuccessAt.eq = new Date(query['filter[lastSuccessAt][eq]'] as string);
    if (query['filter[lastSuccessAt][ne]'])
      filters.lastSuccessAt.ne = new Date(query['filter[lastSuccessAt][ne]'] as string);
  }

  // Parse lastFailureAt filters
  if (
    query['filter[lastFailureAt][gte]'] ||
    query['filter[lastFailureAt][lte]'] ||
    query['filter[lastFailureAt][gt]'] ||
    query['filter[lastFailureAt][lt]'] ||
    query['filter[lastFailureAt][eq]'] ||
    query['filter[lastFailureAt][ne]']
  ) {
    filters.lastFailureAt = {};
    if (query['filter[lastFailureAt][gte]'])
      filters.lastFailureAt.gte = new Date(query['filter[lastFailureAt][gte]'] as string);
    if (query['filter[lastFailureAt][lte]'])
      filters.lastFailureAt.lte = new Date(query['filter[lastFailureAt][lte]'] as string);
    if (query['filter[lastFailureAt][gt]'])
      filters.lastFailureAt.gt = new Date(query['filter[lastFailureAt][gt]'] as string);
    if (query['filter[lastFailureAt][lt]'])
      filters.lastFailureAt.lt = new Date(query['filter[lastFailureAt][lt]'] as string);
    if (query['filter[lastFailureAt][eq]'])
      filters.lastFailureAt.eq = new Date(query['filter[lastFailureAt][eq]'] as string);
    if (query['filter[lastFailureAt][ne]'])
      filters.lastFailureAt.ne = new Date(query['filter[lastFailureAt][ne]'] as string);
  }

  return filters;
}

/**
 * @desc    List all webhooks (admin)
 * @route   GET /api/v1/admin/webhooks
 * @access  Private (admin:webhooks:read)
 */
export const listWebhooks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Listing webhooks', { query: req.query });

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;

  // Parse field selection
  let fields: string[] | undefined;
  if (req.query.fields) {
    fields = (req.query.fields as string).split(',');
  }

  const filters = parseFilters(req.query);

  const { webhooks, total } = await adminWebhookService.listWebhooks({
    limit,
    offset,
    sort,
    search,
    fields,
    filters,
  });

  res.status(HTTP_STATUS.OK).json({
    data: webhooks,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + webhooks.length < total,
    },
  });
});

/**
 * @desc    Create webhook (admin)
 * @route   POST /api/v1/admin/webhooks
 * @access  Private (admin:webhooks:manage)
 */
export const createWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Creating webhook', { body: req.body });

  const webhook = await adminWebhookService.createWebhook(req.body);

  res.status(HTTP_STATUS.CREATED).json(webhook);
});

/**
 * @desc    Get webhook by ID (admin)
 * @route   GET /api/v1/admin/webhooks/:webhookId
 * @access  Private (admin:webhooks:read)
 */
export const getWebhookById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { webhookId } = req.params;

  logger.debug(`Admin: Getting webhook: ${webhookId}`);

  const webhook = await adminWebhookService.getWebhookById(webhookId);

  res.status(HTTP_STATUS.OK).json(webhook);
});

/**
 * @desc    Update webhook (admin)
 * @route   PUT /api/v1/admin/webhooks/:webhookId
 * @access  Private (admin:webhooks:manage)
 */
export const updateWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { webhookId } = req.params;

  logger.debug(`Admin: Updating webhook: ${webhookId}`, { body: req.body });

  const webhook = await adminWebhookService.updateWebhook(webhookId, req.body);

  res.status(HTTP_STATUS.OK).json(webhook);
});

/**
 * @desc    Delete webhook (admin)
 * @route   DELETE /api/v1/admin/webhooks/:webhookId
 * @access  Private (admin:webhooks:manage)
 */
export const deleteWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { webhookId } = req.params;

  logger.debug(`Admin: Deleting webhook: ${webhookId}`);

  await adminWebhookService.deleteWebhook(webhookId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
