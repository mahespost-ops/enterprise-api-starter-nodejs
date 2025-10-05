/**
 * Member Routes
 * Routes for organization member management operations
 */

import { Router } from 'express';
import * as controller from '../controllers/member.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { memberSchemas } from '../middleware/validation-schemas';

const router = Router();

/**
 * Middleware order (applied in sequence):
 * 1. Authentication (verify JWT)
 * 2. Parameter validation (req.params)
 * 3. Query validation (req.query for list endpoints)
 * 4. Authorization (RBAC)
 * 5. Body validation (req.body for POST/PUT)
 * 6. Controller
 */

/**
 * @route   GET /api/v1/orgs/:orgId/members
 * @desc    List organization members
 * @access  Private (requires members:read)
 */
router.get(
  '/',
  authenticate,
  validate.params(memberSchemas.orgIdParamSchema),
  validate.query(memberSchemas.listMembersQuerySchema),
  authorize(['members:read']),
  controller.listMembers
);

/**
 * @route   POST /api/v1/orgs/:orgId/members
 * @desc    Invite member to organization
 * @access  Private (requires members:manage)
 */
router.post(
  '/',
  authenticate,
  validate.params(memberSchemas.orgIdParamSchema),
  authorize(['members:manage']),
  validate.body(memberSchemas.inviteMemberSchema),
  controller.inviteMember
);

/**
 * @route   GET /api/v1/orgs/:orgId/members/:memberId
 * @desc    Get member details
 * @access  Private (requires members:read)
 */
router.get(
  '/:memberId',
  authenticate,
  validate.params(memberSchemas.memberPathParamsSchema),
  authorize(['members:read']),
  controller.getMember
);

/**
 * @route   PUT /api/v1/orgs/:orgId/members/:memberId
 * @desc    Update member
 * @access  Private (requires members:manage)
 */
router.put(
  '/:memberId',
  authenticate,
  validate.params(memberSchemas.memberPathParamsSchema),
  authorize(['members:manage']),
  validate.body(memberSchemas.updateMemberSchema),
  controller.updateMember
);

/**
 * @route   DELETE /api/v1/orgs/:orgId/members/:memberId
 * @desc    Remove member from organization
 * @access  Private (requires members:manage)
 */
router.delete(
  '/:memberId',
  authenticate,
  validate.params(memberSchemas.memberPathParamsSchema),
  authorize(['members:manage']),
  controller.removeMember
);

/**
 * @route   GET /api/v1/orgs/:orgId/members/:memberId/organizations
 * @desc    Get member's organizations
 * @access  Private (requires members:read)
 */
router.get(
  '/:memberId/organizations',
  authenticate,
  validate.params(memberSchemas.memberPathParamsSchema),
  authorize(['members:read']),
  controller.getMemberOrganizations
);

/**
 * @route   GET /api/v1/orgs/:orgId/members/:memberId/permissions
 * @desc    Get member's permissions
 * @access  Private (requires members:read)
 */
router.get(
  '/:memberId/permissions',
  authenticate,
  validate.params(memberSchemas.memberPathParamsSchema),
  authorize(['members:read']),
  controller.getMemberPermissions
);

export default router;
