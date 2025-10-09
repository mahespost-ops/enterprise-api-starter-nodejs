/**
 * Admin Session Validation Schemas
 * Per STANDARDS.md:
 * - Keep field names in camelCase (consistent with API contract)
 * - NEVER allow user modification of system-managed fields
 * - Date filters use ISO 8601 format
 */

import Joi from 'joi';

/**
 * Query parameters for listing sessions
 */
export const listSessionsQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),

  // Sorting (e.g., "createdAt", "-lastAccessedAt")
  sort: Joi.string()
    .pattern(/^-?(createdAt|lastAccessedAt|expiresAt|requestCount|isActive)$/)
    .optional(),

  // Search (full-text across userAgent, ipAddress, lastActivityType)
  search: Joi.string().min(1).max(200).optional(),

  // Field selection (comma-separated list)
  fields: Joi.string().optional(),

  // Filters
  'filter[userId]': Joi.string().uuid().optional(),
  'filter[deviceId]': Joi.string().uuid().optional(),
  'filter[isActive]': Joi.boolean().optional(),
  'filter[isRevoked]': Joi.boolean().optional(),

  // Date filters with operators
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  'filter[createdAt][lte]': Joi.date().iso().optional(),
  'filter[createdAt][gt]': Joi.date().iso().optional(),
  'filter[createdAt][lt]': Joi.date().iso().optional(),
  'filter[createdAt][eq]': Joi.date().iso().optional(),
  'filter[createdAt][ne]': Joi.date().iso().optional(),

  'filter[lastAccessedAt][gte]': Joi.date().iso().optional(),
  'filter[lastAccessedAt][lte]': Joi.date().iso().optional(),
  'filter[lastAccessedAt][gt]': Joi.date().iso().optional(),
  'filter[lastAccessedAt][lt]': Joi.date().iso().optional(),
  'filter[lastAccessedAt][eq]': Joi.date().iso().optional(),
  'filter[lastAccessedAt][ne]': Joi.date().iso().optional(),

  'filter[expiresAt][gte]': Joi.date().iso().optional(),
  'filter[expiresAt][lte]': Joi.date().iso().optional(),
  'filter[expiresAt][gt]': Joi.date().iso().optional(),
  'filter[expiresAt][lt]': Joi.date().iso().optional(),
  'filter[expiresAt][eq]': Joi.date().iso().optional(),
  'filter[expiresAt][ne]': Joi.date().iso().optional(),
}).options({ allowUnknown: false, stripUnknown: true });

/**
 * Path parameter for sessionId
 */
export const sessionIdParamSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
}).options({ allowUnknown: false });

/**
 * Path parameter for userId (for revoking all user sessions)
 */
export const userIdParamSchema = Joi.object({
  userId: Joi.string().uuid().required(),
}).options({ allowUnknown: false });
