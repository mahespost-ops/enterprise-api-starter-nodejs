/**
 * Admin Impersonation Controller
 * Handles HTTP request/response for admin impersonation management operations
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
import adminImpersonationService, {
  ListImpersonationSessionsFilters,
} from '../services/admin-impersonation.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListImpersonationSessionsFilters {
  const filters: ListImpersonationSessionsFilters = {};

  // Parse originalUserId
  if (query['filter[originalUserId]']) {
    filters.originalUserId = query['filter[originalUserId]'] as string;
  }

  // Parse impersonatedUserId
  if (query['filter[impersonatedUserId]']) {
    filters.impersonatedUserId = query['filter[impersonatedUserId]'] as string;
  }

  // Parse environmentId
  if (query['filter[environmentId]']) {
    filters.environmentId = query['filter[environmentId]'] as string;
  }

  // Parse impersonationType
  if (query['filter[impersonationType]']) {
    filters.impersonationType = query['filter[impersonationType]'] as 'system' | 'organization';
  }

  // Parse isActive
  if (query['filter[isActive]'] !== undefined) {
    filters.isActive = query['filter[isActive]'] === 'true' || query['filter[isActive]'] === true;
  }

  // Parse startedAt filters
  if (
    query['filter[startedAt][gte]'] ||
    query['filter[startedAt][lte]'] ||
    query['filter[startedAt][gt]'] ||
    query['filter[startedAt][lt]'] ||
    query['filter[startedAt][eq]'] ||
    query['filter[startedAt][ne]']
  ) {
    filters.startedAt = {};
    if (query['filter[startedAt][gte]']) filters.startedAt.gte = new Date(query['filter[startedAt][gte]'] as string);
    if (query['filter[startedAt][lte]']) filters.startedAt.lte = new Date(query['filter[startedAt][lte]'] as string);
    if (query['filter[startedAt][gt]']) filters.startedAt.gt = new Date(query['filter[startedAt][gt]'] as string);
    if (query['filter[startedAt][lt]']) filters.startedAt.lt = new Date(query['filter[startedAt][lt]'] as string);
    if (query['filter[startedAt][eq]']) filters.startedAt.eq = new Date(query['filter[startedAt][eq]'] as string);
    if (query['filter[startedAt][ne]']) filters.startedAt.ne = new Date(query['filter[startedAt][ne]'] as string);
  }

  // Parse expiresAt filters
  if (
    query['filter[expiresAt][gte]'] ||
    query['filter[expiresAt][lte]'] ||
    query['filter[expiresAt][gt]'] ||
    query['filter[expiresAt][lt]'] ||
    query['filter[expiresAt][eq]'] ||
    query['filter[expiresAt][ne]']
  ) {
    filters.expiresAt = {};
    if (query['filter[expiresAt][gte]']) filters.expiresAt.gte = new Date(query['filter[expiresAt][gte]'] as string);
    if (query['filter[expiresAt][lte]']) filters.expiresAt.lte = new Date(query['filter[expiresAt][lte]'] as string);
    if (query['filter[expiresAt][gt]']) filters.expiresAt.gt = new Date(query['filter[expiresAt][gt]'] as string);
    if (query['filter[expiresAt][lt]']) filters.expiresAt.lt = new Date(query['filter[expiresAt][lt]'] as string);
    if (query['filter[expiresAt][eq]']) filters.expiresAt.eq = new Date(query['filter[expiresAt][eq]'] as string);
    if (query['filter[expiresAt][ne]']) filters.expiresAt.ne = new Date(query['filter[expiresAt][ne]'] as string);
  }

  // Parse endedAt filters
  if (
    query['filter[endedAt][gte]'] ||
    query['filter[endedAt][lte]'] ||
    query['filter[endedAt][gt]'] ||
    query['filter[endedAt][lt]'] ||
    query['filter[endedAt][eq]'] ||
    query['filter[endedAt][ne]']
  ) {
    filters.endedAt = {};
    if (query['filter[endedAt][gte]']) filters.endedAt.gte = new Date(query['filter[endedAt][gte]'] as string);
    if (query['filter[endedAt][lte]']) filters.endedAt.lte = new Date(query['filter[endedAt][lte]'] as string);
    if (query['filter[endedAt][gt]']) filters.endedAt.gt = new Date(query['filter[endedAt][gt]'] as string);
    if (query['filter[endedAt][lt]']) filters.endedAt.lt = new Date(query['filter[endedAt][lt]'] as string);
    if (query['filter[endedAt][eq]']) filters.endedAt.eq = new Date(query['filter[endedAt][eq]'] as string);
    if (query['filter[endedAt][ne]']) filters.endedAt.ne = new Date(query['filter[endedAt][ne]'] as string);
  }

  return filters;
}

/**
 * Helper: Transform impersonation session to API response
 * Handles field selection - only includes fields that are present
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformSessionResponse(session: any): Record<string, unknown> {
  const response: Record<string, unknown> = {};

  // Always include id as sessionId if present
  if (session.id !== undefined) response.sessionId = session.id;

  // Include other fields only if present (supports field selection)
  if (session.originalUserId !== undefined) response.originalUserId = session.originalUserId;
  if (session.impersonatedUserId !== undefined) response.impersonatedUserId = session.impersonatedUserId;
  if (session.parentSessionId !== undefined) response.parentSessionId = session.parentSessionId;
  if (session.environmentId !== undefined) response.environmentId = session.environmentId;
  if (session.impersonationType !== undefined) response.impersonationType = session.impersonationType;
  if (session.permissions !== undefined) response.permissions = session.permissions;
  if (session.reason !== undefined) response.reason = session.reason;
  if (session.ipAddress !== undefined) response.ipAddress = session.ipAddress;
  if (session.userAgent !== undefined) response.userAgent = session.userAgent;
  if (session.startedAt !== undefined) response.startedAt = session.startedAt;
  if (session.expiresAt !== undefined) response.expiresAt = session.expiresAt;
  if (session.endedAt !== undefined) response.endedAt = session.endedAt;
  if (session.isActive !== undefined) response.isActive = session.isActive;
  if (session.metadata !== undefined) response.metadata = session.metadata;

  return response;
}

/**
 * @desc    Start system-wide impersonation (admin)
 * @route   POST /api/v1/admin/users/:userId/impersonate
 * @access  Private (admin:users:impersonate)
 */
