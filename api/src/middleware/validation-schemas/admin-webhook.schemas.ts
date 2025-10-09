/**
 * Admin Webhook Validation Schemas
 * Validates request data for admin webhook management endpoints
 */

import Joi from 'joi';
import { WEBHOOK_AUTH_METHOD } from '../../constants/webhook.constants';

/**
 * Query parameters for listing webhooks (GET /admin/webhooks)
 */
export const listWebhooksQuerySchema = Joi.object({
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
  'filter[environmentId]': Joi.string().uuid().optional(),
  'filter[isActive]': Joi.boolean().optional(),
  'filter[authMethod]': Joi.string()
    .valid(
      WEBHOOK_AUTH_METHOD.NONE,
      WEBHOOK_AUTH_METHOD.HMAC,
      WEBHOOK_AUTH_METHOD.JWT,
      WEBHOOK_AUTH_METHOD.BASIC,
      WEBHOOK_AUTH_METHOD.DIGEST
    )
    .optional(),

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

  // Date filters for lastSuccessAt
  'filter[lastSuccessAt][gte]': Joi.date().iso().optional(),
  'filter[lastSuccessAt][lte]': Joi.date().iso().optional(),
  'filter[lastSuccessAt][gt]': Joi.date().iso().optional(),
  'filter[lastSuccessAt][lt]': Joi.date().iso().optional(),
  'filter[lastSuccessAt][eq]': Joi.date().iso().optional(),
  'filter[lastSuccessAt][ne]': Joi.date().iso().optional(),

  // Date filters for lastFailureAt
  'filter[lastFailureAt][gte]': Joi.date().iso().optional(),
  'filter[lastFailureAt][lte]': Joi.date().iso().optional(),
  'filter[lastFailureAt][gt]': Joi.date().iso().optional(),
  'filter[lastFailureAt][lt]': Joi.date().iso().optional(),
  'filter[lastFailureAt][eq]': Joi.date().iso().optional(),
  'filter[lastFailureAt][ne]': Joi.date().iso().optional(),
}).options({ allowUnknown: false });

/**
 * Path parameter validation for webhookId
 */
export const webhookIdParamSchema = Joi.object({
  webhookId: Joi.string().uuid().required(),
}).options({ allowUnknown: false });

/**
 * Request body for creating webhook (POST /admin/webhooks)
 */
export const createWebhookBodySchema = Joi.object({
  environmentId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string()
    .uri({ scheme: ['https'] })
    .max(2048)
    .required()
    .messages({
      'string.uri': 'Webhook URL must be a valid HTTPS URL',
    }),
  eventTypes: Joi.array().items(Joi.string().min(1).max(100)).min(1).required(),
  authMethod: Joi.string()
    .valid(
      WEBHOOK_AUTH_METHOD.NONE,
      WEBHOOK_AUTH_METHOD.HMAC,
      WEBHOOK_AUTH_METHOD.JWT,
      WEBHOOK_AUTH_METHOD.BASIC,
      WEBHOOK_AUTH_METHOD.DIGEST
    )
    .optional()
    .default(WEBHOOK_AUTH_METHOD.NONE),
  authConfig: Joi.object().optional().allow(null),
  retryConfig: Joi.object({
    maxAttempts: Joi.number().integer().min(1).max(10).optional(),
    backoffMultiplier: Joi.number().min(1).max(10).optional(),
    maxBackoffSeconds: Joi.number().integer().min(60).max(86400).optional(),
  })
    .optional()
    .default({
      maxAttempts: 5,
      backoffMultiplier: 2,
      maxBackoffSeconds: 3600,
    }),
  isActive: Joi.boolean().optional().default(true),
  metadata: Joi.object().optional().allow(null),
}).options({ allowUnknown: false });

/**
 * Request body for updating webhook (PUT /admin/webhooks/:webhookId)
 */
export const updateWebhookBodySchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  url: Joi.string()
    .uri({ scheme: ['https'] })
    .max(2048)
    .optional()
    .messages({
      'string.uri': 'Webhook URL must be a valid HTTPS URL',
    }),
  eventTypes: Joi.array().items(Joi.string().min(1).max(100)).min(1).optional(),
  authMethod: Joi.string()
    .valid(
      WEBHOOK_AUTH_METHOD.NONE,
      WEBHOOK_AUTH_METHOD.HMAC,
      WEBHOOK_AUTH_METHOD.JWT,
      WEBHOOK_AUTH_METHOD.BASIC,
      WEBHOOK_AUTH_METHOD.DIGEST
    )
    .optional(),
  authConfig: Joi.object().optional().allow(null),
  retryConfig: Joi.object({
    maxAttempts: Joi.number().integer().min(1).max(10).optional(),
    backoffMultiplier: Joi.number().min(1).max(10).optional(),
    maxBackoffSeconds: Joi.number().integer().min(60).max(86400).optional(),
  }).optional(),
  isActive: Joi.boolean().optional(),
  metadata: Joi.object().optional().allow(null),
}).options({ allowUnknown: false });
