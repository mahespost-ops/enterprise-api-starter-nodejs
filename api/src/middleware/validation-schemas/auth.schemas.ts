/**
 * Authentication Validation Schemas
 * Joi schemas for validating authentication-related requests
 */

import Joi from 'joi';

/**
 * Device fingerprint schema (reusable)
 */
const deviceFingerprintSchema = Joi.object({
  userAgent: Joi.string().optional(),
  timezone: Joi.string().optional(),
  acceptLanguage: Joi.string().optional(),
  screenResolution: Joi.string().optional(),
  colorDepth: Joi.number().integer().optional(),
});

/**
 * POST /auth/register
 * User registration schema
 */
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email address',
    'any.required': 'Email is required',
  }),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format (e.g., +12025551234)',
    }),
  firstName: Joi.string().min(1).max(50).required().messages({
    'string.min': 'First name must be at least 1 character',
    'string.max': 'First name must not exceed 50 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(1).max(50).required().messages({
    'string.min': 'Last name must be at least 1 character',
    'string.max': 'Last name must not exceed 50 characters',
    'any.required': 'Last name is required',
  }),
  preferredAuthMethod: Joi.string().valid('email', 'sms').optional().default('email'),
  timezone: Joi.string().optional(),
  deviceFingerprint: deviceFingerprintSchema.optional(),
});

/**
 * POST /auth/request-token
 * Request magic token schema
 */
export const requestTokenSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email address',
    'any.required': 'Email is required',
  }),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format',
    }),
  deliveryMethod: Joi.string().valid('email', 'sms').optional(),
  deviceFingerprint: deviceFingerprintSchema.optional(),
});

/**
 * POST /auth/verify-token
 * Verify magic token schema
 */
export const verifyTokenSchema = Joi.object({
  token: Joi.string().when('code', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }).messages({
    'any.required': 'Token or code is required',
  }),
  code: Joi.string()
    .pattern(/^\d{6}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Code must be a 6-digit number',
    }),
  deviceFingerprint: deviceFingerprintSchema.optional(),
}).or('token', 'code').messages({
  'object.missing': 'Either token or code must be provided',
});

/**
 * POST /auth/refresh
 * Refresh token schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(), // Can also come from cookie
});

/**
 * POST /auth/logout
 * Logout schema
 */
export const logoutSchema = Joi.object({
  refreshToken: Joi.string().optional(), // Can also come from cookie
});

/**
 * POST /auth/switch-context
 * Switch organization/environment context schema
 */
export const switchContextSchema = Joi.object({
  organizationId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
  environmentId: Joi.string().uuid().required().messages({
    'string.guid': 'Environment ID must be a valid UUID',
    'any.required': 'Environment ID is required',
  }),
  deviceFingerprint: deviceFingerprintSchema.optional(),
});
