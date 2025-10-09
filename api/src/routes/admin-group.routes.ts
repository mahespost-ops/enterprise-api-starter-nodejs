/**
 * Admin Group Routes
 * Routes for admin group management operations
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
import * as controller from '../controllers/admin-group.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { adminGroupSchemas } from '../middleware/validation-schemas';

const router = Router();

/**
 * @route   GET /api/v1/admin/groups
 * @desc    List all groups
 * @access  Private (requires admin:groups:read)
 */
router.get(
  '/',
  authenticate,
  authorize(['admin:groups:read']),
  validate.query(adminGroupSchemas.listGroupsQuerySchema),
  controller.listGroups
);

/**
 * @route   GET /api/v1/admin/groups/:groupId
 * @desc    Get group details
 * @access  Private (requires admin:groups:read)
 */
router.get(
  '/:groupId',
  authenticate,
  validate.params(adminGroupSchemas.groupIdParamSchema),
  authorize(['admin:groups:read']),
  controller.getGroupById
);

/**
 * @route   PUT /api/v1/admin/groups/:groupId
 * @desc    Update group
 * @access  Private (requires admin:groups:manage)
 */
router.put(
  '/:groupId',
  authenticate,
  validate.params(adminGroupSchemas.groupIdParamSchema),
  authorize(['admin:groups:manage']),
  validate.body(adminGroupSchemas.updateGroupSchema),
  controller.updateGroup
);

/**
 * @route   DELETE /api/v1/admin/groups/:groupId
 * @desc    Delete group (soft delete)
 * @access  Private (requires admin:groups:manage)
 */
router.delete(
  '/:groupId',
  authenticate,
  validate.params(adminGroupSchemas.groupIdParamSchema),
  authorize(['admin:groups:manage']),
  controller.deleteGroup
);

export default router;
