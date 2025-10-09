/**
 * Admin Member Controller
 * Handles HTTP request/response for admin member management operations
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
import adminMemberService, { ListOrganizationMembersFilters } from '../services/admin-member.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseOrganizationMemberFilters(query: Record<string, unknown>): ListOrganizationMembersFilters {
  const filters: ListOrganizationMembersFilters = {};

  // Parse status
  if (query['filter[status]']) {
    filters.status = query['filter[status]'] as string;
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

  // Parse joinedAt filters
  if (
    query['filter[joinedAt][gte]'] ||
    query['filter[joinedAt][lte]'] ||
    query['filter[joinedAt][gt]'] ||
    query['filter[joinedAt][lt]'] ||
    query['filter[joinedAt][eq]'] ||
    query['filter[joinedAt][ne]']
  ) {
    filters.joinedAt = {};
    if (query['filter[joinedAt][gte]']) filters.joinedAt.gte = new Date(query['filter[joinedAt][gte]'] as string);
    if (query['filter[joinedAt][lte]']) filters.joinedAt.lte = new Date(query['filter[joinedAt][lte]'] as string);
    if (query['filter[joinedAt][gt]']) filters.joinedAt.gt = new Date(query['filter[joinedAt][gt]'] as string);
    if (query['filter[joinedAt][lt]']) filters.joinedAt.lt = new Date(query['filter[joinedAt][lt]'] as string);
    if (query['filter[joinedAt][eq]']) filters.joinedAt.eq = new Date(query['filter[joinedAt][eq]'] as string);
    if (query['filter[joinedAt][ne]']) filters.joinedAt.ne = new Date(query['filter[joinedAt][ne]'] as string);
  }

  return filters;
}

/**
 * Helper: Transform organization member model to API response
 * Note: Keep field names in camelCase per architectural standards
 */
function transformOrganizationMemberResponse(member: {
  id: string;
  organizationId: string;
  userId: string;
  status: string;
  invitedBy: string | null;
  joinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    givenName: string;
    familyName: string;
  };
}): Record<string, unknown> {
  return {
    id: member.id,
    organizationId: member.organizationId,
    userId: member.userId,
    status: member.status,
    invitedBy: member.invitedBy,
    joinedAt: member.joinedAt,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    user: member.user
      ? {
          id: member.user.id,
          email: member.user.email,
          givenName: member.user.givenName,
          familyName: member.user.familyName,
        }
      : undefined,
    // Security: Never expose invitationToken or other internal fields
  };
}

/**
 * Helper: Transform group member model to API response
 */
function transformGroupMemberResponse(member: {
  id: string;
  groupId: string;
  userId: string;
  addedBy: string | null;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    givenName: string;
    familyName: string;
  };
}): Record<string, unknown> {
  return {
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    addedBy: member.addedBy,
    createdAt: member.createdAt,
    user: member.user
      ? {
          id: member.user.id,
          email: member.user.email,
          givenName: member.user.givenName,
          familyName: member.user.familyName,
        }
      : undefined,
  };
}

// ==================== Organization Members ====================

/**
 * @desc    List all organization members (admin)
 * @route   GET /api/v1/admin/organizations/:orgId/members
 * @access  Private (admin:members:read)
 */
export const listOrganizationMembers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId } = req.params;

  logger.debug('Admin: Listing organization members', { orgId, query: req.query });

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;
  const fields = req.query.fields ? (req.query.fields as string).split(',') : undefined;
  const filters = parseOrganizationMemberFilters(req.query);

  const { members, total } = await adminMemberService.listOrganizationMembers(orgId, {
    limit,
    offset,
    sort,
    search,
    fields,
    filters,
  });

  res.status(HTTP_STATUS.OK).json({
    data: members.map(transformOrganizationMemberResponse),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + members.length < total,
    },
  });
});

/**
 * @desc    Get organization member by ID (admin)
 * @route   GET /api/v1/admin/organizations/:orgId/members/:memberId
 * @access  Private (admin:members:read)
 */
export const getOrganizationMemberById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, memberId } = req.params;

  logger.debug(`Admin: Getting organization member: ${memberId}`);

  const member = await adminMemberService.getOrganizationMemberById(orgId, memberId);

  res.status(HTTP_STATUS.OK).json(transformOrganizationMemberResponse(member));
});

/**
 * @desc    Update organization member (admin)
 * @route   PUT /api/v1/admin/organizations/:orgId/members/:memberId
 * @access  Private (admin:members:manage)
 */
export const updateOrganizationMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, memberId } = req.params;

  logger.debug(`Admin: Updating organization member: ${memberId}`, { body: req.body });

  const member = await adminMemberService.updateOrganizationMember(orgId, memberId, req.body);

  res.status(HTTP_STATUS.OK).json(transformOrganizationMemberResponse(member));
});

/**
 * @desc    Delete organization member (admin, soft delete)
 * @route   DELETE /api/v1/admin/organizations/:orgId/members/:memberId
 * @access  Private (admin:members:manage)
 */
export const deleteOrganizationMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, memberId } = req.params;

  logger.debug(`Admin: Deleting organization member: ${memberId}`);

  await adminMemberService.deleteOrganizationMember(orgId, memberId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});

// ==================== Group Members ====================

/**
 * @desc    List all group members (admin)
 * @route   GET /api/v1/admin/groups/:groupId/members
 * @access  Private (admin:groups:read)
 */
export const listGroupMembers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;

  logger.debug('Admin: Listing group members', { groupId, query: req.query });

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  const { members, total } = await adminMemberService.listGroupMembers(groupId, limit, offset);

  res.status(HTTP_STATUS.OK).json({
    data: members.map(transformGroupMemberResponse),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + members.length < total,
    },
  });
});

/**
 * @desc    Add member to group (admin)
 * @route   POST /api/v1/admin/groups/:groupId/members
 * @access  Private (admin:groups:manage)
 */
export const addGroupMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const { userId } = req.body;

  logger.debug('Admin: Adding member to group', { groupId, userId });

  const member = await adminMemberService.addGroupMember(groupId, userId);

  res.status(HTTP_STATUS.CREATED).json(transformGroupMemberResponse(member));
});

/**
 * @desc    Remove member from group (admin)
 * @route   DELETE /api/v1/admin/groups/:groupId/members/:userId
 * @access  Private (admin:groups:manage)
 */
export const removeGroupMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { groupId, userId } = req.params;

  logger.debug('Admin: Removing member from group', { groupId, userId });

  await adminMemberService.removeGroupMember(groupId, userId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
