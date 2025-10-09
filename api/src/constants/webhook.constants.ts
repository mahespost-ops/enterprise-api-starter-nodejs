/**
 * Webhook Constants
 * Webhook and webhook delivery-related values
 */

/**
 * Webhook delivery status values
 * - pending: Delivery is queued but not yet attempted
 * - success: Delivery was successful
 * - failed: Delivery failed after all retries
 * - retrying: Delivery failed but will be retried
 */
export const WEBHOOK_DELIVERY_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  RETRYING: 'retrying',
} as const;

export type WebhookDeliveryStatus =
  (typeof WEBHOOK_DELIVERY_STATUS)[keyof typeof WEBHOOK_DELIVERY_STATUS];

/**
 * Webhook authentication methods
 * - none: No authentication
 * - hmac: HMAC signature authentication
 * - jwt: JWT token authentication
 * - basic: HTTP Basic authentication
 * - digest: HTTP Digest authentication
 */
export const WEBHOOK_AUTH_METHOD = {
  NONE: 'none',
  HMAC: 'hmac',
  JWT: 'jwt',
  BASIC: 'basic',
  DIGEST: 'digest',
} as const;

export type WebhookAuthMethod = (typeof WEBHOOK_AUTH_METHOD)[keyof typeof WEBHOOK_AUTH_METHOD];

/**
 * Fields that can be filtered in webhook queries
 * Used for query parameter validation and model filtering
 */
export const WEBHOOK_FILTERABLE_FIELDS = [
  'environmentId',
  'isActive',
  'authMethod',
  'createdAt',
  'updatedAt',
  'lastSuccessAt',
  'lastFailureAt',
] as const;

/**
 * Fields that can be sorted in webhook queries
 * Used for query parameter validation and model ordering
 */
export const WEBHOOK_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'lastSuccessAt',
  'lastFailureAt',
  'failureCount',
  'url',
  'name',
] as const;

/**
 * Fields that are searchable (full-text) in webhook queries
 * Used for search query implementation
 * Note: eventTypes is excluded as it's an array field that can't be searched with ILIKE
 */
export const WEBHOOK_SEARCHABLE_FIELDS = ['url', 'name'] as const;

/**
 * All selectable fields for field selection optimization
 * Matches Webhook model attributes
 */
export const WEBHOOK_SELECTABLE_FIELDS = [
  'id',
  'environmentId',
  'name',
  'url',
  'eventTypes',
  'authMethod',
  'authConfig',
  'retryConfig',
  'isActive',
  'failureCount',
  'lastSuccessAt',
  'lastFailureAt',
  'metadata',
  'createdAt',
  'updatedAt',
] as const;

/**
 * Event Type Subscription Constants
 * For reverse-lookup table (event_type → webhook)
 */

/**
 * Fields that can be filtered in subscription queries
 */
export const SUBSCRIPTION_FILTERABLE_FIELDS = [
  'eventTypeId',
  'eventTypeVerb',
  'webhookId',
  'webhookName',
  'webhookUrl',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

/**
 * Fields that can be sorted in subscription queries
 */
export const SUBSCRIPTION_SORTABLE_FIELDS = [
  'eventTypeVerb',
  'webhookName',
  'webhookUrl',
  'createdAt',
  'updatedAt',
  'isActive',
] as const;

/**
 * Fields that are searchable in subscription queries
 */
export const SUBSCRIPTION_SEARCHABLE_FIELDS = [
  'eventTypeVerb',
  'webhookName',
  'webhookUrl',
] as const;

/**
 * All selectable fields for subscription field selection
 */
export const SUBSCRIPTION_SELECTABLE_FIELDS = [
  'id',
  'eventTypeId',
  'eventTypeVerb',
  'webhookId',
  'webhookName',
  'webhookUrl',
  'webhookAuthMethod',
  'webhookAuthConfig',
  'webhookRetryConfig',
  'webhookMetadata',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;
