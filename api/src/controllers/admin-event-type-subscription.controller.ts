/**
 * Admin Event Type Subscription Controller
 * Handles HTTP request/response for admin event type subscription operations
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
import {
  adminEventTypeSubscriptionService,
  ListEventTypeSubscriptionsFilters,
} from '../services/admin-event-type-subscription.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListEventTypeSubscriptionsFilters {
  const filters: ListEventTypeSubscriptionsFilters = {};

  // Parse eventTypeId
  if (query['filter[eventTypeId]']) {
    filters.eventTypeId = query['filter[eventTypeId]'] as string;
  }

  // Parse eventTypeVerb
  if (query['filter[eventTypeVerb]']) {
    filters.eventTypeVerb = query['filter[eventTypeVerb]'] as string;
  }

  // Parse webhookId
  if (query['filter[webhookId]']) {
    filters.webhookId = query['filter[webhookId]'] as string;
  }

  // Parse webhookName
  if (query['filter[webhookName]']) {
    filters.webhookName = query['filter[webhookName]'] as string;
  }

  // Parse webhookUrl
  if (query['filter[webhookUrl]']) {
    filters.webhookUrl = query['filter[webhookUrl]'] as string;
  }

  // Parse isActive
  if (query['filter[isActive]'] !== undefined) {
    filters.isActive =
      query['filter[isActive]'] === 'true' || query['filter[isActive]'] === true;
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

  return filters;
}

/**
 * @desc    List all event type subscriptions (admin)
 * @route   GET /api/v1/admin/event-type-subscriptions
 * @access  Private (admin:event-types:read)
 */
export const listEventTypeSubscriptions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('Admin: Listing event type subscriptions', { query: req.query });

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

    const { subscriptions, total } = await adminEventTypeSubscriptionService.listEventTypeSubscriptions({
      limit,
      offset,
      sort,
      search,
      fields,
      filters,
    });

    res.status(HTTP_STATUS.OK).json({
      data: subscriptions,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + subscriptions.length < total,
      },
    });
  }
);
