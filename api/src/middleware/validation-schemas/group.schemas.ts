/**
 * Validation Schemas: Groups
 * Joi validation schemas for group management endpoints
 */

import Joi from 'joi';

/**
 * UUID path parameters for group endpoints
 */
export const groupPathParamsSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
  groupId: Joi.string().uuid().required().messages({
    'string.guid': 'Group ID must be a valid UUID',
    'any.required': 'Group ID is required',
  }),
});

export const groupMemberPathParamsSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
  groupId: Joi.string().uuid().required().messages({
    'string.guid': 'Group ID must be a valid UUID',
    'any.required': 'Group ID is required',
  }),
  userId: Joi.string().uuid().required().messages({
    'string.guid': 'User ID must be a valid UUID',
    'any.required': 'User ID is required',
  }),
});

export const orgIdParamSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
});

/**
 * List Groups Query Parameters
 * GET /api/v1/orgs/{orgId}/groups
 */
export const listGroupsQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),

  // Sorting
  sort: Joi.string().optional(),

  // Search
  search: Joi.string().max(255).optional(),

  // Field selection
  fields: Joi.string().optional(),

  // Filters
  'filter[parentId]': Joi.string().uuid().allow(null).optional(),
  'filter[hierarchyLevel]': Joi.number().integer().min(0).optional(),
  'filter[isActive]': Joi.string().valid('true', 'false').optional(),
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  'filter[createdAt][lte]': Joi.date().iso().optional(),
}).unknown(true); // Allow other filter variations

/**
 * Create Group Request Body
 * POST /api/v1/orgs/{orgId}/groups
 */
export const createGroupSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Group name must be at least 1 character',
    'string.max': 'Group name must not exceed 100 characters',
    'any.required': 'Group name is required',
  }),
  description: Joi.string().max(500).allow(null, '').optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  parentId: Joi.string().uuid().allow(null).optional().messages({
    'string.guid': 'Parent ID must be a valid UUID',
  }),
  metadata: Joi.object().allow(null).optional().messages({
    'object.base': 'Metadata must be an object',
  }),
});

/**
 * Update Group Request Body
 * PUT /api/v1/orgs/{orgId}/groups/{groupId}
 *
 * User-modifiable fields:
 * - name, description, metadata, isActive
 *
 * System-managed fields excluded:
 * - organizationId, parentId (use separate endpoints for hierarchy changes)
 * - hierarchyLevel, memberCount (auto-calculated)
 */
export const updateGroupSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Group name must be at least 1 character',
    'string.max': 'Group name must not exceed 100 characters',
  }),
  description: Joi.string().max(500).allow(null, '').optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  metadata: Joi.object().allow(null).optional().messages({
    'object.base': 'Metadata must be an object',
  }),
  isActive: Joi.boolean().optional().messages({
    'boolean.base': 'isActive must be a boolean',
  }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Add Member to Group Request Body
 * POST /api/v1/orgs/{orgId}/groups/{groupId}/members
 */
export const addGroupMemberSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.guid': 'User ID must be a valid UUID',
    'any.required': 'User ID is required',
  }),
});
