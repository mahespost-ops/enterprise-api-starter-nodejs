/**
 * Admin Permission Routes
 * Routes for listing all system permissions
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

/**
 * @route   GET /api/v1/admin/permissions
 * @desc    List all permissions
 * @access  Private (requires admin:permissions:read)
 */
router.get(
  '/',
  authenticate,
  authorize(['admin:permissions:read']),
  validate.query(adminRoleSchemas.listPermissionsQuerySchema),
  controller.listPermissions
);

export default router;
