/**
 * Admin Event Type Subscription Validation Schemas
 * Validates request data for admin event type subscription endpoints
 */

import Joi from 'joi';

/**
 * Query parameters for listing event type subscriptions (GET /admin/event-type-subscriptions)
 */
export const listEventTypeSubscriptionsQuerySchema = Joi.object({
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
  'filter[eventTypeId]': Joi.string().uuid().optional(),
  'filter[eventTypeVerb]': Joi.string().max(100).optional(),
  'filter[webhookId]': Joi.string().uuid().optional(),
  'filter[webhookName]': Joi.string().max(255).optional(),
  'filter[webhookUrl]': Joi.string().max(2048).optional(),
  'filter[isActive]': Joi.boolean().optional(),

  // Date filters for createdAt
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  'filter[createdAt][lte]': Joi.date().iso().optional(),
  'filter[createdAt][gt]': Joi.date().iso().optional(),
  'filter[createdAt][lt]': Joi.date().iso().optional(),
  'filter[createdAt][eq]': Joi.date().iso().optional(),
  'filter[createdAt][ne]': Joi.date().iso().optional(),

  // Date filters for updatedAt
  'filter[updatedAt][gte]': Joi.date().iso().optional(),
  'filter[updatedAt][lte]': Joi.date().iso().optional(),
  'filter[updatedAt][gt]': Joi.date().iso().optional(),
  'filter[updatedAt][lt]': Joi.date().iso().optional(),
  'filter[updatedAt][eq]': Joi.date().iso().optional(),
  'filter[updatedAt][ne]': Joi.date().iso().optional(),
}).options({ allowUnknown: false });
