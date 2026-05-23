/**
 * Admin Organization Controller
 * Handles HTTP request/response for admin organization management operations
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
import adminOrganizationService, { ListOrganizationsFilters } from '../services/admin-organization.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListOrganizationsFilters {
  const filters: ListOrganizationsFilters = {};

  // Parse isActive
  if (query['filter[isActive]'] !== undefined) {
    filters.isActive = query['filter[isActive]'] === 'true' || query['filter[isActive]'] === true;
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
 * Helper: Transform organization model to API response
 * Note: Keep field names in camelCase per architectural standards
 */
function transformOrganizationResponse(org: {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  defaultEnvId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}): Record<string, unknown> {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    isActive: org.isActive,
    defaultEnvId: org.defaultEnvId,
    metadata: org.metadata || {},
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

/**
 * @desc    List all organizations (admin)
 * @route   GET /api/v1/admin/organizations
 * @access  Private (admin:organizations:read)
 */
export const listOrganizations = asyncHandler(async (req: Request, res: Response) => {
  logger.debug('Admin: List organizations request', { query: req.query });

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;
  const fieldsParam = req.query.fields as string | undefined;
  const fields = fieldsParam ? fieldsParam.split(',') : undefined;

  const filters = parseFilters(req.query as Record<string, unknown>);

  const { organizations, total } = await adminOrganizationService.listOrganizations({
    limit,
    offset,
    sort,
    search,
    fields,
    filters,
  });

  // Transform organizations for response
  const data = organizations.map(org => transformOrganizationResponse(org.toJSON()));

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
 * @desc    Get organization details (admin)
 * @route   GET /api/v1/admin/organizations/:orgId
 * @access  Private (admin:organizations:read)
 */
export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.params.orgId as string;

  logger.debug('Admin: Get organization request', { orgId });

  const organization = await adminOrganizationService.getOrganizationById(orgId);

  res.status(HTTP_STATUS.OK).json(transformOrganizationResponse(organization.toJSON()));
});

/**
 * @desc    Update organization (admin)
 * @route   PUT /api/v1/admin/organizations/:orgId
 * @access  Private (admin:organizations:manage)
 */
export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.params.orgId as string;
  const updateData = req.body;

  logger.debug('Admin: Update organization request', { orgId, updateData });

  const organization = await adminOrganizationService.updateOrganization(orgId, updateData);

  res.status(HTTP_STATUS.OK).json(transformOrganizationResponse(organization.toJSON()));
});

/**
 * @desc    Delete organization (admin)
 * @route   DELETE /api/v1/admin/organizations/:orgId
 * @access  Private (admin:organizations:manage)
 */
export const deleteOrganization = asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.params.orgId as string;

  logger.debug('Admin: Delete organization request', { orgId });

  await adminOrganizationService.deleteOrganization(orgId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
