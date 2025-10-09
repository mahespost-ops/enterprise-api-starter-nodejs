/**
 * Admin Group Controller
 * Handles HTTP request/response for admin group management operations
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
import adminGroupService, { ListGroupsFilters } from '../services/admin-group.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListGroupsFilters {
  const filters: ListGroupsFilters = {};

  // Parse organizationId
  if (query['filter[organizationId]']) {
    filters.organizationId = query['filter[organizationId]'] as string;
  }

  // Parse parentId (supports "null" string for filtering root groups)
  if (query['filter[parentId]'] !== undefined) {
    const parentIdValue = query['filter[parentId]'];
    filters.parentId = parentIdValue === 'null' ? null : (parentIdValue as string);
  }

  // Parse hierarchyLevel
  if (query['filter[hierarchyLevel]'] !== undefined) {
    filters.hierarchyLevel = parseInt(query['filter[hierarchyLevel]'] as string, 10);
  }

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
 * Helper: Transform group model to API response
 * Note: Keep field names in camelCase per architectural standards
 */
function transformGroupResponse(group: {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  hierarchyLevel: number;
  metadata: Record<string, unknown> | null;
  memberCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Record<string, unknown> {
  return {
    id: group.id,
    organizationId: group.organizationId,
    name: group.name,
    description: group.description,
    parentId: group.parentId,
    hierarchyLevel: group.hierarchyLevel,
    metadata: group.metadata,
    memberCount: group.memberCount,
    isActive: group.isActive,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

/**
 * @desc    List all groups (admin)
 * @route   GET /api/v1/admin/groups
 * @access  Private (admin:groups:read)
 */
export const listGroups = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Listing groups', { query: req.query });

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;
  const fields = req.query.fields ? (req.query.fields as string).split(',') : undefined;
  const filters = parseFilters(req.query);

  const { groups, total } = await adminGroupService.listGroups({
    limit,
    offset,
    sort,
    search,
    fields,
    filters,
  });

  res.status(HTTP_STATUS.OK).json({
    data: groups.map(transformGroupResponse),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + groups.length < total,
    },
  });
});

/**
 * @desc    Get group by ID (admin)
 * @route   GET /api/v1/admin/groups/:groupId
 * @access  Private (admin:groups:read)
 */
export const getGroupById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;

  logger.debug(`Admin: Getting group: ${groupId}`);

  const group = await adminGroupService.getGroupById(groupId);

  res.status(HTTP_STATUS.OK).json(transformGroupResponse(group));
});

/**
 * @desc    Update group (admin)
 * @route   PUT /api/v1/admin/groups/:groupId
 * @access  Private (admin:groups:manage)
 */
export const updateGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;

  logger.debug(`Admin: Updating group: ${groupId}`, { body: req.body });

  const group = await adminGroupService.updateGroup(groupId, req.body);

  res.status(HTTP_STATUS.OK).json(transformGroupResponse(group));
});

/**
 * @desc    Delete group (admin, soft delete)
 * @route   DELETE /api/v1/admin/groups/:groupId
 * @access  Private (admin:groups:manage)
 */
export const deleteGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;

  logger.debug(`Admin: Deleting group: ${groupId}`);

  await adminGroupService.deleteGroup(groupId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
