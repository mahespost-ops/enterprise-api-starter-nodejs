/**
 * Admin Role Validation Schemas
 * Joi schemas for validating admin role and permission management requests
 */

import Joi from 'joi';
import { ROLE_FILTERABLE_FIELDS } from '../../constants/role.constants';

/**
 * GET /admin/roles
 * List all roles query parameters
 */
export const listRolesQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),

  // Sorting
  sort: Joi.string().optional(),

  // Search
  search: Joi.string().min(1).max(200).optional(),

  // Field selection
  fields: Joi.string().optional(),

  // Filters - isSystem
  [`filter[${ROLE_FILTERABLE_FIELDS.IS_SYSTEM}]`]: Joi.boolean().optional(),

  // Filters - createdAt
  [`filter[${ROLE_FILTERABLE_FIELDS.CREATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_FILTERABLE_FIELDS.CREATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_FILTERABLE_FIELDS.CREATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_FILTERABLE_FIELDS.CREATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_FILTERABLE_FIELDS.CREATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_FILTERABLE_FIELDS.CREATED_AT}][ne]`]: Joi.date().iso().optional(),

  // Filters - updatedAt
  [`filter[${ROLE_FILTERABLE_FIELDS.UPDATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_FILTERABLE_FIELDS.UPDATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_FILTERABLE_FIELDS.UPDATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_FILTERABLE_FIELDS.UPDATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_FILTERABLE_FIELDS.UPDATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_FILTERABLE_FIELDS.UPDATED_AT}][ne]`]: Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * POST /admin/roles
 * Create role schema
 */
export const createRoleSchema = Joi.object({
  name: Joi.string().min(1).max(50).required().messages({
    'string.min': 'Name must be at least 1 character',
    'string.max': 'Name must not exceed 50 characters',
    'any.required': 'Name is required',
  }),
  description: Joi.string().max(500).optional().allow(null).messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
});

/**
 * GET /admin/roles/{roleId}
 * PUT /admin/roles/{roleId}
 * DELETE /admin/roles/{roleId}
 * Role ID parameter validation
 */
export const roleIdParamSchema = Joi.object({
  roleId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid role ID format',
    'any.required': 'Role ID is required',
  }),
});

/**
 * PUT /admin/roles/{roleId}
 * Update role schema
 */
export const updateRoleSchema = Joi.object({
  name: Joi.string().min(1).max(50).optional().messages({
    'string.min': 'Name must be at least 1 character',
    'string.max': 'Name must not exceed 50 characters',
  }),
  description: Joi.string().max(500).optional().allow(null).messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
}).min(1); // At least one field must be provided

/**
 * POST /admin/roles/{roleId}/permissions
 * Add permission to role schema
 */
export const addRolePermissionSchema = Joi.object({
  permissionId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid permission ID format',
    'any.required': 'Permission ID is required',
  }),
});

/**
 * DELETE /admin/roles/{roleId}/permissions/{permissionId}
 * Permission ID parameter validation
 */
export const permissionIdParamSchema = Joi.object({
  permissionId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid permission ID format',
    'any.required': 'Permission ID is required',
  }),
});

/**
 * GET /admin/permissions
 * List permissions query parameters
 */
export const listPermissionsQuerySchema = Joi.object({
  resource: Joi.string().optional().messages({
    'string.base': 'Resource must be a string',
  }),
  action: Joi.string().valid('read', 'manage', 'assign').optional().messages({
    'any.only': 'Action must be one of: read, manage, assign',
  }),
}).options({ allowUnknown: false });
