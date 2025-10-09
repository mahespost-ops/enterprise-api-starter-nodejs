/**
 * Admin Role Routes
 * Routes for admin role and permission management operations
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
import * as controller from '../controllers/admin-role.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import * as adminRoleSchemas from '../middleware/validation-schemas/admin-role.schemas';

const router = Router();

// ============================================================================
// Role Management Endpoints
// ============================================================================

/**
 * @route   GET /api/v1/admin/roles
 * @desc    List all roles
 * @access  Private (requires admin:roles:read)
 */
router.get(
  '/',
  authenticate,
  authorize(['admin:roles:read']),
  validate.query(adminRoleSchemas.listRolesQuerySchema),
  controller.listRoles
);

/**
 * @route   POST /api/v1/admin/roles
 * @desc    Create a new role
 * @access  Private (requires admin:roles:manage)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin:roles:manage']),
  validate.body(adminRoleSchemas.createRoleSchema),
  controller.createRole
);

/**
 * @route   GET /api/v1/admin/roles/:roleId
 * @desc    Get role details
 * @access  Private (requires admin:roles:read)
 */
router.get(
  '/:roleId',
  authenticate,
  validate.params(adminRoleSchemas.roleIdParamSchema),
  authorize(['admin:roles:read']),
  controller.getRole
);

/**
 * @route   PUT /api/v1/admin/roles/:roleId
 * @desc    Update role
 * @access  Private (requires admin:roles:manage)
 */
router.put(
  '/:roleId',
  authenticate,
  validate.params(adminRoleSchemas.roleIdParamSchema),
  authorize(['admin:roles:manage']),
  validate.body(adminRoleSchemas.updateRoleSchema),
  controller.updateRole
);

/**
 * @route   DELETE /api/v1/admin/roles/:roleId
 * @desc    Delete role (soft delete)
 * @access  Private (requires admin:roles:manage)
 */
router.delete(
  '/:roleId',
  authenticate,
  validate.params(adminRoleSchemas.roleIdParamSchema),
  authorize(['admin:roles:manage']),
  controller.deleteRole
);

// ============================================================================
// Role Permission Management Endpoints
// ============================================================================

/**
 * @route   GET /api/v1/admin/roles/:roleId/permissions
 * @desc    List permissions assigned to a role
 * @access  Private (requires admin:roles:read)
 */
router.get(
  '/:roleId/permissions',
  authenticate,
  validate.params(adminRoleSchemas.roleIdParamSchema),
  authorize(['admin:roles:read']),
  controller.listRolePermissions
);

/**
 * @route   POST /api/v1/admin/roles/:roleId/permissions
 * @desc    Add permission to role
 * @access  Private (requires admin:roles:manage)
 */
router.post(
  '/:roleId/permissions',
  authenticate,
  validate.params(adminRoleSchemas.roleIdParamSchema),
  authorize(['admin:roles:manage']),
  validate.body(adminRoleSchemas.addRolePermissionSchema),
  controller.addRolePermission
);

/**
 * @route   DELETE /api/v1/admin/roles/:roleId/permissions/:permissionId
 * @desc    Remove permission from role
 * @access  Private (requires admin:roles:manage)
 */
router.delete(
  '/:roleId/permissions/:permissionId',
  authenticate,
  validate.params(
    adminRoleSchemas.roleIdParamSchema.concat(adminRoleSchemas.permissionIdParamSchema)
  ),
  authorize(['admin:roles:manage']),
  controller.removeRolePermission
);

export default router;
