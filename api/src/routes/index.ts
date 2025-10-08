/**
 * Main Routes Index
 * Aggregates all route modules
 */

import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import organizationRoutes from './organization.routes';
import environmentRoutes from './environment.routes';
import memberRoutes from './member.routes';
import groupRoutes from './group.routes';
import eventRoutes from './event.routes';
import webhookRoutes from './webhook.routes';
import adminUserRoutes from './admin-user.routes';
import adminOrganizationRoutes from './admin-organization.routes';
import adminEnvironmentRoutes from './admin-environment.routes';
import adminMemberRoutes from './admin-member.routes';
import adminGroupRoutes from './admin-group.routes';
import adminRoleRoutes from './admin-role.routes';
import adminPermissionRoutes from './admin-permission.routes';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/orgs', organizationRoutes);
router.use('/orgs', environmentRoutes);
router.use('/orgs/:orgId/members', memberRoutes);
router.use('/orgs/:orgId/groups', groupRoutes);
router.use('/orgs/:orgId/envs/:envId/events', eventRoutes);
router.use('/orgs/:orgId/envs/:envId/webhooks', webhookRoutes);

// Admin routes
router.use('/admin/users', adminUserRoutes);
router.use('/admin/organizations', adminOrganizationRoutes);
router.use('/admin/environments', adminEnvironmentRoutes);
router.use('/admin/groups', adminGroupRoutes);
router.use('/admin', adminMemberRoutes); // Handles both /admin/organizations/:orgId/members and /admin/groups/:groupId/members
router.use('/admin/roles', adminRoleRoutes);
router.use('/admin/permissions', adminPermissionRoutes);

// Future routes will be added here:
// router.use('/devices', deviceRoutes);
// router.use('/sessions', sessionRoutes);
// router.use('/admin/role-assignments', adminRoleAssignmentRoutes);
// router.use('/admin/devices', adminDeviceRoutes);
// router.use('/admin/sessions', adminSessionRoutes);
// router.use('/admin/impersonation', adminImpersonationRoutes);
// router.use('/admin/events', adminEventRoutes);
// router.use('/admin/webhooks', adminWebhookRoutes);

export default router;
