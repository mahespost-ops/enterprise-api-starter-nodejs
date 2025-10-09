/**
 * Admin Impersonation Validation Schemas
 * Joi schemas for validating admin impersonation endpoints
 *
 * Per STANDARDS.md:
 * - Field names match API contract (camelCase)
 * - No field transformations allowed
 * - Security-sensitive fields excluded from user input
 */

import Joi from 'joi';
import { IMPERSONATION_DURATION, IMPERSONATION_TYPE } from '../../constants/impersonation.constants';

/**
 * UUID parameter validation (reusable)
 */
const uuidParamSchema = Joi.object({
  userId: Joi.string().uuid().required(),
});

const sessionIdParamSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
});

/**
 * POST /admin/users/{userId}/impersonate
 * Start system-wide impersonation
 */
export const startImpersonationBodySchema = Joi.object({
  reason: Joi.string().min(3).max(500).required().messages({
    'string.min': 'Reason must be at least 3 characters',
    'string.max': 'Reason cannot exceed 500 characters',
    'any.required': 'Reason is required for audit compliance',
  }),
  expiresInMinutes: Joi.number()
    .integer()
    .min(IMPERSONATION_DURATION.MIN)
    .max(IMPERSONATION_DURATION.MAX)
    .default(IMPERSONATION_DURATION.DEFAULT)
    .optional()
    .messages({
      'number.min': `Impersonation duration must be at least ${IMPERSONATION_DURATION.MIN} minutes`,
      'number.max': `Impersonation duration cannot exceed ${IMPERSONATION_DURATION.MAX} minutes (8 hours)`,
      'number.integer': 'Duration must be a whole number',
    }),
}).options({ allowUnknown: false });

export const startImpersonationParamsSchema = uuidParamSchema;

/**
 * GET /admin/impersonation-sessions
 * List all impersonation sessions with filtering and pagination
 */
export const listImpersonationSessionsQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),

  // Sorting
  sort: Joi.string().optional(),

  // Search
  search: Joi.string().min(1).max(200).optional(),

  // Field selection
  fields: Joi.string().optional(),

  // Filters
  'filter[originalUserId]': Joi.string().uuid().optional(),
  'filter[impersonatedUserId]': Joi.string().uuid().optional(),
  'filter[environmentId]': Joi.string().uuid().optional(),
  'filter[impersonationType]': Joi.string()
    .valid(IMPERSONATION_TYPE.SYSTEM, IMPERSONATION_TYPE.ORGANIZATION)
    .optional(),
  'filter[isActive]': Joi.boolean().optional(),

  // Date range filters for startedAt
  'filter[startedAt][gte]': Joi.date().iso().optional(),
  'filter[startedAt][lte]': Joi.date().iso().optional(),
  'filter[startedAt][gt]': Joi.date().iso().optional(),
  'filter[startedAt][lt]': Joi.date().iso().optional(),
  'filter[startedAt][eq]': Joi.date().iso().optional(),
  'filter[startedAt][ne]': Joi.date().iso().optional(),

  // Date range filters for expiresAt
  'filter[expiresAt][gte]': Joi.date().iso().optional(),
  'filter[expiresAt][lte]': Joi.date().iso().optional(),
  'filter[expiresAt][gt]': Joi.date().iso().optional(),
  'filter[expiresAt][lt]': Joi.date().iso().optional(),
  'filter[expiresAt][eq]': Joi.date().iso().optional(),
  'filter[expiresAt][ne]': Joi.date().iso().optional(),

  // Date range filters for endedAt
  'filter[endedAt][gte]': Joi.date().iso().optional(),
  'filter[endedAt][lte]': Joi.date().iso().optional(),
  'filter[endedAt][gt]': Joi.date().iso().optional(),
  'filter[endedAt][lt]': Joi.date().iso().optional(),
  'filter[endedAt][eq]': Joi.date().iso().optional(),
  'filter[endedAt][ne]': Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * DELETE /admin/impersonation-sessions/{sessionId}
 * Force-end impersonation session
 */
export const forceEndSessionParamsSchema = sessionIdParamSchema;
