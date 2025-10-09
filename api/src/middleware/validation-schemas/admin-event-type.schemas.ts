/**
 * Admin Event Type Validation Schemas
 * Validates request data for admin event type management endpoints
 */

import Joi from 'joi';

/**
 * Query parameters for listing event types (GET /admin/event-types)
 */
export const listEventTypesQuerySchema = Joi.object({
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
  'filter[verb]': Joi.string().max(100).optional(),
  'filter[verb][in]': Joi.string().optional(), // comma-separated verbs
  'filter[httpMethod]': Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE').optional(),
  'filter[httpMethod][in]': Joi.string().optional(), // comma-separated methods
  'filter[isWebhookEvent]': Joi.boolean().optional(),

  // Date filters for createdAt
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  'filter[createdAt][lte]': Joi.date().iso().optional(),
  'filter[createdAt][gt]': Joi.date().iso().optional(),
  'filter[createdAt][lt]': Joi.date().iso().optional(),
  'filter[createdAt][eq]': Joi.date().iso().optional(),
  'filter[createdAt][ne]': Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * Path parameter validation for eventTypeId
 */
export const eventTypeIdParamSchema = Joi.object({
  eventTypeId: Joi.string().uuid().required(),
}).options({ allowUnknown: false });

/**
 * Request body for creating event type (POST /admin/event-types)
 */
export const createEventTypeBodySchema = Joi.object({
  verb: Joi.string().min(1).max(100).required(),
  httpMethod: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE').required(),
  httpPath: Joi.string().min(1).max(500).required(),
  description: Joi.string().max(500).optional().allow(null),
  isWebhookEvent: Joi.boolean().optional().default(false),
}).options({ allowUnknown: false });

/**
 * Request body for updating event type (PUT /admin/event-types/:eventTypeId)
 * Note: verb cannot be changed once created
 */
export const updateEventTypeBodySchema = Joi.object({
  httpMethod: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE').optional(),
  httpPath: Joi.string().min(1).max(500).optional(),
  description: Joi.string().max(500).optional().allow(null),
  isWebhookEvent: Joi.boolean().optional(),
}).options({ allowUnknown: false });
