/**
 * Group Routes
 * Routes for hierarchical group management operations
 */

import { Router } from 'express';
import * as controller from '../controllers/group.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { groupSchemas } from '../middleware/validation-schemas';

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
 * @route   GET /api/v1/orgs/:orgId/groups
 * @desc    List groups
 * @access  Private (requires groups:read)
 */
router.get(
  '/',
  authenticate,
  validate.params(groupSchemas.orgIdParamSchema),
  validate.query(groupSchemas.listGroupsQuerySchema),
  authorize(['groups:read']),
  controller.listGroups
);

/**
 * @route   POST /api/v1/orgs/:orgId/groups
 * @desc    Create group
 * @access  Private (requires groups:manage)
 */
router.post(
  '/',
  authenticate,
  validate.params(groupSchemas.orgIdParamSchema),
  authorize(['groups:manage']),
  validate.body(groupSchemas.createGroupSchema),
  controller.createGroup
);

/**
 * @route   GET /api/v1/orgs/:orgId/groups/:groupId
 * @desc    Get group details
 * @access  Private (requires groups:read)
 */
router.get(
  '/:groupId',
  authenticate,
  validate.params(groupSchemas.groupPathParamsSchema),
  authorize(['groups:read']),
  controller.getGroup
);

/**
 * @route   PUT /api/v1/orgs/:orgId/groups/:groupId
 * @desc    Update group
 * @access  Private (requires groups:manage)
 */
router.put(
  '/:groupId',
  authenticate,
  validate.params(groupSchemas.groupPathParamsSchema),
  authorize(['groups:manage']),
  validate.body(groupSchemas.updateGroupSchema),
  controller.updateGroup
);

/**
 * @route   DELETE /api/v1/orgs/:orgId/groups/:groupId
 * @desc    Delete group
 * @access  Private (requires groups:manage)
 */
router.delete(
  '/:groupId',
  authenticate,
  validate.params(groupSchemas.groupPathParamsSchema),
  authorize(['groups:manage']),
  controller.deleteGroup
);

/**
 * @route   GET /api/v1/orgs/:orgId/groups/:groupId/members
 * @desc    List group members
 * @access  Private (requires groups:read)
 */
router.get(
  '/:groupId/members',
  authenticate,
  validate.params(groupSchemas.groupPathParamsSchema),
  authorize(['groups:read']),
  controller.listGroupMembers
);

/**
 * @route   POST /api/v1/orgs/:orgId/groups/:groupId/members
 * @desc    Add member to group
 * @access  Private (requires groups:manage)
 */
router.post(
  '/:groupId/members',
  authenticate,
  validate.params(groupSchemas.groupPathParamsSchema),
  authorize(['groups:manage']),
  validate.body(groupSchemas.addGroupMemberSchema),
  controller.addGroupMember
);

/**
 * @route   DELETE /api/v1/orgs/:orgId/groups/:groupId/members/:userId
 * @desc    Remove member from group
 * @access  Private (requires groups:manage)
 */
router.delete(
  '/:groupId/members/:userId',
  authenticate,
  validate.params(groupSchemas.groupMemberPathParamsSchema),
  authorize(['groups:manage']),
  controller.removeGroupMember
);

/**
 * @route   GET /api/v1/orgs/:orgId/groups/:groupId/children
 * @desc    Get child groups
 * @access  Private (requires groups:read)
 */
router.get(
  '/:groupId/children',
  authenticate,
  validate.params(groupSchemas.groupPathParamsSchema),
  authorize(['groups:read']),
  controller.getChildGroups
);

export default router;
