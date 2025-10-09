/**
 * User Validation Schemas
 * Joi schemas for validating user-related requests
 */

import Joi from 'joi';
import { IDENTIFIER_REGEX } from '../../constants/auth.constants';

/**
 * PUT /users/me
 * Update current user profile schema
 */
export const updateCurrentUserSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Full name must be at least 1 character',
    'string.max': 'Full name must not exceed 100 characters',
  }),
  phoneNumber: Joi.string()
    .pattern(IDENTIFIER_REGEX.PHONE_E164)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format (e.g., +12025551234)',
    }),
  timezone: Joi.string().optional().allow(null),
  locale: Joi.string().optional().allow(null),
  // Note: email is intentionally omitted - cannot be updated via this endpoint
}).min(1); // At least one field must be provided

/**
 * PUT /users/me/devices/:deviceId
 * Update device schema
 * Note: trustStatus is managed by the system, not user-modifiable
 */
export const updateDeviceSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Device name must be at least 1 character',
    'string.max': 'Device name must not exceed 100 characters',
    'any.required': 'Device name is required',
  }),
});

/**
 * Parameter validation for UUID
 */
export const uuidParamSchema = Joi.object({
  deviceId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid device ID format',
      'any.required': 'Device ID is required',
    }),
});

export const sessionIdParamSchema = Joi.object({
  sessionId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid session ID format',
      'any.required': 'Session ID is required',
    }),
});

/**
 * Query parameters for listing organizations
 */
export const listOrganizationsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),
  includeInactive: Joi.boolean().optional().default(false),
});

/**
 * Query parameters for listing devices
 */
export const listDevicesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),
  trustStatus: Joi.string().valid('trusted', 'pending', 'revoked').optional(),
});

/**
 * Query parameters for listing sessions
 */
export const listSessionsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Query parameters for user permissions
 */
export const userPermissionsQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional().messages({
    'string.guid': 'Invalid organization ID format',
  }),
  envId: Joi.string().uuid().optional().messages({
    'string.guid': 'Invalid environment ID format',
  }),
});
