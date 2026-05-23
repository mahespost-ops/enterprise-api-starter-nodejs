/**
 * Admin User Controller
 * Handles HTTP request/response for admin user management operations
 *
 * Per CLAUDE.md:
 * - Handle HTTP concerns (req/res)
 * - Extract params and delegate to service
 * - Never expose database implementation details (hashes, internal IDs)
 * - NO field name transformations (keep camelCase consistent)
 * - Format response with pagination info
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import adminUserService, { ListUsersFilters } from '../services/admin-user.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListUsersFilters {
  const filters: ListUsersFilters = {};

  // Parse isActive
  if (query['filter[isActive]'] !== undefined) {
    filters.isActive = query['filter[isActive]'] === 'true' || query['filter[isActive]'] === true;
  }

  // Parse organizationId
  if (query['filter[organizationId]']) {
    filters.organizationId = query['filter[organizationId]'] as string;
  }

  // Parse emailVerified
  if (query['filter[emailVerified]'] !== undefined) {
    filters.emailVerified = query['filter[emailVerified]'] === 'true' || query['filter[emailVerified]'] === true;
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
    if (query['filter[updatedAt][gte]']) filters.updatedAt.gte = new Date(query['filter[updatedAt][gte]'] as string);
    if (query['filter[updatedAt][lte]']) filters.updatedAt.lte = new Date(query['filter[updatedAt][lte]'] as string);
    if (query['filter[updatedAt][gt]']) filters.updatedAt.gt = new Date(query['filter[updatedAt][gt]'] as string);
    if (query['filter[updatedAt][lt]']) filters.updatedAt.lt = new Date(query['filter[updatedAt][lt]'] as string);
    if (query['filter[updatedAt][eq]']) filters.updatedAt.eq = new Date(query['filter[updatedAt][eq]'] as string);
    if (query['filter[updatedAt][ne]']) filters.updatedAt.ne = new Date(query['filter[updatedAt][ne]'] as string);
  }

  return filters;
}

/**
 * Helper: Transform user model to API response
 * Note: Keep field names in camelCase per architectural standards
 */
function transformUserResponse(user: {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  givenName: string;
  familyName: string;
  phoneNumber: string | null;
  picture: string | null;
  locale: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.fullName,
    givenName: user.givenName,
    familyName: user.familyName,
    phoneNumber: user.phoneNumber,
    picture: user.picture,
    locale: user.locale,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    // Security: Never expose fingerprintHash or other internal fields
  };
}

/**
 * @desc    List all users (admin)
 * @route   GET /api/v1/admin/users
 * @access  Private (admin:users:read)
 */
export const listUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Listing users', { query: req.query });

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;
  const fields = req.query.fields ? (req.query.fields as string).split(',') : undefined;
  const filters = parseFilters(req.query);

  const { users, total } = await adminUserService.listUsers({
    limit,
    offset,
    sort,
    search,
    fields,
    filters,
  });

  res.status(HTTP_STATUS.OK).json({
    data: users.map(transformUserResponse),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + users.length < total,
    },
  });
});

/**
 * @desc    Get user by ID (admin)
 * @route   GET /api/v1/admin/users/:userId
 * @access  Private (admin:users:read)
 */
export const getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;

  logger.debug(`Admin: Getting user: ${userId}`);

  const user = await adminUserService.getUserById(userId);

  res.status(HTTP_STATUS.OK).json(transformUserResponse(user));
});

/**
 * @desc    Update user (admin)
 * @route   PUT /api/v1/admin/users/:userId
 * @access  Private (admin:users:manage)
 */
export const updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;

  logger.debug(`Admin: Updating user: ${userId}`, { body: req.body });

  const user = await adminUserService.updateUser(userId, req.body);

  res.status(HTTP_STATUS.OK).json(transformUserResponse(user));
});

/**
 * @desc    Delete user (admin, soft delete)
 * @route   DELETE /api/v1/admin/users/:userId
 * @access  Private (admin:users:manage)
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;

  logger.debug(`Admin: Deleting user: ${userId}`);

  await adminUserService.deleteUser(userId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
