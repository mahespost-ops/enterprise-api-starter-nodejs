/**
 * Admin Webhook Delivery Routes
 * Routes for admin webhook delivery management
 */

import { Router } from 'express';
import * as controller from '../controllers/admin-webhook.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { deliveryIdParamSchema } from '../middleware/validation-schemas/admin-webhook.schemas';

const router = Router();

/**
 * @route   POST /api/v1/admin/webhook-deliveries/:deliveryId/retry
 * @desc    Retry failed webhook delivery (admin)
 * @access  Private (admin:webhooks:manage)
 */
router.post(
  '/:deliveryId/retry',
  authenticate,
  validate.params(deliveryIdParamSchema),
  authorize(['admin:webhooks:manage']),
  controller.retryWebhookDelivery,
);

export default router;
