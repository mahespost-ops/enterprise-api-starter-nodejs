/**
 * Validation Schemas: Organization Members
 * Joi validation schemas for member management endpoints
 */

import Joi from 'joi';
import { MEMBER_STATUS } from '../../constants/member.constants';

/**
 * UUID path parameters for member endpoints
 */
export const memberPathParamsSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
  memberId: Joi.string().uuid().required().messages({
    'string.guid': 'Member ID must be a valid UUID',
    'any.required': 'Member ID is required',
  }),
});

export const memberWithEnvParamsSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
  envId: Joi.string().uuid().required().messages({
    'string.guid': 'Environment ID must be a valid UUID',
    'any.required': 'Environment ID is required',
  }),
  memberId: Joi.string().uuid().required().messages({
    'string.guid': 'Member ID must be a valid UUID',
    'any.required': 'Member ID is required',
  }),
});

export const orgIdParamSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
});

/**
 * List Members Query Parameters
 * GET /api/v1/orgs/{orgId}/members
 */
export const listMembersQuerySchema = Joi.object({
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
  'filter[status]': Joi.string()
    .valid(MEMBER_STATUS.INVITED, MEMBER_STATUS.ACTIVE, MEMBER_STATUS.SUSPENDED)
    .optional(),
  'filter[status][in]': Joi.string()
    .custom((value) => {
      const statuses = value.split(',');
      const validStatuses = [
        MEMBER_STATUS.INVITED,
        MEMBER_STATUS.ACTIVE,
        MEMBER_STATUS.SUSPENDED,
      ] as string[];
      const valid = statuses.every((s: string) => validStatuses.includes(s));
      if (!valid) throw new Error('Invalid status in filter');
      return value;
    })
    .optional(),
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  'filter[createdAt][lte]': Joi.date().iso().optional(),
  'filter[joinedAt][gte]': Joi.date().iso().optional(),
  'filter[joinedAt][lte]': Joi.date().iso().optional(),
}).unknown(true); // Allow other filter variations

/**
 * Invite Member Request Body
 * POST /api/v1/orgs/{orgId}/members
 *
 * Creates an invited member and sends invitation email
 */
export const inviteMemberSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  displayName: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Display name must be at least 1 character',
    'string.max': 'Display name must not exceed 100 characters',
    'any.required': 'Display name is required',
  }),
});

/**
 * Update Member Request Body
 * PUT /api/v1/orgs/{orgId}/members/{memberId}
 *
 * User-modifiable fields only:
 * - status (invited, active, suspended, inactive)
 *
 * System-managed fields excluded:
 * - userId, organizationId (immutable)
 * - invitationToken, invitationExpiresAt (system-managed)
 */
export const updateMemberSchema = Joi.object({
  status: Joi.string()
    .valid(MEMBER_STATUS.INVITED, MEMBER_STATUS.ACTIVE, MEMBER_STATUS.SUSPENDED)
    .required()
    .messages({
      'any.only': 'Status must be one of: invited, active, suspended',
      'any.required': 'Status is required',
    }),
});

/**
 * Start Impersonation Request Body
 * POST /api/v1/orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate
 * POST /api/v1/admin/users/{userId}/impersonate
 */
export const startImpersonationSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Reason must be at least 10 characters (for audit trail)',
    'string.max': 'Reason must not exceed 500 characters',
    'any.required': 'Reason is required for audit trail',
  }),
  expiresInMinutes: Joi.number().integer().min(5).max(480).default(60).optional().messages({
    'number.min': 'Session duration must be at least 5 minutes',
    'number.max': 'Session duration cannot exceed 480 minutes (8 hours)',
  }),
  organizationId: Joi.string().uuid().optional().messages({
    'string.guid': 'Organization ID must be a valid UUID',
  }),
  environmentId: Joi.string().uuid().optional().messages({
    'string.guid': 'Environment ID must be a valid UUID',
  }),
});
