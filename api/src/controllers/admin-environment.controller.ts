/**
 * Admin Environment Controller
 * Handles HTTP request/response for admin environment management operations
 *
 * Per CLAUDE.md:
 * - Handle HTTP concerns (req/res)
 * - Extract params and delegate to service
 * - Never expose database implementation details
 * - NO field name transformations (keep camelCase consistent)
 * - Format response with pagination info
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import adminEnvironmentService, { ListEnvironmentsFilters } from '../services/admin-environment.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListEnvironmentsFilters {
  const filters: ListEnvironmentsFilters = {};

  // Parse organizationId
  if (query['filter[organizationId]']) {
    filters.organizationId = query['filter[organizationId]'] as string;
  }

  // Parse type
  if (query['filter[type]']) {
    filters.type = query['filter[type]'] as string;
  }

  // Parse isActive
  if (query['filter[isActive]'] !== undefined) {
    filters.isActive = query['filter[isActive]'] === 'true' || query['filter[isActive]'] === true;
  }

  // Parse isDefault
  if (query['filter[isDefault]'] !== undefined) {
    filters.isDefault = query['filter[isDefault]'] === 'true' || query['filter[isDefault]'] === true;
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
 * Helper: Transform environment model to API response
 * Note: Keep field names in camelCase per architectural standards
 */
function transformEnvironmentResponse(env: {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}): Record<string, unknown> {
  return {
    id: env.id,
    organizationId: env.organizationId,
    name: env.name,
    type: env.type,
    description: env.description,
    isDefault: env.isDefault,
    isActive: env.isActive,
    metadata: env.metadata || {},
    createdAt: env.createdAt,
    updatedAt: env.updatedAt,
  };
}

/**
 * @desc    List all environments (admin)
 * @route   GET /api/v1/admin/environments
 * @access  Private (admin:environments:read)
 */
export const listEnvironments = asyncHandler(async (req: Request, res: Response) => {
  logger.debug('Admin: List environments request', { query: req.query });

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;
  const fieldsParam = req.query.fields as string | undefined;
  const fields = fieldsParam ? fieldsParam.split(',') : undefined;

  const filters = parseFilters(req.query as Record<string, unknown>);

  const { environments, total } = await adminEnvironmentService.listEnvironments({
    limit,
    offset,
    sort,
    search,
    fields,
    filters,
  });

  // Transform environments for response
  const data = environments.map(env => transformEnvironmentResponse(env.toJSON()));

  res.status(HTTP_STATUS.OK).json({
    data,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
    },
  });
});

/**
 * @desc    Get environment details (admin)
 * @route   GET /api/v1/admin/environments/:envId
 * @access  Private (admin:environments:read)
 */
export const getEnvironment = asyncHandler(async (req: Request, res: Response) => {
  const { envId } = req.params;

  logger.debug('Admin: Get environment request', { envId });

  const environment = await adminEnvironmentService.getEnvironmentById(envId);

  res.status(HTTP_STATUS.OK).json(transformEnvironmentResponse(environment.toJSON()));
});

/**
 * @desc    Update environment (admin)
 * @route   PUT /api/v1/admin/environments/:envId
 * @access  Private (admin:environments:manage)
 */
export const updateEnvironment = asyncHandler(async (req: Request, res: Response) => {
  const { envId } = req.params;
  const updateData = req.body;

  logger.debug('Admin: Update environment request', { envId, updateData });

  const environment = await adminEnvironmentService.updateEnvironment(envId, updateData);

  res.status(HTTP_STATUS.OK).json(transformEnvironmentResponse(environment.toJSON()));
});

/**
 * @desc    Delete environment (admin)
 * @route   DELETE /api/v1/admin/environments/:envId
 * @access  Private (admin:environments:manage)
 */
export const deleteEnvironment = asyncHandler(async (req: Request, res: Response) => {
  const { envId } = req.params;

  logger.debug('Admin: Delete environment request', { envId });

  await adminEnvironmentService.deleteEnvironment(envId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
