/**
 * Admin Device Validation Schemas
 * Validates request data for admin device management endpoints
 */

import Joi from 'joi';
import { TRUST_STATUS } from '../../constants/device.constants';

/**
 * Query parameters for listing devices (GET /admin/devices)
 */
export const listDevicesQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),

  // Sorting
  sort: Joi.string().optional(),

  // Search
  search: Joi.string().min(1).max(200).optional(),

  // Field selection
  fields: Joi.string().optional(),

  // Filters
  'filter[userId]': Joi.string().uuid().optional(),
  'filter[trustStatus]': Joi.string()
    .valid(...Object.values(TRUST_STATUS))
    .optional(),
  'filter[deviceType]': Joi.string().valid('desktop', 'mobile', 'tablet', 'unknown').optional(),
  'filter[isRevoked]': Joi.boolean().optional(),

  // Date filters for createdAt
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  'filter[createdAt][lte]': Joi.date().iso().optional(),
  'filter[createdAt][gt]': Joi.date().iso().optional(),
  'filter[createdAt][lt]': Joi.date().iso().optional(),
  'filter[createdAt][eq]': Joi.date().iso().optional(),
  'filter[createdAt][ne]': Joi.date().iso().optional(),

  // Date filters for lastUsedAt
  'filter[lastUsedAt][gte]': Joi.date().iso().optional(),
  'filter[lastUsedAt][lte]': Joi.date().iso().optional(),
  'filter[lastUsedAt][gt]': Joi.date().iso().optional(),
  'filter[lastUsedAt][lt]': Joi.date().iso().optional(),
  'filter[lastUsedAt][eq]': Joi.date().iso().optional(),
  'filter[lastUsedAt][ne]': Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * Path parameter validation for deviceId
 */
export const deviceIdParamSchema = Joi.object({
  deviceId: Joi.string().uuid().required(),
}).options({ allowUnknown: false });

/**
 * Request body for updating device (PUT /admin/devices/:deviceId)
 * Note: Only admin-controllable fields allowed
 * - name: User-friendly device name
 * - trustStatus: System-managed security field (admin can override)
 */
export const updateDeviceBodySchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  trustStatus: Joi.string()
    .valid(...Object.values(TRUST_STATUS))
    .optional(),
}).options({ allowUnknown: false });
