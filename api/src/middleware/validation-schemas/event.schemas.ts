/**
 * Validation Schemas: Events
 * Joi validation schemas for event endpoints
 */

import Joi from 'joi';

/**
 * Event path parameters (without eventId)
 */
export const eventEnvPathParamsSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
  envId: Joi.string().uuid().required().messages({
    'string.guid': 'Environment ID must be a valid UUID',
    'any.required': 'Environment ID is required',
  }),
});

/**
 * Event path parameters (with eventId)
 */
export const eventPathParamsSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
  envId: Joi.string().uuid().required().messages({
    'string.guid': 'Environment ID must be a valid UUID',
    'any.required': 'Environment ID is required',
  }),
  eventId: Joi.string().uuid().required().messages({
    'string.guid': 'Event ID must be a valid UUID',
    'any.required': 'Event ID is required',
  }),
});

/**
 * List Events Query Parameters (Cursor Pagination)
 * GET /api/v1/orgs/{orgId}/envs/{envId}/events
 *
 * High-volume endpoint supporting cursor-based pagination for 10M+ records
 */
export const listEventsQuerySchema = Joi.object({
  // Cursor pagination
  limit: Joi.number().integer().min(1).max(1000).default(100).optional().messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 1000',
  }),
  cursor: Joi.string().base64().optional().messages({
    'string.base64': 'Cursor must be a valid base64 string',
  }),

  // Sorting (limited for cursor pagination)
  sort: Joi.string()
    .valid('timestamp', '-timestamp', 'verb', '-verb', 'actorType', '-actorType')
    .default('-timestamp')
    .optional()
    .messages({
      'any.only': 'Sort must be one of: timestamp, -timestamp, verb, -verb, actorType, -actorType',
    }),

  // Search (full-text)
  search: Joi.string().max(255).optional(),

  // Field selection
  fields: Joi.string().optional(),

  // Filters - verb
  'filter[verb]': Joi.string().max(100).optional(),
  'filter[verb][in]': Joi.string()
    .custom((value) => {
      const verbs = value.split(',').map((v: string) => v.trim());
      if (verbs.some((v: string) => v.length > 100)) {
        throw new Error('Each verb must not exceed 100 characters');
      }
      return value;
    })
    .optional(),
  'filter[verb][nin]': Joi.string()
    .custom((value) => {
      const verbs = value.split(',').map((v: string) => v.trim());
      if (verbs.some((v: string) => v.length > 100)) {
        throw new Error('Each verb must not exceed 100 characters');
      }
      return value;
    })
    .optional(),

  // Filters - actorType
  'filter[actorType]': Joi.string().valid('User', 'System').optional().messages({
    'any.only': 'Actor type must be either "User" or "System"',
  }),
  'filter[actorType][in]': Joi.string()
    .custom((value) => {
      const types = value.split(',').map((t: string) => t.trim());
      const valid = types.every((t: string) => ['User', 'System'].includes(t));
      if (!valid) throw new Error('Invalid actor type in filter');
      return value;
    })
    .optional(),

  // Filters - actorId
  'filter[actorId]': Joi.string().uuid().optional().messages({
    'string.guid': 'Actor ID must be a valid UUID',
  }),
  'filter[actorId][in]': Joi.string()
    .custom((value) => {
      const ids = value.split(',').map((id: string) => id.trim());
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!ids.every((id: string) => uuidRegex.test(id))) {
        throw new Error('All actor IDs must be valid UUIDs');
      }
      return value;
    })
    .optional(),

  // Filters - timestamp range
  'filter[timestamp][eq]': Joi.date().iso().optional(),
  'filter[timestamp][ne]': Joi.date().iso().optional(),
  'filter[timestamp][gt]': Joi.date().iso().optional(),
  'filter[timestamp][gte]': Joi.date().iso().optional(),
  'filter[timestamp][lt]': Joi.date().iso().optional(),
  'filter[timestamp][lte]': Joi.date().iso().optional(),

  // Filters - webhook events
  'filter[isWebhookEvent]': Joi.string().valid('true', 'false').optional(),

  // Filters - denormalized organization/environment
  'filter[organizationId]': Joi.string().uuid().optional().messages({
    'string.guid': 'Organization ID must be a valid UUID',
  }),
  'filter[organizationId][in]': Joi.string()
    .custom((value) => {
      const ids = value.split(',').map((id: string) => id.trim());
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!ids.every((id: string) => uuidRegex.test(id))) {
        throw new Error('All organization IDs must be valid UUIDs');
      }
      return value;
    })
    .optional(),
  'filter[environmentId]': Joi.string().uuid().optional().messages({
    'string.guid': 'Environment ID must be a valid UUID',
  }),
  'filter[environmentId][in]': Joi.string()
    .custom((value) => {
      const ids = value.split(',').map((id: string) => id.trim());
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!ids.every((id: string) => uuidRegex.test(id))) {
        throw new Error('All environment IDs must be valid UUIDs');
      }
      return value;
    })
    .optional(),
}).unknown(true); // Allow other filter variations for future extensibility
