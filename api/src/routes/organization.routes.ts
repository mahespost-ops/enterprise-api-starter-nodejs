/**
 * Organization Routes
 * Routes for organization-related operations
 */

import { Router } from 'express';
import * as controller from '../controllers/organization.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { organizationSchemas } from '../middleware/validation-schemas';

const router = Router();

/**
 * Middleware order (applied in sequence):
 * 1. Authentication (verify JWT)
 * 2. Parameter validation (req.params)
 * 3. Authorization (RBAC)
 * 4. Body validation (req.body for PATCH)
 * 5. Controller
 */

/**
 * @route   GET /api/v1/orgs/:orgId
 * @desc    Get organization details
 * @access  Private (member access)
 */
router.get(
  '/:orgId',
  authenticate,
  validate.params(organizationSchemas.orgIdParamSchema),
  controller.getOrganization
);

/**
 * @route   PATCH /api/v1/orgs/:orgId
 * @desc    Update organization details
 * @access  Private (requires organizations:manage permission)
 */
router.patch(
  '/:orgId',
  authenticate,
  validate.params(organizationSchemas.orgIdParamSchema),
  authorize(['organizations:manage']),
  validate.body(organizationSchemas.updateOrganizationSchema),
  controller.updateOrganization
);

export default router;
