/**
 * Validation Schemas: Organizations
 * Joi validation schemas for organization endpoints
 */

import Joi from 'joi';

/**
 * UUID parameter validation
 */
export const orgIdParamSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
});

/**
 * Update Organization Request Body
 * PATCH /api/v1/orgs/{orgId}
 *
 * User-modifiable fields only (tenant self-service)
 * - name, description, logoUrl, website, metadata, isActive
 *
 * System-managed fields excluded:
 * - slug (cannot be changed after creation)
 * - defaultEnvId (managed by system)
 */
export const updateOrganizationSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Organization name must be at least 1 character',
    'string.max': 'Organization name must not exceed 100 characters',
  }),
  description: Joi.string().max(500).allow(null, '').optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  logoUrl: Joi.string().uri().max(500).allow(null, '').optional().messages({
    'string.uri': 'Logo URL must be a valid URI',
    'string.max': 'Logo URL must not exceed 500 characters',
  }),
  website: Joi.string().uri().max(500).allow(null, '').optional().messages({
    'string.uri': 'Website must be a valid URI',
    'string.max': 'Website must not exceed 500 characters',
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
