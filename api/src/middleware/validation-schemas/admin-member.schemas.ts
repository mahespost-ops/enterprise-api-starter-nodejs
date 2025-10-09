/**
 * Admin Member Validation Schemas
 * Joi schemas for validating admin member management requests
 */

import Joi from 'joi';
import { MEMBER_FILTERABLE_FIELDS, MEMBER_STATUS } from '../../constants/member.constants';

/**
 * GET /admin/organizations/:orgId/members
 * List organization members query parameters
 */
export const listOrganizationMembersQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),

  // Sorting
  sort: Joi.string().optional(),

  // Search (on user fields: email, givenName, familyName)
  search: Joi.string().min(1).max(200).optional(),

  // Field selection
  fields: Joi.string().optional(),

  // Filters - status
  [`filter[${MEMBER_FILTERABLE_FIELDS.STATUS}]`]: Joi.string()
    .valid(...Object.values(MEMBER_STATUS))
    .optional(),

  // Filters - createdAt
  [`filter[${MEMBER_FILTERABLE_FIELDS.CREATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${MEMBER_FILTERABLE_FIELDS.CREATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${MEMBER_FILTERABLE_FIELDS.CREATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${MEMBER_FILTERABLE_FIELDS.CREATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${MEMBER_FILTERABLE_FIELDS.CREATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${MEMBER_FILTERABLE_FIELDS.CREATED_AT}][ne]`]: Joi.date().iso().optional(),

  // Filters - joinedAt
  [`filter[${MEMBER_FILTERABLE_FIELDS.JOINED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${MEMBER_FILTERABLE_FIELDS.JOINED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${MEMBER_FILTERABLE_FIELDS.JOINED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${MEMBER_FILTERABLE_FIELDS.JOINED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${MEMBER_FILTERABLE_FIELDS.JOINED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${MEMBER_FILTERABLE_FIELDS.JOINED_AT}][ne]`]: Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * GET /admin/organizations/:orgId/members/:memberId
 * Organization and member ID parameter validation
 */
export const organizationMemberParamSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid organization ID format',
    'any.required': 'Organization ID is required',
  }),
  memberId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid member ID format',
    'any.required': 'Member ID is required',
  }),
});

/**
 * PUT /admin/organizations/:orgId/members/:memberId
 * Update member schema (system-managed fields only)
 */
export const updateOrganizationMemberSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(MEMBER_STATUS))
    .required()
    .messages({
      'any.only': `Status must be one of: ${Object.values(MEMBER_STATUS).join(', ')}`,
      'any.required': 'Status is required',
    }),
}).min(1); // At least one field must be provided

/**
 * GET /admin/groups/:groupId/members
 * List group members query parameters
 */
export const listGroupMembersQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),
}).options({ allowUnknown: false });

/**
 * GET/POST/DELETE /admin/groups/:groupId/members
 * Group ID parameter validation
 */
export const groupIdParamSchema = Joi.object({
  groupId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid group ID format',
    'any.required': 'Group ID is required',
  }),
});

/**
 * POST /admin/groups/:groupId/members
 * Add member to group schema
 */
export const addGroupMemberSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'User ID is required',
  }),
});

/**
 * DELETE /admin/groups/:groupId/members/:userId
 * Group and user ID parameter validation
 */
export const groupMemberParamSchema = Joi.object({
  groupId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid group ID format',
    'any.required': 'Group ID is required',
  }),
  userId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'User ID is required',
  }),
});
