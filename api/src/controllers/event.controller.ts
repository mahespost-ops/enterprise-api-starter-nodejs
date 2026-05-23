/**
 * Event Controller
 * Handles HTTP request/response for event-related operations
 *
 * Events are read-only system logs with cursor pagination for high-volume queries.
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import eventService from '../services/event.service';
import logger from '../config/logger';

/**
 * @desc    List events for an environment (cursor pagination)
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/events
 * @access  Private (requires events:read permission)
 */
export const listEvents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  const envId = req.params.envId as string;
  const userId = req.user!.sub;
  const { limit, cursor, fields } = req.query;

  logger.debug(`Listing events for environment: ${envId}`);

  // Extract filters from query params
  const verb = req.query['filter[verb]'] as string | undefined;
  const actorType = req.query['filter[actorType]'] as 'User' | 'System' | undefined;
  const isWebhookEventStr = req.query['filter[isWebhookEvent]'] as string | undefined;
  const webhookOnly = isWebhookEventStr === 'true' ? true : undefined;

  const result = await eventService.listEvents(orgId, envId, userId, {
    limit: limit ? Number(limit) : undefined,
    cursor: cursor as string | undefined,
    verb,
    actorType,
    webhookOnly,
    fields: fields ? (fields as string).split(',') : undefined,
  });

  // Events are already in camelCase from model (no transformation needed)
  res.status(HTTP_STATUS.OK).json({
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * @desc    Get event details
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/events/:eventId
 * @access  Private (requires events:read permission)
 */
export const getEvent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  
  const orgId = req.params.orgId as string;
  const envId = req.params.envId as string;
  const eventId = req.params.eventId as string;
  const userId = req.user!.sub;

  logger.debug(`Getting event: ${eventId}`);

  const event = await eventService.getEvent(orgId, envId, eventId, userId);

  // Event is already in camelCase from model (no transformation needed)
  res.status(HTTP_STATUS.OK).json(event);
});
