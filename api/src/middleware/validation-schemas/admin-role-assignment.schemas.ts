/**
 * Admin Role Assignment Validation Schemas
 * Joi schemas for validating admin role assignment management requests
 */

import Joi from 'joi';
import { ROLE_ASSIGNMENT_FILTERABLE_FIELDS, ASSIGNEE_TYPES } from '../../constants/role-assignment.constants';

/**
 * GET /admin/role-assignments
 * List all role assignments query parameters
 */
export const listRoleAssignmentsQuerySchema = Joi.object({
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
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.ORGANIZATION_ID}]`]: Joi.string().uuid().optional(),

  // Filters - environmentId
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.ENVIRONMENT_ID}]`]: Joi.string().uuid().optional(),

  // Filters - membershipId
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.MEMBERSHIP_ID}]`]: Joi.string().uuid().optional(),

  // Filters - groupId
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.GROUP_ID}]`]: Joi.string().uuid().optional(),

  // Filters - roleId
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.ROLE_ID}]`]: Joi.string().uuid().optional(),

  // Filters - assigneeType
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.ASSIGNEE_TYPE}]`]: Joi.string()
    .valid(ASSIGNEE_TYPES.MEMBER, ASSIGNEE_TYPES.GROUP)
    .optional(),

  // Filters - createdAt
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.CREATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.CREATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.CREATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.CREATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.CREATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.CREATED_AT}][ne]`]: Joi.date().iso().optional(),

  // Filters - updatedAt
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.UPDATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.UPDATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.UPDATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.UPDATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.UPDATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${ROLE_ASSIGNMENT_FILTERABLE_FIELDS.UPDATED_AT}][ne]`]: Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * POST /admin/role-assignments
 * Create role assignment schema
 * Must specify either membershipId OR groupId (not both)
 */
export const createRoleAssignmentSchema = Joi.object({
  roleId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid role ID format',
    'any.required': 'Role ID is required',
  }),
  environmentId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid environment ID format',
    'any.required': 'Environment ID is required',
  }),
  membershipId: Joi.string().uuid().optional().messages({
    'string.guid': 'Invalid membership ID format',
  }),
  groupId: Joi.string().uuid().optional().messages({
    'string.guid': 'Invalid group ID format',
  }),
})
  .xor('membershipId', 'groupId')
  .messages({
    'object.xor': 'Either membershipId or groupId must be provided, but not both',
    'object.missing': 'Either membershipId or groupId is required',
  });

/**
 * DELETE /admin/role-assignments/{assignmentId}
 * Assignment ID parameter validation
 */
export const assignmentIdParamSchema = Joi.object({
  assignmentId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid assignment ID format',
    'any.required': 'Assignment ID is required',
  }),
});
