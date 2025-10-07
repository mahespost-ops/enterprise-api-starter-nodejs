/**
 * Admin User Validation Schemas
 * Joi schemas for validating admin user management requests
 */

import Joi from 'joi';
import { IDENTIFIER_REGEX } from '../../constants/auth.constants';
import { USER_FILTERABLE_FIELDS } from '../../constants/user.constants';

/**
 * GET /admin/users
 * List all users query parameters
 */
export const listUsersQuerySchema = Joi.object({
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
  [`filter[${USER_FILTERABLE_FIELDS.IS_ACTIVE}]`]: Joi.boolean().optional(),

  // Filters - organizationId
  [`filter[${USER_FILTERABLE_FIELDS.ORGANIZATION_ID}]`]: Joi.string().uuid().optional().messages({
    'string.guid': 'Invalid organization ID format',
  }),

  // Filters - emailVerified
  [`filter[${USER_FILTERABLE_FIELDS.EMAIL_VERIFIED}]`]: Joi.boolean().optional(),

  // Filters - createdAt
  [`filter[${USER_FILTERABLE_FIELDS.CREATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${USER_FILTERABLE_FIELDS.CREATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${USER_FILTERABLE_FIELDS.CREATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${USER_FILTERABLE_FIELDS.CREATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${USER_FILTERABLE_FIELDS.CREATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${USER_FILTERABLE_FIELDS.CREATED_AT}][ne]`]: Joi.date().iso().optional(),

  // Filters - updatedAt
  [`filter[${USER_FILTERABLE_FIELDS.UPDATED_AT}][gte]`]: Joi.date().iso().optional(),
  [`filter[${USER_FILTERABLE_FIELDS.UPDATED_AT}][lte]`]: Joi.date().iso().optional(),
  [`filter[${USER_FILTERABLE_FIELDS.UPDATED_AT}][gt]`]: Joi.date().iso().optional(),
  [`filter[${USER_FILTERABLE_FIELDS.UPDATED_AT}][lt]`]: Joi.date().iso().optional(),
  [`filter[${USER_FILTERABLE_FIELDS.UPDATED_AT}][eq]`]: Joi.date().iso().optional(),
  [`filter[${USER_FILTERABLE_FIELDS.UPDATED_AT}][ne]`]: Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * GET /admin/users/{userId}
 * User ID parameter validation
 */
export const userIdParamSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'User ID is required',
  }),
});

/**
 * PUT /admin/users/{userId}
 * Update user schema
 */
export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional().messages({
    'string.email': 'Invalid email format',
  }),
  name: Joi.string().min(1).max(200).optional().messages({
    'string.min': 'Name must be at least 1 character',
    'string.max': 'Name must not exceed 200 characters',
  }),
  givenName: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Given name must be at least 1 character',
    'string.max': 'Given name must not exceed 100 characters',
  }),
  familyName: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Family name must be at least 1 character',
    'string.max': 'Family name must not exceed 100 characters',
  }),
  phoneNumber: Joi.string()
    .pattern(IDENTIFIER_REGEX.PHONE_E164)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format (e.g., +12025551234)',
    }),
  picture: Joi.string().uri().optional().allow(null).messages({
    'string.uri': 'Picture must be a valid URI',
  }),
  locale: Joi.string().optional().allow(null),
  isActive: Joi.boolean().optional().messages({
    'boolean.base': 'isActive must be a boolean value',
  }),
}).min(1); // At least one field must be provided
