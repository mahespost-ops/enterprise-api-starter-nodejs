/**
 * Event Routes
 * Routes for event-related operations (read-only)
 */

import { Router } from 'express';
import * as controller from '../controllers/event.controller';
import { authenticate, validateTenantContext } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { eventSchemas } from '../middleware/validation-schemas';

const router = Router({ mergeParams: true });

/**
 * Middleware order (applied in sequence):
 * 1. Authentication (verify JWT)
 * 2. Parameter validation (req.params)
 * 3. Tenant context validation (orgId/envId match JWT)
 * 4. Authorization (RBAC)
 * 5. Query validation
 * 6. Controller
 */

/**
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/events
 * @desc    List events for an environment (cursor pagination)
 * @access  Private (requires events:read)
 */
router.get(
  '/',
  authenticate,
  validate.params(eventSchemas.eventEnvPathParamsSchema),
  validateTenantContext,
  authorize(['events:read']),
  validate.query(eventSchemas.listEventsQuerySchema),
  controller.listEvents
);

/**
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/events/:eventId
 * @desc    Get event details
 * @access  Private (requires events:read)
 */
router.get(
  '/:eventId',
  authenticate,
  validate.params(eventSchemas.eventPathParamsSchema),
  validateTenantContext,
  authorize(['events:read']),
  controller.getEvent
);

export default router;
