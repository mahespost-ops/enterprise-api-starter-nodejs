/**
 * Admin Organization Validation Schemas
 * Joi schemas for validating admin organization management requests
 */

import Joi from 'joi';
import { ORGANIZATION_FILTERABLE_FIELDS } from '../../constants/organization.constants';

/**
 * GET /admin/organizations
 * List all organizations query parameters
 */
export const listOrganizationsQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),

  // Sorting
  sort: Joi.string().optional(),

  // Search
  search: Joi.string().min(1).max(200).optional(),

  // Field selection
  fields: Joi.string().optional(),

  // Filters - isActive
  'filter[isActive]': Joi.boolean().optional(),

  // Filters - createdAt
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.CREATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.CREATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.CREATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.CREATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.CREATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.CREATED_AT}][ne]`]: Joi.date().iso().optional(),

  // Filters - updatedAt
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.UPDATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.UPDATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.UPDATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.UPDATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.UPDATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${ORGANIZATION_FILTERABLE_FIELDS.UPDATED_AT}][ne]`]: Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * GET /admin/organizations/{orgId}
 * Organization ID parameter validation
 */
export const orgIdParamSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid organization ID format',
    'any.required': 'Organization ID is required',
  }),
});

/**
 * PUT /admin/organizations/{orgId}
 * Update organization schema
 */
export const updateOrganizationSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional().messages({
    'string.min': 'Name must be at least 1 character',
    'string.max': 'Name must not exceed 200 characters',
  }),
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens',
      'string.min': 'Slug must be at least 1 character',
      'string.max': 'Slug must not exceed 100 characters',
    }),
  isActive: Joi.boolean().optional().messages({
    'boolean.base': 'isActive must be a boolean value',
  }),
  defaultEnvId: Joi.string().uuid().optional().allow(null).messages({
    'string.guid': 'Invalid environment ID format',
  }),
  metadata: Joi.object().optional(),
}).min(1); // At least one field must be provided
