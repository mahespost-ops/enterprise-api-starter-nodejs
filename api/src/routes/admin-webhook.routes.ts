/**
 * Admin Webhook Routes
 * Routes for admin webhook management endpoints
 */

import { Router } from 'express';
import * as controller from '../controllers/admin-webhook.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  listWebhooksQuerySchema,
  webhookIdParamSchema,
  createWebhookBodySchema,
  updateWebhookBodySchema,
} from '../middleware/validation-schemas/admin-webhook.schemas';

const router = Router();

/**
 * @route   GET /api/v1/admin/webhooks
 * @desc    List all webhooks (admin)
 * @access  Private (admin:webhooks:read)
 */
router.get(
  '/',
  authenticate,
  validate.query(listWebhooksQuerySchema),
  authorize(['admin:webhooks:read']),
  controller.listWebhooks,
);

/**
 * @route   POST /api/v1/admin/webhooks
 * @desc    Create webhook (admin)
 * @access  Private (admin:webhooks:manage)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin:webhooks:manage']),
  validate.body(createWebhookBodySchema),
  controller.createWebhook,
);

/**
 * @route   GET /api/v1/admin/webhooks/:webhookId
 * @desc    Get webhook by ID (admin)
 * @access  Private (admin:webhooks:read)
 */
router.get(
  '/:webhookId',
  authenticate,
  validate.params(webhookIdParamSchema),
  authorize(['admin:webhooks:read']),
  controller.getWebhookById,
);

/**
 * @route   PUT /api/v1/admin/webhooks/:webhookId
 * @desc    Update webhook (admin)
 * @access  Private (admin:webhooks:manage)
 */
router.put(
  '/:webhookId',
  authenticate,
  validate.params(webhookIdParamSchema),
  authorize(['admin:webhooks:manage']),
  validate.body(updateWebhookBodySchema),
  controller.updateWebhook,
);

/**
 * @route   DELETE /api/v1/admin/webhooks/:webhookId
 * @desc    Delete webhook (admin)
 * @access  Private (admin:webhooks:manage)
 */
router.delete(
  '/:webhookId',
  authenticate,
  validate.params(webhookIdParamSchema),
  authorize(['admin:webhooks:manage']),
  controller.deleteWebhook,
);

export default router;
