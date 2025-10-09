/**
 * Validation Schemas: Environments
 * Joi validation schemas for environment endpoints
 */

import Joi from 'joi';
import { ENVIRONMENT_STATUS } from '../../constants/environment.constants';

/**
 * UUID path parameters
 */
export const envPathParamsSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
  envId: Joi.string().uuid().required().messages({
    'string.guid': 'Environment ID must be a valid UUID',
    'any.required': 'Environment ID is required',
  }),
});

export const orgIdParamSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
});

/**
 * List Environments Query Parameters
 * GET /api/v1/orgs/{orgId}/envs
 */
export const listEnvironmentsQuerySchema = Joi.object({
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
  'filter[type]': Joi.string().valid('live', 'sandbox').optional(),
  'filter[type][in]': Joi.string()
    .custom((value) => {
      const types = value.split(',');
      const valid = types.every((t: string) => ['live', 'sandbox'].includes(t));
      if (!valid) throw new Error('Invalid environment type in filter');
      return value;
    })
    .optional(),
  'filter[status]': Joi.string().valid(ENVIRONMENT_STATUS.ACTIVE, ENVIRONMENT_STATUS.INACTIVE).optional(),
  'filter[isDefault]': Joi.string().valid('true', 'false').optional(),
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  'filter[createdAt][lte]': Joi.date().iso().optional(),
  'filter[updatedAt][gte]': Joi.date().iso().optional(),
}).unknown(true); // Allow other filter variations

/**
 * Create Environment Request Body
 * POST /api/v1/orgs/{orgId}/envs
 */
export const createEnvironmentSchema = Joi.object({
  name: Joi.string().min(1).max(50).required().messages({
    'string.min': 'Environment name must be at least 1 character',
    'string.max': 'Environment name must not exceed 50 characters',
    'any.required': 'Environment name is required',
  }),
  type: Joi.string().valid('live', 'sandbox').required().messages({
    'any.only': 'Environment type must be either "live" or "sandbox"',
    'any.required': 'Environment type is required',
  }),
  description: Joi.string().max(500).allow(null, '').optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  isDefault: Joi.boolean().default(false).optional().messages({
    'boolean.base': 'isDefault must be a boolean',
  }),
  metadata: Joi.object().allow(null).optional().messages({
    'object.base': 'Metadata must be an object',
  }),
});

/**
 * Update Environment Request Body
 * PUT /api/v1/orgs/{orgId}/envs/{envId}
 *
 * Fields:
 * - name, description, isDefault, metadata, isActive
 *
 * System-managed fields excluded:
 * - type (cannot be changed after creation)
 * - organizationId (immutable)
 */
export const updateEnvironmentSchema = Joi.object({
  name: Joi.string().min(1).max(50).optional().messages({
    'string.min': 'Environment name must be at least 1 character',
    'string.max': 'Environment name must not exceed 50 characters',
  }),
  description: Joi.string().max(500).allow(null, '').optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  isDefault: Joi.boolean().optional().messages({
    'boolean.base': 'isDefault must be a boolean',
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
