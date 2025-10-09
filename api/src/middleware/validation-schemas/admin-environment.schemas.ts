/**
 * Admin Environment Validation Schemas
 * Joi schemas for validating admin environment management requests
 */

import Joi from 'joi';

/**
 * GET /admin/environments
 * List all environments query parameters
 */
export const listEnvironmentsQuerySchema = Joi.object({
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
  'filter[organizationId]': Joi.string().uuid().optional(),

  // Filters - type
  'filter[type]': Joi.string().valid('live', 'sandbox').optional(),

  // Filters - isActive
  'filter[isActive]': Joi.boolean().optional(),

  // Filters - isDefault
  'filter[isDefault]': Joi.boolean().optional(),

  // Filters - createdAt
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  'filter[createdAt][lte]': Joi.date().iso().optional(),
  'filter[createdAt][gt]': Joi.date().iso().optional(),
  'filter[createdAt][lt]': Joi.date().iso().optional(),
  'filter[createdAt][eq]': Joi.date().iso().optional(),
  'filter[createdAt][ne]': Joi.date().iso().optional(),

  // Filters - updatedAt
  'filter[updatedAt][gte]': Joi.date().iso().optional(),
  'filter[updatedAt][lte]': Joi.date().iso().optional(),
  'filter[updatedAt][gt]': Joi.date().iso().optional(),
  'filter[updatedAt][lt]': Joi.date().iso().optional(),
  'filter[updatedAt][eq]': Joi.date().iso().optional(),
  'filter[updatedAt][ne]': Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * GET /admin/environments/{envId}
 * Environment ID parameter validation
 */
export const envIdParamSchema = Joi.object({
  envId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid environment ID format',
    'any.required': 'Environment ID is required',
  }),
});

/**
 * PUT /admin/environments/{envId}
 * Update environment schema
 */
export const updateEnvironmentSchema = Joi.object({
  name: Joi.string().min(1).max(50).optional().messages({
    'string.min': 'Name must be at least 1 character',
    'string.max': 'Name must not exceed 50 characters',
  }),
  type: Joi.string().valid('live', 'sandbox').optional().messages({
    'any.only': 'Type must be either live or sandbox',
  }),
  description: Joi.string().max(500).optional().allow(null).messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  isDefault: Joi.boolean().optional().messages({
    'boolean.base': 'isDefault must be a boolean value',
  }),
  isActive: Joi.boolean().optional().messages({
    'boolean.base': 'isActive must be a boolean value',
  }),
  metadata: Joi.object().optional().allow(null),
}).min(1); // At least one field must be provided
