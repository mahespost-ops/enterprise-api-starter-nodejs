/**
 * Admin Environment Routes
 * Routes for admin environment management operations
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
import * as controller from '../controllers/admin-environment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { adminEnvironmentSchemas } from '../middleware/validation-schemas';

const router = Router();

/**
 * @route   GET /api/v1/admin/environments
 * @desc    List all environments
 * @access  Private (requires admin:environments:read)
 */
router.get(
  '/',
  authenticate,
  authorize(['admin:environments:read']),
  validate.query(adminEnvironmentSchemas.listEnvironmentsQuerySchema),
  controller.listEnvironments
);

/**
 * @route   GET /api/v1/admin/environments/:envId
 * @desc    Get environment details
 * @access  Private (requires admin:environments:read)
 */
router.get(
  '/:envId',
  authenticate,
  validate.params(adminEnvironmentSchemas.envIdParamSchema),
  authorize(['admin:environments:read']),
  controller.getEnvironment
);

/**
 * @route   PUT /api/v1/admin/environments/:envId
 * @desc    Update environment
 * @access  Private (requires admin:environments:manage)
 */
router.put(
  '/:envId',
  authenticate,
  validate.params(adminEnvironmentSchemas.envIdParamSchema),
  authorize(['admin:environments:manage']),
  validate.body(adminEnvironmentSchemas.updateEnvironmentSchema),
  controller.updateEnvironment
);

/**
 * @route   DELETE /api/v1/admin/environments/:envId
 * @desc    Delete environment (soft delete)
 * @access  Private (requires admin:environments:manage)
 */
router.delete(
  '/:envId',
  authenticate,
  validate.params(adminEnvironmentSchemas.envIdParamSchema),
  authorize(['admin:environments:manage']),
  controller.deleteEnvironment
);

export default router;
