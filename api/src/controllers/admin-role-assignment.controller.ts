/**
 * Admin Role Assignment Controller
 * Handles HTTP request/response for admin role assignment management operations
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
import adminRoleAssignmentService, { ListRoleAssignmentsOptions } from '../services/admin-role-assignment.service';
import { RoleAssignmentFilters } from '../models/EnvironmentRoleAssignment.model';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseRoleAssignmentFilters(query: Record<string, unknown>): RoleAssignmentFilters {
  const filters: RoleAssignmentFilters = {};

  // Parse organizationId
  if (query['filter[organizationId]']) {
    filters.organizationId = query['filter[organizationId]'] as string;
  }

  // Parse environmentId
  if (query['filter[environmentId]']) {
    filters.environmentId = query['filter[environmentId]'] as string;
  }

  // Parse membershipId
  if (query['filter[membershipId]']) {
    filters.membershipId = query['filter[membershipId]'] as string;
  }

  // Parse groupId
  if (query['filter[groupId]']) {
    filters.groupId = query['filter[groupId]'] as string;
  }

  // Parse roleId
  if (query['filter[roleId]']) {
    filters.roleId = query['filter[roleId]'] as string;
  }

  // Parse assigneeType
  if (query['filter[assigneeType]']) {
    filters.assigneeType = query['filter[assigneeType]'] as 'member' | 'group';
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
 * Helper: Transform assignment for response (add assigneeType virtual field)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformAssignment(assignment: any): any {
  return {
    id: assignment.id,
    environmentId: assignment.environmentId,
    roleId: assignment.roleId,
    membershipId: assignment.membershipId,
    groupId: assignment.groupId,
    assigneeType: assignment.membershipId ? 'member' : 'group',
    role: assignment.role,
    member: assignment.membership, // Map 'membership' association to 'member' in response
    group: assignment.group,
    organization: assignment.environment?.organization,
    environment: {
      id: assignment.environment?.id,
      name: assignment.environment?.name,
    },
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

/**
 * @desc    List all role assignments
 * @route   GET /api/v1/admin/role-assignments
 * @access  Private (admin:assignments:read)
 */
export const listRoleAssignments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Listing role assignments', { query: req.query });

  const limit = parseInt(req.query.limit as string, 10) || 20;
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;
  const fieldsParam = req.query.fields as string | undefined;
  const fields = fieldsParam ? fieldsParam.split(',').map((f) => f.trim()) : undefined;
  const filters = parseRoleAssignmentFilters(req.query as Record<string, unknown>);

  const options: ListRoleAssignmentsOptions = {
    limit,
    offset,
    sort,
    search,
    fields,
    filters,
  };

  const { assignments, total } = await adminRoleAssignmentService.listRoleAssignments(options);

  // Transform assignments to add assigneeType virtual field
  const transformedAssignments = assignments.map(transformAssignment);

  res.status(HTTP_STATUS.OK).json({
    data: transformedAssignments,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
    },
  });
});

/**
 * @desc    Create role assignment
 * @route   POST /api/v1/admin/role-assignments
 * @access  Private (admin:assignments:manage)
 */
export const createRoleAssignment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Creating role assignment', { body: req.body });

  const roleId = req.params.roleId as string;
  const environmentId = req.params.environmentId as string;
  const membershipId = req.params.membershipId as string;
  const groupId = req.params.groupId as string;

  // Get current user ID from JWT for assignedBy field
  const assignedBy = (req as { user?: { userId: string } }).user?.userId;

  const assignment = await adminRoleAssignmentService.createRoleAssignment({
    roleId,
    environmentId,
    membershipId,
    groupId,
    assignedBy,
  });

  // Reload with associations for response
  const assignmentWithAssociations = await assignment.reload({
    include: [
      { association: 'role', attributes: ['id', 'name'] },
      {
        association: 'environment',
        attributes: ['id', 'name', 'organizationId'],
        include: [{ association: 'organization', attributes: ['id', 'name'] }],
      },
      {
        association: 'membership',
        attributes: ['id', 'userId'],
        include: [{ association: 'user', attributes: ['id', 'email', 'givenName', 'familyName'] }],
      },
      { association: 'group', attributes: ['id', 'name'] },
    ],
  });

  res.status(HTTP_STATUS.CREATED).json(transformAssignment(assignmentWithAssociations));
});

/**
 * @desc    Delete role assignment
 * @route   DELETE /api/v1/admin/role-assignments/{assignmentId}
 * @access  Private (admin:assignments:manage)
 */
export const deleteRoleAssignment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Deleting role assignment', { params: req.params });

  const assignmentId = req.params.assignmentId as string;
    

  await adminRoleAssignmentService.deleteRoleAssignment(assignmentId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
