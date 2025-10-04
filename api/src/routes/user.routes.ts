/**
 * User Routes
 * Routes for user-related operations (current user)
 */

import { Router } from 'express';
import * as controller from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { userSchemas } from '../middleware/validation-schemas';

const router = Router();

/**
 * Middleware order (applied in sequence):
 * 1. Rate limiting (if needed)
 * 2. Authentication (all routes require auth)
 * 3. Parameter validation (req.params)
 * 4. Authorization (RBAC - if needed)
 * 5. Body/Query validation (req.body/req.query)
 * 6. Controller
 */

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, controller.getCurrentUser);

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
 * @access  Private
 */
router.get(
  '/me/organizations',
  authenticate,
  validate.query(userSchemas.listOrganizationsQuerySchema),
  controller.getCurrentUserOrganizations
);

/**
 * @route   GET /api/v1/users/me/permissions
 * @desc    Get user's effective permissions
 * @access  Private
 */
router.get(
  '/me/permissions',
  authenticate,
  validate.query(userSchemas.userPermissionsQuerySchema),
  controller.getCurrentUserPermissions
);

/**
 * @route   GET /api/v1/users/me/devices
 * @desc    Get current user's devices
 * @access  Private
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
 * @access  Private
 */
router.put(
  '/me/devices/:deviceId',
  authenticate,
  validate.params(userSchemas.uuidParamSchema),
  validate.body(userSchemas.updateDeviceSchema),
  controller.updateCurrentUserDevice
);

/**
 * @route   DELETE /api/v1/users/me/devices/:deviceId
 * @desc    Revoke current user's device
 * @access  Private
 */
router.delete(
  '/me/devices/:deviceId',
  authenticate,
  validate.params(userSchemas.uuidParamSchema),
  controller.revokeCurrentUserDevice
);

/**
 * @route   GET /api/v1/users/me/sessions
 * @desc    Get current user's sessions
 * @access  Private
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
 * @access  Private
 * @note    Must come BEFORE /:sessionId route to avoid matching "all" as sessionId
 */
router.delete('/me/sessions/all', authenticate, controller.revokeAllCurrentUserSessions);

/**
 * @route   DELETE /api/v1/users/me/sessions/:sessionId
 * @desc    Revoke current user's session
 * @access  Private
 */
router.delete(
  '/me/sessions/:sessionId',
  authenticate,
  validate.params(userSchemas.sessionIdParamSchema),
  controller.revokeCurrentUserSession
);

export default router;
