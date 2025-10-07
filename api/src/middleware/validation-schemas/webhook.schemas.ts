/**
 * Validation Schemas: Webhooks
 * Joi validation schemas for webhook endpoints
 */

import Joi from 'joi';

/**
 * Webhook environment path parameters (without webhookId)
 */
export const webhookEnvPathParamsSchema = Joi.object({
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
 * Webhook path parameters (with webhookId)
 */
export const webhookPathParamsSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
  envId: Joi.string().uuid().required().messages({
    'string.guid': 'Environment ID must be a valid UUID',
    'any.required': 'Environment ID is required',
  }),
  webhookId: Joi.string().uuid().required().messages({
    'string.guid': 'Webhook ID must be a valid UUID',
    'any.required': 'Webhook ID is required',
  }),
});

export const webhookDeliveryPathParamsSchema = Joi.object({
  orgId: Joi.string().uuid().required().messages({
    'string.guid': 'Organization ID must be a valid UUID',
    'any.required': 'Organization ID is required',
  }),
  envId: Joi.string().uuid().required().messages({
    'string.guid': 'Environment ID must be a valid UUID',
    'any.required': 'Environment ID is required',
  }),
  webhookId: Joi.string().uuid().required().messages({
    'string.guid': 'Webhook ID must be a valid UUID',
    'any.required': 'Webhook ID is required',
  }),
  deliveryId: Joi.string().uuid().required().messages({
    'string.guid': 'Delivery ID must be a valid UUID',
    'any.required': 'Delivery ID is required',
  }),
});

/**
 * List Webhooks Query Parameters (Offset Pagination)
 * GET /api/v1/orgs/{orgId}/envs/{envId}/webhooks
 */
export const listWebhooksQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20).optional().messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),
  offset: Joi.number().integer().min(0).default(0).optional().messages({
    'number.min': 'Offset must be at least 0',
  }),

  // Sorting
  sort: Joi.string().optional(),

  // Search
  search: Joi.string().max(255).optional(),

  // Field selection
  fields: Joi.string().optional(),

  // Filters
  'filter[isActive]': Joi.string().valid('true', 'false').optional(),
  'filter[authMethod]': Joi.string().valid('none', 'hmac', 'jwt', 'basic', 'digest').optional(),
  'filter[authMethod][in]': Joi.string()
    .custom((value) => {
      const methods = value.split(',').map((m: string) => m.trim());
      const valid = methods.every((m: string) => ['none', 'hmac', 'jwt', 'basic', 'digest'].includes(m));
      if (!valid) throw new Error('Invalid auth method in filter');
      return value;
    })
    .optional(),
  'filter[authMethod][nin]': Joi.string()
    .custom((value) => {
      const methods = value.split(',').map((m: string) => m.trim());
      const valid = methods.every((m: string) => ['none', 'hmac', 'jwt', 'basic', 'digest'].includes(m));
      if (!valid) throw new Error('Invalid auth method in filter');
      return value;
    })
    .optional(),
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  'filter[createdAt][lte]': Joi.date().iso().optional(),
  'filter[updatedAt][gte]': Joi.date().iso().optional(),
  'filter[updatedAt][lte]': Joi.date().iso().optional(),
  'filter[lastSuccessAt][gte]': Joi.date().iso().optional(),
  'filter[lastSuccessAt][lte]': Joi.date().iso().optional(),
  'filter[lastFailureAt][gte]': Joi.date().iso().optional(),
  'filter[lastFailureAt][lte]': Joi.date().iso().optional(),
}).unknown(true); // Allow other filter variations

/**
 * Retry configuration schema
 */
const retryConfigSchema = Joi.object({
  maxAttempts: Joi.number().integer().min(1).max(10).required().messages({
    'number.min': 'Max attempts must be at least 1',
    'number.max': 'Max attempts must not exceed 10',
    'any.required': 'Max attempts is required',
  }),
  backoffMultiplier: Joi.number().min(1).max(10).required().messages({
    'number.min': 'Backoff multiplier must be at least 1',
    'number.max': 'Backoff multiplier must not exceed 10',
    'any.required': 'Backoff multiplier is required',
  }),
  maxBackoffSeconds: Joi.number().integer().min(60).max(86400).required().messages({
    'number.min': 'Max backoff must be at least 60 seconds',
    'number.max': 'Max backoff must not exceed 86400 seconds (24 hours)',
    'any.required': 'Max backoff seconds is required',
  }),
});

/**
 * Auth config validation (varies by authMethod)
 */
