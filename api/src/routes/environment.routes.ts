/**
 * Environment Routes
 * Routes for environment-related operations
 */

import { Router } from 'express';
import * as controller from '../controllers/environment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { environmentSchemas } from '../middleware/validation-schemas';

const router = Router();

/**
 * Middleware order (applied in sequence):
 * 1. Authentication (verify JWT)
 * 2. Parameter validation (req.params)
 * 3. Authorization (RBAC)
 * 4. Query/Body validation
 * 5. Controller
 */

/**
 * @route   GET /api/v1/orgs/:orgId/envs
 * @desc    List environments for an organization
 * @access  Private (requires environments:read)
 */
router.get(
  '/:orgId/envs',
  authenticate,
  validate.params(environmentSchemas.orgIdParamSchema),
  authorize(['environments:read']),
  validate.query(environmentSchemas.listEnvironmentsQuerySchema),
  controller.listEnvironments
);

/**
 * @route   POST /api/v1/orgs/:orgId/envs
 * @desc    Create new environment
 * @access  Private (requires environments:manage)
 */
router.post(
  '/:orgId/envs',
  authenticate,
  validate.params(environmentSchemas.orgIdParamSchema),
  authorize(['environments:manage']),
  validate.body(environmentSchemas.createEnvironmentSchema),
  controller.createEnvironment
);

/**
 * @route   GET /api/v1/orgs/:orgId/envs/:envId
 * @desc    Get environment details
 * @access  Private (requires environments:read)
 */
router.get(
  '/:orgId/envs/:envId',
  authenticate,
  validate.params(environmentSchemas.envPathParamsSchema),
  authorize(['environments:read']),
  controller.getEnvironment
);

/**
 * @route   PUT /api/v1/orgs/:orgId/envs/:envId
 * @desc    Update environment
 * @access  Private (requires environments:manage permission)
 */
router.put(
  '/:orgId/envs/:envId',
  authenticate,
  validate.params(environmentSchemas.envPathParamsSchema),
  authorize(['environments:manage']),
  validate.body(environmentSchemas.updateEnvironmentSchema),
  controller.updateEnvironment
);

/**
 * @route   DELETE /api/v1/orgs/:orgId/envs/:envId
 * @desc    Delete environment (soft delete)
 * @access  Private (requires environments:manage permission)
 */
router.delete(
  '/:orgId/envs/:envId',
  authenticate,
  validate.params(environmentSchemas.envPathParamsSchema),
  authorize(['environments:manage']),
  controller.deleteEnvironment
);

export default router;
