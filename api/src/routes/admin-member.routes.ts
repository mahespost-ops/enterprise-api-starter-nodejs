/**
 * Admin Member Routes
 * Routes for admin member management operations
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
import * as controller from '../controllers/admin-member.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { adminMemberSchemas } from '../middleware/validation-schemas';

const router = Router();

// ==================== Organization Members ====================

/**
 * @route   GET /api/v1/admin/organizations/:orgId/members
 * @desc    List all organization members
 * @access  Private (requires admin:members:read)
 */
router.get(
  '/organizations/:orgId/members',
  authenticate,
  validate.params(
    adminMemberSchemas.organizationMemberParamSchema.fork(['memberId'], (schema) => schema.optional())
  ),
  authorize(['admin:members:read']),
  validate.query(adminMemberSchemas.listOrganizationMembersQuerySchema),
  controller.listOrganizationMembers
);

/**
 * @route   GET /api/v1/admin/organizations/:orgId/members/:memberId
 * @desc    Get organization member details
 * @access  Private (requires admin:members:read)
 */
router.get(
  '/organizations/:orgId/members/:memberId',
  authenticate,
  validate.params(adminMemberSchemas.organizationMemberParamSchema),
  authorize(['admin:members:read']),
  controller.getOrganizationMemberById
);

/**
 * @route   PUT /api/v1/admin/organizations/:orgId/members/:memberId
 * @desc    Update organization member
 * @access  Private (requires admin:members:manage)
 */
router.put(
  '/organizations/:orgId/members/:memberId',
  authenticate,
  validate.params(adminMemberSchemas.organizationMemberParamSchema),
  authorize(['admin:members:manage']),
  validate.body(adminMemberSchemas.updateOrganizationMemberSchema),
  controller.updateOrganizationMember
);

/**
 * @route   DELETE /api/v1/admin/organizations/:orgId/members/:memberId
 * @desc    Delete organization member (soft delete)
 * @access  Private (requires admin:members:manage)
 */
router.delete(
  '/organizations/:orgId/members/:memberId',
  authenticate,
  validate.params(adminMemberSchemas.organizationMemberParamSchema),
  authorize(['admin:members:manage']),
  controller.deleteOrganizationMember
);

// ==================== Group Members ====================

/**
 * @route   GET /api/v1/admin/groups/:groupId/members
 * @desc    List all group members
 * @access  Private (requires admin:groups:read)
 */
router.get(
  '/groups/:groupId/members',
  authenticate,
  validate.params(adminMemberSchemas.groupIdParamSchema),
  authorize(['admin:groups:read']),
  validate.query(adminMemberSchemas.listGroupMembersQuerySchema),
  controller.listGroupMembers
);

/**
 * @route   POST /api/v1/admin/groups/:groupId/members
 * @desc    Add member to group
 * @access  Private (requires admin:groups:manage)
 */
router.post(
  '/groups/:groupId/members',
  authenticate,
  validate.params(adminMemberSchemas.groupIdParamSchema),
  authorize(['admin:groups:manage']),
  validate.body(adminMemberSchemas.addGroupMemberSchema),
  controller.addGroupMember
);

/**
 * @route   DELETE /api/v1/admin/groups/:groupId/members/:userId
 * @desc    Remove member from group
 * @access  Private (requires admin:groups:manage)
 */
router.delete(
  '/groups/:groupId/members/:userId',
  authenticate,
  validate.params(adminMemberSchemas.groupMemberParamSchema),
  authorize(['admin:groups:manage']),
  controller.removeGroupMember
);

export default router;
