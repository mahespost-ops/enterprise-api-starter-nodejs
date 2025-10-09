/**
 * Admin User Routes
 * Routes for admin user management operations
 *
 * Middleware order (per STANDARDS.md):
 * 1. Rate limit (if needed)
 * 2. Authentication
 * 3. Parameter validation
 * 4. Authorization (RBAC)
 * 5. Query/Body validation
 * 6. Controller
 */

import { Router } from 'express';
import * as controller from '../controllers/admin-user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { adminUserSchemas } from '../middleware/validation-schemas';

const router = Router();

/**
 * @route   GET /api/v1/admin/users
 * @desc    List all users
 * @access  Private (requires admin:users:read)
 */
router.get(
  '/',
  authenticate,
  authorize(['admin:users:read']),
  validate.query(adminUserSchemas.listUsersQuerySchema),
  controller.listUsers
);

/**
 * @route   GET /api/v1/admin/users/:userId
 * @desc    Get user details
 * @access  Private (requires admin:users:read)
 */
router.get(
  '/:userId',
  authenticate,
  validate.params(adminUserSchemas.userIdParamSchema),
  authorize(['admin:users:read']),
  controller.getUserById
);

/**
 * @route   PUT /api/v1/admin/users/:userId
 * @desc    Update user
 * @access  Private (requires admin:users:manage)
 */
router.put(
  '/:userId',
  authenticate,
  validate.params(adminUserSchemas.userIdParamSchema),
  authorize(['admin:users:manage']),
  validate.body(adminUserSchemas.updateUserSchema),
  controller.updateUser
);

/**
 * @route   DELETE /api/v1/admin/users/:userId
 * @desc    Delete user (soft delete)
 * @access  Private (requires admin:users:manage)
 */
router.delete(
  '/:userId',
  authenticate,
  validate.params(adminUserSchemas.userIdParamSchema),
  authorize(['admin:users:manage']),
  controller.deleteUser
);

export default router;
