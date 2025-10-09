/**
 * Admin Organization Routes
 * Routes for admin organization management operations
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
import * as controller from '../controllers/admin-organization.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { adminOrganizationSchemas } from '../middleware/validation-schemas';

const router = Router();

/**
 * @route   GET /api/v1/admin/organizations
 * @desc    List all organizations
 * @access  Private (requires admin:organizations:read)
 */
router.get(
  '/',
  authenticate,
  authorize(['admin:organizations:read']),
  validate.query(adminOrganizationSchemas.listOrganizationsQuerySchema),
  controller.listOrganizations
);

/**
 * @route   GET /api/v1/admin/organizations/:orgId
 * @desc    Get organization details
 * @access  Private (requires admin:organizations:read)
 */
router.get(
  '/:orgId',
  authenticate,
  validate.params(adminOrganizationSchemas.orgIdParamSchema),
  authorize(['admin:organizations:read']),
  controller.getOrganization
);

/**
 * @route   PUT /api/v1/admin/organizations/:orgId
 * @desc    Update organization
 * @access  Private (requires admin:organizations:manage)
 */
router.put(
  '/:orgId',
  authenticate,
  validate.params(adminOrganizationSchemas.orgIdParamSchema),
  authorize(['admin:organizations:manage']),
  validate.body(adminOrganizationSchemas.updateOrganizationSchema),
  controller.updateOrganization
);

/**
 * @route   DELETE /api/v1/admin/organizations/:orgId
 * @desc    Delete organization (soft delete)
 * @access  Private (requires admin:organizations:manage)
 */
router.delete(
  '/:orgId',
  authenticate,
  validate.params(adminOrganizationSchemas.orgIdParamSchema),
  authorize(['admin:organizations:manage']),
  controller.deleteOrganization
);

export default router;
