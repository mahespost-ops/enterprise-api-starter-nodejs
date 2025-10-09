/**
 * Migration: Seed Event Types
 * Purpose: Inserts event types for all API endpoints to enable comprehensive event logging
 *
 * Event Type Naming Convention:
 * - Tenant-scoped: {resource}.{action} (e.g., "device.update", "member.invite")
 * - Admin-scoped: admin.{resource}.{action} (e.g., "admin.user.delete", "admin.organization.update")
 *
 * isWebhookEvent flag:
 * - true: Changes to resources that should trigger webhooks (create, update, delete operations)
 * - false: Read operations, auth flows, non-resource endpoints
 */

import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    -- ========================================
    -- Authentication Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'auth.register', 'POST', '/api/v1/auth/register', true, 'User registration'),
      (uuid_generate_v1(), 'auth.request_token', 'POST', '/api/v1/auth/request-token', true, 'Magic token request - monitor for abuse'),
      (uuid_generate_v1(), 'auth.verify_token', 'POST', '/api/v1/auth/verify-token', true, 'Magic token verification and login'),
      (uuid_generate_v1(), 'auth.refresh', 'POST', '/api/v1/auth/refresh', false, 'JWT token refresh'),
      (uuid_generate_v1(), 'auth.logout', 'POST', '/api/v1/auth/logout', true, 'User logout'),
      (uuid_generate_v1(), 'auth.switch_context', 'POST', '/api/v1/auth/switch-context', true, 'Organization/environment context switch');

    -- ========================================
    -- User Profile Events (Tenant-Scoped)
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'user.read', 'GET', '/api/v1/users/me', false, 'View current user profile'),
      (uuid_generate_v1(), 'user.update', 'PUT', '/api/v1/users/me', true, 'Update current user profile'),
      (uuid_generate_v1(), 'user.organizations.read', 'GET', '/api/v1/users/me/organizations', false, 'View user organizations'),
      (uuid_generate_v1(), 'user.permissions.read', 'GET', '/api/v1/users/me/permissions', false, 'View user permissions');

    -- ========================================
    -- Device Events (Tenant-Scoped)
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'device.list', 'GET', '/api/v1/users/me/devices', false, 'List user devices'),
      (uuid_generate_v1(), 'device.update', 'PUT', '/api/v1/users/me/devices/{deviceId}', true, 'Update device details'),
      (uuid_generate_v1(), 'device.revoke', 'DELETE', '/api/v1/users/me/devices/{deviceId}', true, 'Revoke device access');

    -- ========================================
    -- Session Events (Tenant-Scoped)
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'session.list', 'GET', '/api/v1/users/me/sessions', false, 'List user sessions'),
      (uuid_generate_v1(), 'session.revoke', 'DELETE', '/api/v1/users/me/sessions/{sessionId}', true, 'Revoke specific session'),
      (uuid_generate_v1(), 'session.revoke_all', 'DELETE', '/api/v1/users/me/sessions/all', true, 'Revoke all user sessions');

    -- ========================================
    -- Organization Events (Tenant-Scoped)
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'organization.read', 'GET', '/api/v1/orgs/{orgId}', false, 'View organization details'),
      (uuid_generate_v1(), 'organization.update', 'PATCH', '/api/v1/orgs/{orgId}', true, 'Update organization settings');

    -- ========================================
    -- Environment Events (Tenant-Scoped)
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'environment.list', 'GET', '/api/v1/orgs/{orgId}/envs', false, 'List environments'),
      (uuid_generate_v1(), 'environment.create', 'POST', '/api/v1/orgs/{orgId}/envs', true, 'Create environment'),
      (uuid_generate_v1(), 'environment.read', 'GET', '/api/v1/orgs/{orgId}/envs/{envId}', false, 'View environment details'),
      (uuid_generate_v1(), 'environment.update', 'PUT', '/api/v1/orgs/{orgId}/envs/{envId}', true, 'Update environment'),
      (uuid_generate_v1(), 'environment.delete', 'DELETE', '/api/v1/orgs/{orgId}/envs/{envId}', true, 'Delete environment');

    -- ========================================
    -- Member Events (Tenant-Scoped)
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'member.list', 'GET', '/api/v1/orgs/{orgId}/members', false, 'List organization members'),
      (uuid_generate_v1(), 'member.invite', 'POST', '/api/v1/orgs/{orgId}/members', true, 'Invite organization member'),
      (uuid_generate_v1(), 'member.read', 'GET', '/api/v1/orgs/{orgId}/members/{memberId}', false, 'View member details'),
      (uuid_generate_v1(), 'member.update', 'PUT', '/api/v1/orgs/{orgId}/members/{memberId}', true, 'Update member'),
      (uuid_generate_v1(), 'member.remove', 'DELETE', '/api/v1/orgs/{orgId}/members/{memberId}', true, 'Remove organization member'),
      (uuid_generate_v1(), 'member.organizations.read', 'GET', '/api/v1/orgs/{orgId}/members/{memberId}/organizations', false, 'View member organizations'),
      (uuid_generate_v1(), 'member.permissions.read', 'GET', '/api/v1/orgs/{orgId}/members/{memberId}/permissions', false, 'View member permissions'),
      (uuid_generate_v1(), 'member.impersonate.start', 'POST', '/api/v1/orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate', true, 'Start member impersonation'),
      (uuid_generate_v1(), 'member.impersonate.end', 'DELETE', '/api/v1/orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate', true, 'End member impersonation'),
      (uuid_generate_v1(), 'member.impersonate.status', 'GET', '/api/v1/orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate', false, 'Check member impersonation status');

    -- ========================================
    -- Group Events (Tenant-Scoped)
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'group.list', 'GET', '/api/v1/orgs/{orgId}/groups', false, 'List groups'),
      (uuid_generate_v1(), 'group.create', 'POST', '/api/v1/orgs/{orgId}/groups', true, 'Create group'),
      (uuid_generate_v1(), 'group.read', 'GET', '/api/v1/orgs/{orgId}/groups/{groupId}', false, 'View group details'),
      (uuid_generate_v1(), 'group.update', 'PUT', '/api/v1/orgs/{orgId}/groups/{groupId}', true, 'Update group'),
      (uuid_generate_v1(), 'group.delete', 'DELETE', '/api/v1/orgs/{orgId}/groups/{groupId}', true, 'Delete group'),
      (uuid_generate_v1(), 'group.members.list', 'GET', '/api/v1/orgs/{orgId}/groups/{groupId}/members', false, 'List group members'),
      (uuid_generate_v1(), 'group.member.add', 'POST', '/api/v1/orgs/{orgId}/groups/{groupId}/members', true, 'Add group member'),
      (uuid_generate_v1(), 'group.member.remove', 'DELETE', '/api/v1/orgs/{orgId}/groups/{groupId}/members/{userId}', true, 'Remove group member'),
      (uuid_generate_v1(), 'group.children.read', 'GET', '/api/v1/orgs/{orgId}/groups/{groupId}/children', false, 'View group children');

    -- ========================================
    -- Event Events (Tenant-Scoped)
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'event.list', 'GET', '/api/v1/orgs/{orgId}/envs/{envId}/events', false, 'List events'),
      (uuid_generate_v1(), 'event.read', 'GET', '/api/v1/orgs/{orgId}/envs/{envId}/events/{eventId}', false, 'View event details');

    -- ========================================
    -- Webhook Events (Tenant-Scoped)
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'webhook.list', 'GET', '/api/v1/orgs/{orgId}/envs/{envId}/webhooks', false, 'List webhooks'),
      (uuid_generate_v1(), 'webhook.create', 'POST', '/api/v1/orgs/{orgId}/envs/{envId}/webhooks', true, 'Create webhook'),
      (uuid_generate_v1(), 'webhook.read', 'GET', '/api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}', false, 'View webhook details'),
      (uuid_generate_v1(), 'webhook.update', 'PUT', '/api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}', true, 'Update webhook'),
      (uuid_generate_v1(), 'webhook.delete', 'DELETE', '/api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}', true, 'Delete webhook'),
      (uuid_generate_v1(), 'webhook.deliveries.list', 'GET', '/api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries', false, 'List webhook deliveries'),
      (uuid_generate_v1(), 'webhook.delivery.read', 'GET', '/api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries/{deliveryId}', false, 'View webhook delivery details'),
      (uuid_generate_v1(), 'webhook.delivery.retry', 'POST', '/api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries/{deliveryId}/retry', true, 'Retry webhook delivery');

    -- ========================================
    -- Admin User Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.user.list', 'GET', '/api/v1/admin/users', false, 'Admin - List users'),
      (uuid_generate_v1(), 'admin.user.read', 'GET', '/api/v1/admin/users/{userId}', false, 'Admin - View user details'),
      (uuid_generate_v1(), 'admin.user.update', 'PUT', '/api/v1/admin/users/{userId}', true, 'Admin - Update user'),
      (uuid_generate_v1(), 'admin.user.delete', 'DELETE', '/api/v1/admin/users/{userId}', true, 'Admin - Delete user');

    -- ========================================
    -- Admin Organization Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.organization.list', 'GET', '/api/v1/admin/organizations', false, 'Admin - List organizations'),
      (uuid_generate_v1(), 'admin.organization.read', 'GET', '/api/v1/admin/organizations/{orgId}', false, 'Admin - View organization details'),
      (uuid_generate_v1(), 'admin.organization.update', 'PUT', '/api/v1/admin/organizations/{orgId}', true, 'Admin - Update organization'),
      (uuid_generate_v1(), 'admin.organization.delete', 'DELETE', '/api/v1/admin/organizations/{orgId}', true, 'Admin - Delete organization');

    -- ========================================
    -- Admin Environment Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.environment.list', 'GET', '/api/v1/admin/environments', false, 'Admin - List environments'),
      (uuid_generate_v1(), 'admin.environment.read', 'GET', '/api/v1/admin/environments/{envId}', false, 'Admin - View environment details'),
      (uuid_generate_v1(), 'admin.environment.update', 'PUT', '/api/v1/admin/environments/{envId}', true, 'Admin - Update environment'),
      (uuid_generate_v1(), 'admin.environment.delete', 'DELETE', '/api/v1/admin/environments/{envId}', true, 'Admin - Delete environment');

    -- ========================================
    -- Admin Member Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.member.list', 'GET', '/api/v1/admin/organizations/{orgId}/members', false, 'Admin - List organization members'),
      (uuid_generate_v1(), 'admin.member.read', 'GET', '/api/v1/admin/organizations/{orgId}/members/{memberId}', false, 'Admin - View member details'),
      (uuid_generate_v1(), 'admin.member.update', 'PUT', '/api/v1/admin/organizations/{orgId}/members/{memberId}', true, 'Admin - Update member'),
      (uuid_generate_v1(), 'admin.member.remove', 'DELETE', '/api/v1/admin/organizations/{orgId}/members/{memberId}', true, 'Admin - Remove member'),
      (uuid_generate_v1(), 'admin.group.members.list', 'GET', '/api/v1/admin/groups/{groupId}/members', false, 'Admin - List group members'),
      (uuid_generate_v1(), 'admin.group.member.add', 'POST', '/api/v1/admin/groups/{groupId}/members', true, 'Admin - Add group member'),
      (uuid_generate_v1(), 'admin.group.member.remove', 'DELETE', '/api/v1/admin/groups/{groupId}/members/{userId}', true, 'Admin - Remove group member');

    -- ========================================
    -- Admin Group Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.group.list', 'GET', '/api/v1/admin/groups', false, 'Admin - List groups'),
      (uuid_generate_v1(), 'admin.group.read', 'GET', '/api/v1/admin/groups/{groupId}', false, 'Admin - View group details'),
      (uuid_generate_v1(), 'admin.group.update', 'PUT', '/api/v1/admin/groups/{groupId}', true, 'Admin - Update group'),
      (uuid_generate_v1(), 'admin.group.delete', 'DELETE', '/api/v1/admin/groups/{groupId}', true, 'Admin - Delete group');

    -- ========================================
    -- Admin Role & Permission Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.role.list', 'GET', '/api/v1/admin/roles', false, 'Admin - List roles'),
      (uuid_generate_v1(), 'admin.role.create', 'POST', '/api/v1/admin/roles', true, 'Admin - Create role'),
      (uuid_generate_v1(), 'admin.role.read', 'GET', '/api/v1/admin/roles/{roleId}', false, 'Admin - View role details'),
      (uuid_generate_v1(), 'admin.role.update', 'PUT', '/api/v1/admin/roles/{roleId}', true, 'Admin - Update role'),
      (uuid_generate_v1(), 'admin.role.delete', 'DELETE', '/api/v1/admin/roles/{roleId}', true, 'Admin - Delete role'),
      (uuid_generate_v1(), 'admin.role.permissions.list', 'GET', '/api/v1/admin/roles/{roleId}/permissions', false, 'Admin - List role permissions'),
      (uuid_generate_v1(), 'admin.role.permission.add', 'POST', '/api/v1/admin/roles/{roleId}/permissions', true, 'Admin - Add role permission'),
      (uuid_generate_v1(), 'admin.role.permission.remove', 'DELETE', '/api/v1/admin/roles/{roleId}/permissions/{permissionId}', true, 'Admin - Remove role permission'),
      (uuid_generate_v1(), 'admin.permission.list', 'GET', '/api/v1/admin/permissions', false, 'Admin - List permissions');

    -- ========================================
    -- Admin Role Assignment Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.assignment.list', 'GET', '/api/v1/admin/role-assignments', false, 'Admin - List role assignments'),
      (uuid_generate_v1(), 'admin.assignment.create', 'POST', '/api/v1/admin/role-assignments', true, 'Admin - Create role assignment'),
      (uuid_generate_v1(), 'admin.assignment.delete', 'DELETE', '/api/v1/admin/role-assignments/{assignmentId}', true, 'Admin - Delete role assignment');

    -- ========================================
    -- Admin Device Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.device.list', 'GET', '/api/v1/admin/devices', false, 'Admin - List devices'),
      (uuid_generate_v1(), 'admin.device.read', 'GET', '/api/v1/admin/devices/{deviceId}', false, 'Admin - View device details'),
      (uuid_generate_v1(), 'admin.device.update', 'PUT', '/api/v1/admin/devices/{deviceId}', true, 'Admin - Update device'),
      (uuid_generate_v1(), 'admin.device.revoke', 'DELETE', '/api/v1/admin/devices/{deviceId}', true, 'Admin - Revoke device');

    -- ========================================
    -- Admin Session Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.session.list', 'GET', '/api/v1/admin/sessions', false, 'Admin - List sessions'),
      (uuid_generate_v1(), 'admin.session.read', 'GET', '/api/v1/admin/sessions/{sessionId}', false, 'Admin - View session details'),
      (uuid_generate_v1(), 'admin.session.revoke', 'DELETE', '/api/v1/admin/sessions/{sessionId}', true, 'Admin - Revoke session'),
      (uuid_generate_v1(), 'admin.session.revoke_user', 'DELETE', '/api/v1/admin/sessions/user/{userId}', true, 'Admin - Revoke all user sessions');

    -- ========================================
    -- Admin Impersonation Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.impersonation.start', 'POST', '/api/v1/admin/users/{userId}/impersonate', true, 'Admin - Start user impersonation'),
      (uuid_generate_v1(), 'admin.impersonation.end', 'DELETE', '/api/v1/admin/impersonation/end', true, 'Admin - End current impersonation'),
      (uuid_generate_v1(), 'admin.impersonation.active', 'GET', '/api/v1/admin/impersonation/active', false, 'Admin - View active impersonation sessions'),
      (uuid_generate_v1(), 'admin.impersonation.list', 'GET', '/api/v1/admin/impersonation-sessions', false, 'Admin - List impersonation sessions'),
      (uuid_generate_v1(), 'admin.impersonation.force_end', 'DELETE', '/api/v1/admin/impersonation-sessions/{sessionId}', true, 'Admin - Force end impersonation session');

    -- ========================================
    -- Admin Event Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.event.list', 'GET', '/api/v1/admin/events', false, 'Admin - List events'),
      (uuid_generate_v1(), 'admin.event.read', 'GET', '/api/v1/admin/events/{eventId}', false, 'Admin - View event details'),
      (uuid_generate_v1(), 'admin.event_type.list', 'GET', '/api/v1/admin/event-types', false, 'Admin - List event types'),
      (uuid_generate_v1(), 'admin.event_type.create', 'POST', '/api/v1/admin/event-types', true, 'Admin - Create event type'),
      (uuid_generate_v1(), 'admin.event_type.read', 'GET', '/api/v1/admin/event-types/{eventTypeId}', false, 'Admin - View event type details'),
      (uuid_generate_v1(), 'admin.event_type.update', 'PUT', '/api/v1/admin/event-types/{eventTypeId}', true, 'Admin - Update event type'),
      (uuid_generate_v1(), 'admin.event_type.delete', 'DELETE', '/api/v1/admin/event-types/{eventTypeId}', true, 'Admin - Delete event type'),
      (uuid_generate_v1(), 'admin.event_type_subscription.list', 'GET', '/api/v1/admin/event-type-subscriptions', false, 'Admin - List event type subscriptions');

    -- ========================================
    -- Admin Webhook Events
    -- ========================================

    INSERT INTO event_type (id, verb, http_method, http_path, is_webhook_event, description) VALUES
      (uuid_generate_v1(), 'admin.webhook.list', 'GET', '/api/v1/admin/webhooks', false, 'Admin - List webhooks'),
      (uuid_generate_v1(), 'admin.webhook.create', 'POST', '/api/v1/admin/webhooks', true, 'Admin - Create webhook'),
      (uuid_generate_v1(), 'admin.webhook.read', 'GET', '/api/v1/admin/webhooks/{webhookId}', false, 'Admin - View webhook details'),
      (uuid_generate_v1(), 'admin.webhook.update', 'PUT', '/api/v1/admin/webhooks/{webhookId}', true, 'Admin - Update webhook'),
      (uuid_generate_v1(), 'admin.webhook.delete', 'DELETE', '/api/v1/admin/webhooks/{webhookId}', true, 'Admin - Delete webhook'),
      (uuid_generate_v1(), 'admin.webhook.deliveries.list', 'GET', '/api/v1/admin/webhooks/{webhookId}/deliveries', false, 'Admin - List webhook deliveries'),
      (uuid_generate_v1(), 'admin.webhook.delivery.retry', 'POST', '/api/v1/admin/webhooks/{webhookId}/deliveries/{deliveryId}/retry', true, 'Admin - Retry webhook delivery');
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    -- Delete all event types (cascade will handle event_type_subscription references)
    DELETE FROM event_type;
  `);
}
