/**
 * Webhook Routes
 * Routes for webhook-related operations
 */

import { Router } from 'express';
import * as controller from '../controllers/webhook.controller';
import { authenticate, validateTenantContext } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { webhookSchemas } from '../middleware/validation-schemas';

const router = Router({ mergeParams: true });

/**
 * Middleware order (applied in sequence):
 * 1. Authentication (verify JWT)
 * 2. Parameter validation (req.params)
 * 3. Tenant context validation (orgId/envId match JWT)
 * 4. Authorization (RBAC)
 * 5. Query/Body validation
 * 6. Controller
 */

/**
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/webhooks
 * @desc    List webhooks for an environment
 * @access  Private (requires webhooks:read)
 */
router.get(
  '/',
  authenticate,
  validate.params(webhookSchemas.webhookEnvPathParamsSchema),
  validateTenantContext,
  authorize(['webhooks:read']),
  validate.query(webhookSchemas.listWebhooksQuerySchema),
  controller.listWebhooks
);

/**
 * @route   POST /api/v1/orgs/:orgId/envs/:envId/webhooks
 * @desc    Create new webhook
 * @access  Private (requires webhooks:manage)
 */
router.post(
  '/',
  authenticate,
  validate.params(webhookSchemas.webhookEnvPathParamsSchema),
  validateTenantContext,
  authorize(['webhooks:manage']),
  validate.body(webhookSchemas.createWebhookSchema),
  controller.createWebhook
);

/**
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId
 * @desc    Get webhook details
 * @access  Private (requires webhooks:read)
 */
router.get(
  '/:webhookId',
  authenticate,
  validate.params(webhookSchemas.webhookPathParamsSchema),
  validateTenantContext,
  authorize(['webhooks:read']),
  controller.getWebhook
);

/**
 * @route   PUT /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId
 * @desc    Update webhook
 * @access  Private (requires webhooks:manage)
 */
router.put(
  '/:webhookId',
  authenticate,
  validate.params(webhookSchemas.webhookPathParamsSchema),
  validateTenantContext,
  authorize(['webhooks:manage']),
  validate.body(webhookSchemas.updateWebhookSchema),
  controller.updateWebhook
);

/**
 * @route   DELETE /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId
 * @desc    Delete webhook
 * @access  Private (requires webhooks:manage)
 */
router.delete(
  '/:webhookId',
  authenticate,
  validate.params(webhookSchemas.webhookPathParamsSchema),
  validateTenantContext,
  authorize(['webhooks:manage']),
  controller.deleteWebhook
);

/**
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId/deliveries
 * @desc    List webhook deliveries
 * @access  Private (requires webhooks:read)
 */
router.get(
  '/:webhookId/deliveries',
  authenticate,
  validate.params(webhookSchemas.webhookPathParamsSchema),
  validateTenantContext,
  authorize(['webhooks:read']),
  validate.query(webhookSchemas.listWebhookDeliveriesQuerySchema),
  controller.listWebhookDeliveries
);

/**
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId/deliveries/:deliveryId
 * @desc    Get webhook delivery details
 * @access  Private (requires webhooks:read)
 */
router.get(
  '/:webhookId/deliveries/:deliveryId',
  authenticate,
  validate.params(webhookSchemas.webhookDeliveryPathParamsSchema),
  validateTenantContext,
  authorize(['webhooks:read']),
  controller.getWebhookDelivery
);

/**
 * @route   POST /api/v1/orgs/:orgId/envs/:envId/webhooks/:webhookId/deliveries/:deliveryId/retry
 * @desc    Retry failed webhook delivery
 * @access  Private (requires webhooks:manage)
 */
router.post(
  '/:webhookId/deliveries/:deliveryId/retry',
  authenticate,
  validate.params(webhookSchemas.webhookDeliveryPathParamsSchema),
  validateTenantContext,
  authorize(['webhooks:manage']),
  controller.retryWebhookDelivery
);

export default router;
