/**
 * Admin Event Validation Schemas
 *
 * Validation schemas for admin event management endpoints.
 * Events use cursor-based pagination for high-volume scenarios (10M+ records).
 */

import Joi from 'joi';

/**
 * Query parameters for listing events (cursor pagination)
 */
export const listEventsQuerySchema = Joi.object({
  // Cursor pagination
  limit: Joi.number().integer().min(1).max(1000).default(100),
  cursor: Joi.string().base64().optional(),

  // Sorting
  sort: Joi.string()
    .valid('timestamp', '-timestamp', 'verb', '-verb', 'actorType', '-actorType')
    .optional()
    .default('-timestamp'),

  // Search
  search: Joi.string().min(1).max(200).optional(),

  // Field selection
  fields: Joi.string().optional(),

  // Filters - verb
  'filter[verb]': Joi.string().max(100).optional(),
  'filter[verb][in]': Joi.string().optional(), // Comma-separated list

  // Filters - actorType
  'filter[actorType]': Joi.string().valid('User', 'System').optional(),

  // Filters - actorId (UUID)
  'filter[actorId]': Joi.string().uuid().optional(),

  // Filters - organizationId
  'filter[organizationId]': Joi.string().uuid().optional(),
  'filter[organizationId][in]': Joi.string().optional(), // Comma-separated UUIDs

  // Filters - environmentId
  'filter[environmentId]': Joi.string().uuid().optional(),
  'filter[environmentId][in]': Joi.string().optional(), // Comma-separated UUIDs

  // Filters - isWebhookEvent
  'filter[isWebhookEvent]': Joi.boolean().optional(),

  // Filters - timestamp (date range)
  'filter[timestamp][gte]': Joi.date().iso().optional(),
  'filter[timestamp][lte]': Joi.date().iso().optional(),
  'filter[timestamp][gt]': Joi.date().iso().optional(),
  'filter[timestamp][lt]': Joi.date().iso().optional(),
  'filter[timestamp][eq]': Joi.date().iso().optional(),
  'filter[timestamp][ne]': Joi.date().iso().optional(),
}).options({ allowUnknown: false, stripUnknown: false });

/**
 * Path parameters for getting event by ID
 */
export const eventIdParamSchema = Joi.object({
  eventId: Joi.string().uuid().required().messages({
    'string.guid': 'Event ID must be a valid UUID',
    'any.required': 'Event ID is required',
  }),
}).options({ allowUnknown: false });
