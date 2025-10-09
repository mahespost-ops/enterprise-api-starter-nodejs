/**
 * Admin Event Controller
 * Handles HTTP request/response for admin event management operations
 *
 * Per CLAUDE.md:
 * - Handle HTTP concerns (req/res)
 * - Extract params and delegate to service
 * - NO field name transformations (keep camelCase consistent)
 * - Uses cursor pagination for high-volume scenarios (10M+ records)
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import adminEventService, { ListEventsFilters } from '../services/admin-event.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListEventsFilters {
  const filters: ListEventsFilters = {};

  // Parse verb
  if (query['filter[verb]']) {
    filters.verb = query['filter[verb]'] as string;
  }

  // Parse verb[in] (comma-separated list)
  if (query['filter[verb][in]']) {
    const verbInStr = query['filter[verb][in]'] as string;
    filters.verbIn = verbInStr.split(',').map((v) => v.trim());
  }

  // Parse actorType
  if (query['filter[actorType]']) {
    filters.actorType = query['filter[actorType]'] as 'User' | 'System';
  }

  // Parse actorId
  if (query['filter[actorId]']) {
    filters.actorId = query['filter[actorId]'] as string;
  }

  // Parse organizationId
  if (query['filter[organizationId]']) {
    filters.organizationId = query['filter[organizationId]'] as string;
  }

  // Parse organizationId[in]
  if (query['filter[organizationId][in]']) {
    const orgInStr = query['filter[organizationId][in]'] as string;
    filters.organizationIdIn = orgInStr.split(',').map((id) => id.trim());
  }

  // Parse environmentId
  if (query['filter[environmentId]']) {
    filters.environmentId = query['filter[environmentId]'] as string;
  }

  // Parse environmentId[in]
  if (query['filter[environmentId][in]']) {
    const envInStr = query['filter[environmentId][in]'] as string;
    filters.environmentIdIn = envInStr.split(',').map((id) => id.trim());
  }

  // Parse isWebhookEvent
  if (query['filter[isWebhookEvent]'] !== undefined) {
    filters.isWebhookEvent = query['filter[isWebhookEvent]'] === 'true' || query['filter[isWebhookEvent]'] === true;
  }

  // Parse timestamp filters
  if (
    query['filter[timestamp][gte]'] ||
    query['filter[timestamp][lte]'] ||
    query['filter[timestamp][gt]'] ||
    query['filter[timestamp][lt]'] ||
    query['filter[timestamp][eq]'] ||
    query['filter[timestamp][ne]']
  ) {
    filters.timestamp = {};
    if (query['filter[timestamp][gte]']) filters.timestamp.gte = new Date(query['filter[timestamp][gte]'] as string);
    if (query['filter[timestamp][lte]']) filters.timestamp.lte = new Date(query['filter[timestamp][lte]'] as string);
    if (query['filter[timestamp][gt]']) filters.timestamp.gt = new Date(query['filter[timestamp][gt]'] as string);
    if (query['filter[timestamp][lt]']) filters.timestamp.lt = new Date(query['filter[timestamp][lt]'] as string);
    if (query['filter[timestamp][eq]']) filters.timestamp.eq = new Date(query['filter[timestamp][eq]'] as string);
    if (query['filter[timestamp][ne]']) filters.timestamp.ne = new Date(query['filter[timestamp][ne]'] as string);
  }

  return filters;
}

/**
 * @desc    List all events system-wide (cursor pagination)
 * @route   GET /api/v1/admin/events
 * @access  Private (admin:events:read)
 */
export const listEvents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin list events request', { query: req.query });

  // Extract query parameters
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const cursor = req.query.cursor as string | undefined;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;
  const fieldsParam = req.query.fields as string | undefined;
  const fields = fieldsParam ? fieldsParam.split(',').map((f) => f.trim()) : undefined;

  // Parse filters
  const filters = parseFilters(req.query as Record<string, unknown>);

  // Call service
  const result = await adminEventService.listEvents({
    limit,
    cursor,
    sort,
    search,
    fields,
    filters,
  });

  // Return response with cursor pagination
  res.status(HTTP_STATUS.OK).json({
    data: result.data,
    pagination: {
      limit: limit || 100,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    },
  });
});

/**
 * @desc    Get event details by ID
 * @route   GET /api/v1/admin/events/{eventId}
 * @access  Private (admin:events:read)
 */
export const getEvent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;

  logger.debug('Admin get event request', { eventId });

  const event = await adminEventService.getEventById(eventId);

  res.status(HTTP_STATUS.OK).json(event);
});
