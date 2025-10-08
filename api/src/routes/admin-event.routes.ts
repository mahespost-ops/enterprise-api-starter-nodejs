/**
 * Admin Event Routes
 *
 * RESTful routes for admin event management operations.
 * Events use cursor pagination for high-volume scenarios (10M+ records).
 *
 * Middleware order per CLAUDE.md:
 * 1. Rate limiting (if applicable)
 * 2. Authentication
 * 3. Parameter validation
 * 4. Authorization (RBAC)
 * 5. Request body validation (if applicable)
 * 6. Controller
 */

import { Router } from 'express';
import * as controller from '../controllers/admin-event.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { listEventsQuerySchema, eventIdParamSchema } from '../middleware/validation-schemas/admin-event.schemas';

const router = Router();

/**
 * @route   GET /admin/events
 * @desc    List all events system-wide (cursor pagination)
 * @access  Private (admin:events:read)
 */
router.get('/', authenticate, validate.query(listEventsQuerySchema), authorize(['admin:events:read']), controller.listEvents);

/**
 * @route   GET /admin/events/{eventId}
 * @desc    Get event details by ID
 * @access  Private (admin:events:read)
 */
router.get('/:eventId', authenticate, validate.params(eventIdParamSchema), authorize(['admin:events:read']), controller.getEvent);

export default router;