export const startImpersonation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { reason, expiresInMinutes } = req.body;

  logger.info('Admin: Starting impersonation', {
    adminUserId: req.user?.sub,
    targetUserId: userId,
  });

  const result = await adminImpersonationService.startImpersonation(
    req.user!.sub,
    {
      userId,
      reason,
      expiresInMinutes,
    },
    req.ip,
    req.get('user-agent')
  );

  res.status(HTTP_STATUS.CREATED).json(result);
});

/**
 * @desc    End impersonation session
 * @route   DELETE /api/v1/admin/impersonation/end
 * @access  Private (requires active impersonation)
 */
export const endImpersonation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.info('Admin: Ending impersonation', {
    impersonationContext: req.user?.impersonation,
  });

  const result = await adminImpersonationService.endImpersonation(req.user?.impersonation);

  res.status(HTTP_STATUS.OK).json(result);
});

/**
 * @desc    Get active impersonation sessions
 * @route   GET /api/v1/admin/impersonation/active
 * @access  Private (admin:impersonation:read)
 */
export const getActiveSessions = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Getting active impersonation sessions');

  const sessions = await adminImpersonationService.getActiveSessions();

  res.status(HTTP_STATUS.OK).json({ data: sessions });
});

/**
 * @desc    List all impersonation sessions (admin)
 * @route   GET /api/v1/admin/impersonation-sessions
 * @access  Private (admin:impersonation:read)
 */
export const listSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Listing impersonation sessions', { query: req.query });

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;
  const filters = parseFilters(req.query);

  // Map API field names to model property names
  let modelFields: string[] | undefined;
  if (req.query.fields) {
    const apiFields = (req.query.fields as string).split(',');
    modelFields = apiFields.map(field => {
      // Map sessionId to id for Sequelize
      if (field === 'sessionId') return 'id';
      return field;
    });
  }

  const { sessions, total } = await adminImpersonationService.listSessions({
    limit,
    offset,
    sort,
    search,
    fields: modelFields,
    filters,
  });

  res.status(HTTP_STATUS.OK).json({
    data: sessions.map(transformSessionResponse),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + sessions.length < total,
    },
  });
});

/**
 * @desc    Force-end impersonation session (admin)
 * @route   DELETE /api/v1/admin/impersonation-sessions/:sessionId
 * @access  Private (admin:impersonation:manage)
 */
export const forceEndSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  logger.info('Admin: Force-ending impersonation session', { sessionId });

  await adminImpersonationService.forceEndSession(sessionId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
