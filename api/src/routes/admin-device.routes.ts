/**
 * Admin Device Routes
 * Routes for admin device management endpoints
 */

import { Router } from 'express';
import * as controller from '../controllers/admin-device.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  listDevicesQuerySchema,
  deviceIdParamSchema,
  updateDeviceBodySchema,
} from '../middleware/validation-schemas/admin-device.schemas';

const router = Router();

/**
 * @route   GET /api/v1/admin/devices
 * @desc    List all devices (admin)
 * @access  Private (admin:devices:read)
 */
router.get(
  '/',
  authenticate,
  validate.query(listDevicesQuerySchema),
  authorize(['admin:devices:read']),
  controller.listDevices,
);

/**
 * @route   GET /api/v1/admin/devices/:deviceId
 * @desc    Get device by ID (admin)
 * @access  Private (admin:devices:read)
 */
router.get(
  '/:deviceId',
  authenticate,
  validate.params(deviceIdParamSchema),
  authorize(['admin:devices:read']),
  controller.getDeviceById,
);

/**
 * @route   PUT /api/v1/admin/devices/:deviceId
 * @desc    Update device (admin)
 * @access  Private (admin:devices:manage)
 */
router.put(
  '/:deviceId',
  authenticate,
  validate.params(deviceIdParamSchema),
  authorize(['admin:devices:manage']),
  validate.body(updateDeviceBodySchema),
  controller.updateDevice,
);

/**
 * @route   DELETE /api/v1/admin/devices/:deviceId
 * @desc    Revoke device (admin)
 * @access  Private (admin:devices:manage)
 */
router.delete(
  '/:deviceId',
  authenticate,
  validate.params(deviceIdParamSchema),
  authorize(['admin:devices:manage']),
  controller.revokeDevice,
);

export default router;
