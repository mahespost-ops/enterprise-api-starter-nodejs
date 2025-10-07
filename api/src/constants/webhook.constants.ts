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
