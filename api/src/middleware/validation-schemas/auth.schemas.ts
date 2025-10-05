/**
 * Authentication Validation Schemas
 * Joi schemas for validating authentication-related requests
 */

import Joi from 'joi';
import { IDENTIFIER_REGEX, DELIVERY_METHOD } from '../../constants/auth.constants';

/**
 * Fingerprint validation
 * Client generates a hashed fingerprint string using libraries like FingerprintJS, ThumbmarkJS, or ClientJS
 * Typically a 32-character hex string (e.g., "a1b2c3d4e5f6...") or similar hash format
 */
const fingerprintSchema = Joi.string().min(8).max(128);

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
    .pattern(IDENTIFIER_REGEX.PHONE_E164)
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
  preferredAuthMethod: Joi.string().valid(DELIVERY_METHOD.EMAIL, DELIVERY_METHOD.SMS).optional().default(DELIVERY_METHOD.EMAIL),
  timezone: Joi.string().optional(),
  fingerprint: fingerprintSchema.required().messages({
    'any.required': 'Fingerprint is required for security',
  }),
});

/**
 * POST /auth/request-token
 * Request magic token schema
 * Uses polymorphic 'identifier' field that accepts either email or E.164 phone number
 */
export const requestTokenSchema = Joi.object({
  identifier: Joi.string().required().custom((value, helpers) => {
    // Check if it's a valid email
    if (IDENTIFIER_REGEX.EMAIL.test(value)) {
      return value;
    }
    // Check if it's a valid E.164 phone number
    if (IDENTIFIER_REGEX.PHONE_E164.test(value)) {
      return value;
    }
    // Neither email nor phone
    return helpers.error('string.pattern.base');
  }).messages({
    'any.required': 'Identifier (email or phone) is required',
    'string.pattern.base': 'Identifier must be a valid email or E.164 phone number (e.g., +12025551234)',
  }),
  fingerprint: fingerprintSchema.required().messages({
    'any.required': 'Fingerprint is required for security',
  }),
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
    .pattern(/^\d{8}$/) // Updated to 8 digits (was 6) for improved security
    .optional()
    .messages({
      'string.pattern.base': 'Code must be an 8-digit number',
    }),
  fingerprint: fingerprintSchema.required().messages({
    'any.required': 'Fingerprint is required for security',
  }),
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
  fingerprint: fingerprintSchema.required().messages({
    'any.required': 'Fingerprint is required for security',
  }),
});
