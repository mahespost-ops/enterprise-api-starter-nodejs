/**
 * Admin Group Validation Schemas
 * Joi schemas for validating admin group management requests
 */

import Joi from 'joi';
import { GROUP_FILTERABLE_FIELDS } from '../../constants/group.constants';

/**
 * GET /admin/groups
 * List all groups query parameters
 */
export const listGroupsQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),

  // Sorting
  sort: Joi.string().optional(),

  // Search
  search: Joi.string().min(1).max(200).optional(),

  // Field selection
  fields: Joi.string().optional(),

  // Filters - organizationId
  [`filter[${GROUP_FILTERABLE_FIELDS.ORGANIZATION_ID}]`]: Joi.string().uuid().optional().messages({
    'string.guid': 'Invalid organization ID format',
  }),

  // Filters - parentId (supports "null" string for filtering root groups)
  [`filter[${GROUP_FILTERABLE_FIELDS.PARENT_ID}]`]: Joi.alternatives()
    .try(Joi.string().uuid(), Joi.string().valid('null'))
    .optional()
    .messages({
      'string.guid': 'Invalid parent ID format',
    }),

  // Filters - hierarchyLevel
  [`filter[${GROUP_FILTERABLE_FIELDS.HIERARCHY_LEVEL}]`]: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Hierarchy level must be a number',
    'number.integer': 'Hierarchy level must be an integer',
    'number.min': 'Hierarchy level must be at least 0',
  }),

  // Filters - isActive
  [`filter[${GROUP_FILTERABLE_FIELDS.IS_ACTIVE}]`]: Joi.boolean().optional(),

  // Filters - createdAt
  [`filter[${GROUP_FILTERABLE_FIELDS.CREATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${GROUP_FILTERABLE_FIELDS.CREATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${GROUP_FILTERABLE_FIELDS.CREATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${GROUP_FILTERABLE_FIELDS.CREATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${GROUP_FILTERABLE_FIELDS.CREATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${GROUP_FILTERABLE_FIELDS.CREATED_AT}][ne]`]: Joi.date().iso().optional(),

  // Filters - updatedAt
  [`filter[${GROUP_FILTERABLE_FIELDS.UPDATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${GROUP_FILTERABLE_FIELDS.UPDATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${GROUP_FILTERABLE_FIELDS.UPDATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${GROUP_FILTERABLE_FIELDS.UPDATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${GROUP_FILTERABLE_FIELDS.UPDATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${GROUP_FILTERABLE_FIELDS.UPDATED_AT}][ne]`]: Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * GET /admin/groups/{groupId}
 * PUT /admin/groups/{groupId}
 * DELETE /admin/groups/{groupId}
 * Group ID parameter validation
 */
export const groupIdParamSchema = Joi.object({
  groupId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid group ID format',
    'any.required': 'Group ID is required',
  }),
});

/**
 * PUT /admin/groups/{groupId}
 * Update group schema
 */
export const updateGroupSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Name must be at least 1 character',
    'string.max': 'Name must not exceed 100 characters',
  }),
  description: Joi.string().max(500).optional().allow(null).messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  isActive: Joi.boolean().optional().messages({
    'boolean.base': 'isActive must be a boolean value',
  }),
}).min(1); // At least one field must be provided
