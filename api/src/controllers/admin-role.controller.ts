/**
 * Admin Role Controller
 * Handles HTTP request/response for admin role and permission management operations
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
import adminRoleService, { ListRolesFilters, ListPermissionsFilters } from '../services/admin-role.service';
import logger from '../config/logger';

/**
 * Helper: Parse filter parameters from query string
 */
function parseRoleFilters(query: Record<string, unknown>): ListRolesFilters {
  const filters: ListRolesFilters = {};

  // Parse isSystem
  if (query['filter[isSystem]'] !== undefined) {
    filters.isSystem = query['filter[isSystem]'] === 'true' || query['filter[isSystem]'] === true;
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
 * Helper: Parse permission filter parameters from query string
 */
function parsePermissionFilters(query: Record<string, unknown>): ListPermissionsFilters {
  const filters: ListPermissionsFilters = {};

  if (query.resource) {
    filters.resource = query.resource as string;
  }

  if (query.action) {
    filters.action = query.action as 'read' | 'manage' | 'assign';
  }

  return filters;
}

/**
 * @desc    List all roles
 * @route   GET /api/v1/admin/roles
 * @access  Private (admin:roles:read)
 */
export const listRoles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Listing roles', { query: req.query });

  const limit = parseInt(req.query.limit as string, 10) || 20;
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;
  const fieldsParam = req.query.fields as string | undefined;
  const fields = fieldsParam ? fieldsParam.split(',').map((f) => f.trim()) : undefined;
  const filters = parseRoleFilters(req.query as Record<string, unknown>);

  const { roles, total } = await adminRoleService.listRoles({
    limit,
    offset,
    sort,
    search,
    fields,
    filters,
  });

  res.status(HTTP_STATUS.OK).json({
    data: roles,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
    },
  });
});

/**
 * @desc    Create a new role
 * @route   POST /api/v1/admin/roles
 * @access  Private (admin:roles:manage)
 */
export const createRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Creating role', { body: req.body });

  const role = await adminRoleService.createRole({
    name: req.body.name,
    description: req.body.description,
  });

  res.status(HTTP_STATUS.CREATED).json(role);
});

/**
 * @desc    Get role by ID
 * @route   GET /api/v1/admin/roles/:roleId
 * @access  Private (admin:roles:read)
 */
export const getRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const roleId = req.params.roleId as string;
  
  logger.debug('Admin: Getting role', { roleId });

  const role = await adminRoleService.getRoleById(roleId);

  res.status(HTTP_STATUS.OK).json(role);
});

/**
 * @desc    Update role
 * @route   PUT /api/v1/admin/roles/:roleId
 * @access  Private (admin:roles:manage)
 */
export const updateRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const roleId = req.params.roleId as string;

  logger.debug('Admin: Updating role', { roleId, body: req.body });

  const role = await adminRoleService.updateRole(roleId, {
    name: req.body.name,
    description: req.body.description,
  });

  res.status(HTTP_STATUS.OK).json(role);
});

/**
 * @desc    Delete role (soft delete)
 * @route   DELETE /api/v1/admin/roles/:roleId
 * @access  Private (admin:roles:manage)
 */
export const deleteRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const roleId = req.params.roleId as string;

  logger.debug('Admin: Deleting role', { roleId });

  await adminRoleService.deleteRole(roleId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});

/**
 * @desc    List permissions assigned to a role
 * @route   GET /api/v1/admin/roles/:roleId/permissions
 * @access  Private (admin:roles:read)
 */
export const listRolePermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const roleId = req.params.roleId as string;

  logger.debug('Admin: Listing role permissions', { roleId });

  const permissions = await adminRoleService.listRolePermissions(roleId);

  res.status(HTTP_STATUS.OK).json({ permissions });
});

/**
 * @desc    Add permission to role
 * @route   POST /api/v1/admin/roles/:roleId/permissions
 * @access  Private (admin:roles:manage)
 */
export const addRolePermission = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const roleId = req.params.roleId as string;
  const { permissionId } = req.body;

  logger.debug('Admin: Adding permission to role', { roleId, permissionId });

  const rolePermission = await adminRoleService.addRolePermission(roleId, permissionId);

  res.status(HTTP_STATUS.CREATED).json(rolePermission);
});

/**
 * @desc    Remove permission from role
 * @route   DELETE /api/v1/admin/roles/:roleId/permissions/:permissionId
 * @access  Private (admin:roles:manage)
 */
export const removeRolePermission = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const roleId = req.params.roleId as string;
  const permissionId = req.params.permissionId as string;
  

  logger.debug('Admin: Removing permission from role', { roleId, permissionId });

  await adminRoleService.removeRolePermission(roleId, permissionId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});

/**
 * @desc    List all permissions
 * @route   GET /api/v1/admin/permissions
 * @access  Private (admin:permissions:read)
 */
export const listPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Listing permissions', { query: req.query });

  const filters = parsePermissionFilters(req.query as Record<string, unknown>);

  const permissions = await adminRoleService.listPermissions(filters);

  res.status(HTTP_STATUS.OK).json({ permissions });
});