const authConfigSchema = Joi.when('authMethod', [
  {
    is: 'hmac',
    then: Joi.object({
      secret: Joi.string().min(16).max(256).required().messages({
        'string.min': 'HMAC secret must be at least 16 characters',
        'string.max': 'HMAC secret must not exceed 256 characters',
        'any.required': 'HMAC secret is required',
      }),
      algorithm: Joi.string().valid('sha256', 'sha512').default('sha256').optional(),
    }),
  },
  {
    is: 'jwt',
    then: Joi.object({
      secret: Joi.string().min(16).max(512).required().messages({
        'string.min': 'JWT secret must be at least 16 characters',
        'string.max': 'JWT secret must not exceed 512 characters',
        'any.required': 'JWT secret is required',
      }),
      algorithm: Joi.string().valid('HS256', 'HS512', 'RS256').default('HS256').optional(),
    }),
  },
  {
    is: 'basic',
    then: Joi.object({
      username: Joi.string().max(255).required().messages({
        'any.required': 'Username is required for Basic auth',
      }),
      password: Joi.string().max(255).required().messages({
        'any.required': 'Password is required for Basic auth',
      }),
    }),
  },
  {
    is: 'digest',
    then: Joi.object({
      username: Joi.string().max(255).required().messages({
        'any.required': 'Username is required for Digest auth',
      }),
      password: Joi.string().max(255).required().messages({
        'any.required': 'Password is required for Digest auth',
      }),
    }),
  },
  {
    is: 'none',
    then: Joi.allow(null).optional(),
  },
]);

/**
 * Create Webhook Request Body
 * POST /api/v1/orgs/{orgId}/envs/{envId}/webhooks
 */
export const createWebhookSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Webhook name must be at least 1 character',
    'string.max': 'Webhook name must not exceed 255 characters',
    'any.required': 'Webhook name is required',
  }),
  url: Joi.string().uri({ scheme: ['https'] }).max(2048).required().messages({
    'string.uri': 'URL must be a valid HTTPS URL',
    'string.max': 'URL must not exceed 2048 characters',
    'any.required': 'URL is required',
  }),
  eventTypes: Joi.array().items(Joi.string().max(100)).min(1).required().messages({
    'array.min': 'At least one event type is required',
    'any.required': 'Event types are required',
  }),
  authMethod: Joi.string().valid('none', 'hmac', 'jwt', 'basic', 'digest').default('none').optional().messages({
    'any.only': 'Auth method must be one of: none, hmac, jwt, basic, digest',
  }),
  authConfig: authConfigSchema.optional().messages({
    'object.base': 'Auth config must be an object',
  }),
  retryConfig: retryConfigSchema.default({
    maxAttempts: 5,
    backoffMultiplier: 2,
    maxBackoffSeconds: 3600,
  }).optional(),
  isActive: Joi.boolean().default(true).optional().messages({
    'boolean.base': 'isActive must be a boolean',
  }),
  metadata: Joi.object().allow(null).optional().messages({
    'object.base': 'Metadata must be an object',
  }),
});

/**
 * Update Webhook Request Body
 * PUT /api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}
 *
 * Fields:
 * - name, url, eventTypes, authMethod, authConfig, retryConfig, isActive, metadata
 *
 * System-managed fields excluded:
 * - environmentId (immutable)
 * - failureCount (system-managed)
 * - lastSuccessAt (system-managed)
 * - lastFailureAt (system-managed)
 */
export const updateWebhookSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional().messages({
    'string.min': 'Webhook name must be at least 1 character',
    'string.max': 'Webhook name must not exceed 255 characters',
  }),
  url: Joi.string().uri({ scheme: ['https'] }).max(2048).optional().messages({
    'string.uri': 'URL must be a valid HTTPS URL',
    'string.max': 'URL must not exceed 2048 characters',
  }),
  eventTypes: Joi.array().items(Joi.string().max(100)).min(1).optional().messages({
    'array.min': 'At least one event type is required',
  }),
  authMethod: Joi.string().valid('none', 'hmac', 'jwt', 'basic', 'digest').optional().messages({
    'any.only': 'Auth method must be one of: none, hmac, jwt, basic, digest',
  }),
  authConfig: authConfigSchema.optional().messages({
    'object.base': 'Auth config must be an object',
  }),
  retryConfig: retryConfigSchema.optional(),
  isActive: Joi.boolean().optional().messages({
    'boolean.base': 'isActive must be a boolean',
  }),
  metadata: Joi.object().allow(null).optional().messages({
    'object.base': 'Metadata must be an object',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

/**
 * List Webhook Deliveries Query Parameters
 * GET /api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries
 */
export const listWebhookDeliveriesQuerySchema = Joi.object({
  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(20).optional().messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),
  offset: Joi.number().integer().min(0).default(0).optional().messages({
    'number.min': 'Offset must be at least 0',
  }),

  // Sorting
  sort: Joi.string().optional(),

  // Filters
  'filter[status]': Joi.string().valid('pending', 'success', 'failed', 'retrying').optional(),
  'filter[status][in]': Joi.string()
    .custom((value) => {
      const statuses = value.split(',').map((s: string) => s.trim());
      const valid = statuses.every((s: string) => ['pending', 'success', 'failed', 'retrying'].includes(s));
      if (!valid) throw new Error('Invalid status in filter');
      return value;
    })
    .optional(),
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  'filter[createdAt][lte]': Joi.date().iso().optional(),
}).unknown(true);
