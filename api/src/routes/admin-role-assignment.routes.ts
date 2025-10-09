/**
 * Admin Role Assignment Routes
 * Routes for admin role assignment management operations
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
import * as controller from '../controllers/admin-role-assignment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import * as adminRoleAssignmentSchemas from '../middleware/validation-schemas/admin-role-assignment.schemas';

const router = Router();

// ============================================================================
// Role Assignment Management Endpoints
// ============================================================================

/**
 * @route   GET /api/v1/admin/role-assignments
 * @desc    List all role assignments
 * @access  Private (requires admin:assignments:read)
 */
router.get(
  '/',
  authenticate,
  authorize(['admin:assignments:read']),
  validate.query(adminRoleAssignmentSchemas.listRoleAssignmentsQuerySchema),
  controller.listRoleAssignments
);

/**
 * @route   POST /api/v1/admin/role-assignments
 * @desc    Create a new role assignment
 * @access  Private (requires admin:assignments:manage)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin:assignments:manage']),
  validate.body(adminRoleAssignmentSchemas.createRoleAssignmentSchema),
  controller.createRoleAssignment
);

/**
 * @route   DELETE /api/v1/admin/role-assignments/:assignmentId
 * @desc    Delete role assignment
 * @access  Private (requires admin:assignments:manage)
 */
router.delete(
  '/:assignmentId',
  authenticate,
  validate.params(adminRoleAssignmentSchemas.assignmentIdParamSchema),
  authorize(['admin:assignments:manage']),
  controller.deleteRoleAssignment
);

export default router;
