/**
 * User Routes
 * Routes for user-related operations (current user)
 */

import { Router } from 'express';
import * as controller from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { userSchemas } from '../middleware/validation-schemas';

const router = Router();

/**
 * Middleware order (applied in sequence):
 * 1. Rate limiting (if needed)
 * 2. Authentication (all routes require auth)
 * 3. Parameter validation (req.params)
 * 4. Authorization (RBAC)
 * 5. Body/Query validation (req.body/req.query)
 * 6. Controller
 */

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private (requires users:read)
 */
router.get('/me', authenticate, authorize(['users:read']), controller.getCurrentUser);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put(
  '/me',
  authenticate,
  validate.body(userSchemas.updateCurrentUserSchema),
  controller.updateCurrentUser
);

/**
 * @route   GET /api/v1/users/me/organizations
 * @desc    Get user's organizations
 * @access  Private (requires users:read)
 */
router.get(
  '/me/organizations',
  authenticate,
  authorize(['users:read']),
  validate.query(userSchemas.listOrganizationsQuerySchema),
  controller.getCurrentUserOrganizations
);

/**
 * @route   GET /api/v1/users/me/permissions
 * @desc    Get user's effective permissions
 * @access  Private (requires users:read)
 */
router.get(
  '/me/permissions',
  authenticate,
  authorize(['users:read']),
  validate.query(userSchemas.userPermissionsQuerySchema),
  controller.getCurrentUserPermissions
);

/**
 * @route   GET /api/v1/users/me/devices
 * @desc    Get current user's devices
 * @access  Private (implicit - users can always read own devices)
 */
router.get(
  '/me/devices',
  authenticate,
  validate.query(userSchemas.listDevicesQuerySchema),
  controller.getCurrentUserDevices
);

/**
 * @route   PUT /api/v1/users/me/devices/:deviceId
 * @desc    Update current user's device
 * @access  Private (requires devices:manage)
 */
router.put(
  '/me/devices/:deviceId',
  authenticate,
  validate.params(userSchemas.uuidParamSchema),
  authorize(['devices:manage']),
  validate.body(userSchemas.updateDeviceSchema),
  controller.updateCurrentUserDevice
);

/**
 * @route   DELETE /api/v1/users/me/devices/:deviceId
 * @desc    Revoke current user's device
 * @access  Private (requires devices:manage)
 */
router.delete(
  '/me/devices/:deviceId',
  authenticate,
  validate.params(userSchemas.uuidParamSchema),
  authorize(['devices:manage']),
  controller.revokeCurrentUserDevice
);

/**
 * @route   GET /api/v1/users/me/sessions
 * @desc    Get current user's sessions
 * @access  Private (implicit - users can always read own sessions)
 */
router.get(
  '/me/sessions',
  authenticate,
  validate.query(userSchemas.listSessionsQuerySchema),
  controller.getCurrentUserSessions
);

/**
 * @route   DELETE /api/v1/users/me/sessions/all
 * @desc    Revoke all current user's sessions (except current)
 * @access  Private (requires sessions:manage)
 * @note    Must come BEFORE /:sessionId route to avoid matching "all" as sessionId
 */
router.delete(
  '/me/sessions/all',
  authenticate,
  authorize(['sessions:manage']),
  controller.revokeAllCurrentUserSessions
);

/**
 * @route   DELETE /api/v1/users/me/sessions/:sessionId
 * @desc    Revoke current user's session
 * @access  Private (requires sessions:manage)
 */
router.delete(
  '/me/sessions/:sessionId',
  authenticate,
  validate.params(userSchemas.sessionIdParamSchema),
  authorize(['sessions:manage']),
  controller.revokeCurrentUserSession
);

export default router;
