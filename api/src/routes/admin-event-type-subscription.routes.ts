/**
 * Admin Event Type Subscription Routes
 * Routes for admin event type subscription endpoints (read-only)
 */

import { Router } from 'express';
import * as controller from '../controllers/admin-event-type-subscription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { listEventTypeSubscriptionsQuerySchema } from '../middleware/validation-schemas/admin-event-type-subscription.schemas';

const router = Router();

/**
 * @route   GET /api/v1/admin/event-type-subscriptions
 * @desc    List all event type subscriptions (admin)
 * @access  Private (admin:events:read)
 */
router.get(
  '/',
  authenticate,
  validate.query(listEventTypeSubscriptionsQuerySchema),
  authorize(['admin:events:read']),
  controller.listEventTypeSubscriptions,
);

export default router;
