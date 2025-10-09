/**
 * Admin Event Type Routes
 * Routes for admin event type management endpoints
 */

import { Router } from 'express';
import * as controller from '../controllers/admin-event-type.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  listEventTypesQuerySchema,
  eventTypeIdParamSchema,
  createEventTypeBodySchema,
  updateEventTypeBodySchema,
} from '../middleware/validation-schemas/admin-event-type.schemas';

const router = Router();

/**
 * @route   GET /api/v1/admin/event-types
 * @desc    List all event types (admin)
 * @access  Private (admin:events:read)
 */
router.get(
  '/',
  authenticate,
  validate.query(listEventTypesQuerySchema),
  authorize(['admin:events:read']),
  controller.listEventTypes,
);

/**
 * @route   POST /api/v1/admin/event-types
 * @desc    Create event type (admin)
 * @access  Private (admin:events:manage)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin:events:manage']),
  validate.body(createEventTypeBodySchema),
  controller.createEventType,
);

/**
 * @route   GET /api/v1/admin/event-types/:eventTypeId
 * @desc    Get event type by ID (admin)
 * @access  Private (admin:events:read)
 */
router.get(
  '/:eventTypeId',
  authenticate,
  validate.params(eventTypeIdParamSchema),
  authorize(['admin:events:read']),
  controller.getEventTypeById,
);

/**
 * @route   PUT /api/v1/admin/event-types/:eventTypeId
 * @desc    Update event type (admin)
 * @access  Private (admin:events:manage)
 */
router.put(
  '/:eventTypeId',
  authenticate,
  validate.params(eventTypeIdParamSchema),
  authorize(['admin:events:manage']),
  validate.body(updateEventTypeBodySchema),
  controller.updateEventType,
);

/**
 * @route   DELETE /api/v1/admin/event-types/:eventTypeId
 * @desc    Delete event type (admin)
 * @access  Private (admin:events:manage)
 */
router.delete(
  '/:eventTypeId',
  authenticate,
  validate.params(eventTypeIdParamSchema),
  authorize(['admin:events:manage']),
  controller.deleteEventType,
);

export default router;
