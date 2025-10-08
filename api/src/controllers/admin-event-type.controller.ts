/**
 * Admin Event Type Controller
 * Handles HTTP request/response for admin event type management operations
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
import { adminEventTypeService, ListEventTypesFilters } from '../services/admin-event-type.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListEventTypesFilters {
  const filters: ListEventTypesFilters = {};

  // Parse verb (eq, in)
  if (query['filter[verb]']) {
    filters.verb = query['filter[verb]'] as string;
  } else if (query['filter[verb][in]']) {
    filters.verb = (query['filter[verb][in]'] as string).split(',');
  }

  // Parse httpMethod (eq, in)
  if (query['filter[httpMethod]']) {
    filters.httpMethod = query['filter[httpMethod]'] as string;
  } else if (query['filter[httpMethod][in]']) {
    filters.httpMethod = (query['filter[httpMethod][in]'] as string).split(',');
  }

  // Parse isWebhookEvent
  if (query['filter[isWebhookEvent]'] !== undefined) {
    filters.isWebhookEvent =
      query['filter[isWebhookEvent]'] === 'true' || query['filter[isWebhookEvent]'] === true;
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

  return filters;
}

/**
 * @desc    List all event types (admin)
 * @route   GET /api/v1/admin/event-types
 * @access  Private (admin:events:read)
 */
export const listEventTypes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Listing event types', { query: req.query });

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

  const { eventTypes, total } = await adminEventTypeService.listEventTypes({
    limit,
    offset,
    sort,
    search,
    fields,
    filters,
  });

  res.status(HTTP_STATUS.OK).json({
    data: eventTypes,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + eventTypes.length < total,
    },
  });
});

/**
 * @desc    Create event type (admin)
 * @route   POST /api/v1/admin/event-types
 * @access  Private (admin:events:manage)
 */
export const createEventType = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Creating event type', { body: req.body });

  const eventType = await adminEventTypeService.createEventType(req.body);

  res.status(HTTP_STATUS.CREATED).json(eventType);
});

/**
 * @desc    Get event type by ID (admin)
 * @route   GET /api/v1/admin/event-types/:eventTypeId
 * @access  Private (admin:events:read)
 */
export const getEventTypeById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { eventTypeId } = req.params;

  logger.debug(`Admin: Getting event type: ${eventTypeId}`);

  const eventType = await adminEventTypeService.getEventTypeById(eventTypeId);

  res.status(HTTP_STATUS.OK).json(eventType);
});

/**
 * @desc    Update event type (admin)
 * @route   PUT /api/v1/admin/event-types/:eventTypeId
 * @access  Private (admin:events:manage)
 */
export const updateEventType = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { eventTypeId } = req.params;

  logger.debug(`Admin: Updating event type: ${eventTypeId}`, { body: req.body });

  const eventType = await adminEventTypeService.updateEventType(eventTypeId, req.body);

  res.status(HTTP_STATUS.OK).json(eventType);
});

/**
 * @desc    Delete event type (admin)
 * @route   DELETE /api/v1/admin/event-types/:eventTypeId
 * @access  Private (admin:events:manage)
 */
export const deleteEventType = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { eventTypeId } = req.params;

  logger.debug(`Admin: Deleting event type: ${eventTypeId}`);

  await adminEventTypeService.deleteEventType(eventTypeId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
