/**
 * Admin Session Controller
 * Handles HTTP request/response for admin session management operations
 *
 * Per CLAUDE.md:
 * - Handle HTTP concerns (req/res)
 * - Extract params and delegate to service
 * - Never expose database implementation details (refreshTokenHash)
 * - NO field name transformations (keep camelCase consistent)
 * - Format response with pagination info
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import adminSessionService, { ListSessionsFilters } from '../services/admin-session.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListSessionsFilters {
  const filters: ListSessionsFilters = {};

  // Parse userId
  if (query['filter[userId]']) {
    filters.userId = query['filter[userId]'] as string;
  }

  // Parse deviceId
  if (query['filter[deviceId]']) {
    filters.deviceId = query['filter[deviceId]'] as string;
  }

  // Parse isActive
  if (query['filter[isActive]'] !== undefined) {
    filters.isActive = query['filter[isActive]'] === 'true' || query['filter[isActive]'] === true;
  }

  // Parse isRevoked
  if (query['filter[isRevoked]'] !== undefined) {
    filters.isRevoked = query['filter[isRevoked]'] === 'true' || query['filter[isRevoked]'] === true;
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
    if (query['filter[createdAt][gte]']) filters.createdAt.gte = new Date(query['filter[createdAt][gte]'] as string);
    if (query['filter[createdAt][lte]']) filters.createdAt.lte = new Date(query['filter[createdAt][lte]'] as string);
    if (query['filter[createdAt][gt]']) filters.createdAt.gt = new Date(query['filter[createdAt][gt]'] as string);
    if (query['filter[createdAt][lt]']) filters.createdAt.lt = new Date(query['filter[createdAt][lt]'] as string);
    if (query['filter[createdAt][eq]']) filters.createdAt.eq = new Date(query['filter[createdAt][eq]'] as string);
    if (query['filter[createdAt][ne]']) filters.createdAt.ne = new Date(query['filter[createdAt][ne]'] as string);
  }

  // Parse lastAccessedAt filters
  if (
    query['filter[lastAccessedAt][gte]'] ||
    query['filter[lastAccessedAt][lte]'] ||
    query['filter[lastAccessedAt][gt]'] ||
    query['filter[lastAccessedAt][lt]'] ||
    query['filter[lastAccessedAt][eq]'] ||
    query['filter[lastAccessedAt][ne]']
  ) {
    filters.lastAccessedAt = {};
    if (query['filter[lastAccessedAt][gte]'])
      filters.lastAccessedAt.gte = new Date(query['filter[lastAccessedAt][gte]'] as string);
    if (query['filter[lastAccessedAt][lte]'])
      filters.lastAccessedAt.lte = new Date(query['filter[lastAccessedAt][lte]'] as string);
    if (query['filter[lastAccessedAt][gt]'])
      filters.lastAccessedAt.gt = new Date(query['filter[lastAccessedAt][gt]'] as string);
    if (query['filter[lastAccessedAt][lt]'])
      filters.lastAccessedAt.lt = new Date(query['filter[lastAccessedAt][lt]'] as string);
    if (query['filter[lastAccessedAt][eq]'])
      filters.lastAccessedAt.eq = new Date(query['filter[lastAccessedAt][eq]'] as string);
    if (query['filter[lastAccessedAt][ne]'])
      filters.lastAccessedAt.ne = new Date(query['filter[lastAccessedAt][ne]'] as string);
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

  return filters;
}

/**
 * Helper: Transform session model to API response
 * CRITICAL: Never expose refreshTokenHash (bcrypt hash - server-side only)
 * Note: Keep field names in camelCase per architectural standards
 */
function transformSessionResponse(session: {
  id: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string | null;
  geoLocation: Record<string, unknown> | null;
  requestCount: number;
  lastActivityType: string | null;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  revokedAt: Date | null;
  revokedBy: string | null;
  revocationReason: string | null;
}): Record<string, unknown> {
  return {
    id: session.id,
    userId: session.userId,
    deviceId: session.deviceId,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    geoLocation: session.geoLocation,
    requestCount: session.requestCount,
    lastActivityType: session.lastActivityType,
    createdAt: session.createdAt,
    lastAccessedAt: session.lastAccessedAt,
    expiresAt: session.expiresAt,
    isActive: session.isActive,
    isRevoked: session.revokedAt !== null,
    revokedAt: session.revokedAt,
    revokedBy: session.revokedBy,
    revocationReason: session.revocationReason,
    // Security: Never expose refreshTokenHash (bcrypt hash)
  };
}

/**
 * @desc    List all sessions (admin)
 * @route   GET /api/v1/admin/sessions
 * @access  Private (admin:sessions:read)
 */
export const listSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Listing sessions', { query: req.query });

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;
  const fields = req.query.fields ? (req.query.fields as string).split(',') : undefined;
  const filters = parseFilters(req.query);

  const { sessions, total } = await adminSessionService.listSessions({
    limit,
    offset,
    sort,
    search,
    fields,
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
 * @desc    Get session by ID (admin)
 * @route   GET /api/v1/admin/sessions/:sessionId
 * @access  Private (admin:sessions:read)
 */
export const getSessionById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.params.sessionId as string;

  logger.debug(`Admin: Getting session: ${sessionId}`);

  const session = await adminSessionService.getSessionById(sessionId);

  res.status(HTTP_STATUS.OK).json(transformSessionResponse(session));
});

/**
 * @desc    Revoke session (admin)
 * @route   DELETE /api/v1/admin/sessions/:sessionId
 * @access  Private (admin:sessions:manage)
 */
export const revokeSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.params.sessionId as string;

  logger.debug(`Admin: Revoking session: ${sessionId}`);

  await adminSessionService.revokeSession(sessionId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});

/**
 * @desc    Revoke all sessions for user (admin)
 * @route   DELETE /api/v1/admin/sessions/user/:userId
 * @access  Private (admin:sessions:manage)
 */
export const revokeAllUserSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;

  logger.debug(`Admin: Revoking all sessions for user: ${userId}`);

  const revokedCount = await adminSessionService.revokeAllUserSessions(userId);

  res.status(HTTP_STATUS.OK).json({ revokedCount });
});
