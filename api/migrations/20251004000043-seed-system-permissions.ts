/**
 * Migration: Seed System Permissions and Roles
 * Purpose: Inserts core permissions and roles for RBAC system
 */

import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    -- ========================================
    -- Core Tenant-Scoped Permissions
    -- ========================================

    INSERT INTO permission (id, key, name, resource, action, description, is_system) VALUES
      (uuid_generate_v1(), 'devices:read', 'Read Devices', 'devices', 'read', 'View device information', true),
      (uuid_generate_v1(), 'devices:manage', 'Manage Devices', 'devices', 'manage', 'Create, update, delete devices', true),
      (uuid_generate_v1(), 'sessions:read', 'Read Sessions', 'sessions', 'read', 'View session information', true),
      (uuid_generate_v1(), 'sessions:manage', 'Manage Sessions', 'sessions', 'manage', 'Revoke sessions', true),
      (uuid_generate_v1(), 'members:read', 'Read Members', 'members', 'read', 'View organization members', true),
      (uuid_generate_v1(), 'members:manage', 'Manage Members', 'members', 'manage', 'Invite, update, remove members', true),
      (uuid_generate_v1(), 'members:impersonate', 'Impersonate Members', 'members', 'manage', 'Impersonate organization members within hierarchy', true),
      (uuid_generate_v1(), 'groups:read', 'Read Groups', 'groups', 'read', 'View groups', true),
      (uuid_generate_v1(), 'groups:manage', 'Manage Groups', 'groups', 'manage', 'Create, update, delete groups', true),
      (uuid_generate_v1(), 'events:read', 'Read Events', 'events', 'read', 'View audit events', true),
      (uuid_generate_v1(), 'webhooks:read', 'Read Webhooks', 'webhooks', 'read', 'View webhooks', true),
      (uuid_generate_v1(), 'webhooks:manage', 'Manage Webhooks', 'webhooks', 'manage', 'Create, update, delete webhooks', true),
      (uuid_generate_v1(), 'environments:read', 'Read Environments', 'environments', 'read', 'View environments', true),
      (uuid_generate_v1(), 'environments:manage', 'Manage Environments', 'environments', 'manage', 'Create, update, delete environments', true);

    -- ========================================
    -- Admin System-Wide Permissions
    -- ========================================

    INSERT INTO permission (id, key, name, resource, action, description, is_system) VALUES
      -- Users
      (uuid_generate_v1(), 'admin:users:read', 'Admin - Read Users', 'admin', 'read', 'View all users system-wide', true),
      (uuid_generate_v1(), 'admin:users:manage', 'Admin - Manage Users', 'admin', 'manage', 'Manage all users system-wide', true),
      (uuid_generate_v1(), 'admin:users:impersonate', 'Admin - Impersonate Users', 'admin', 'manage', 'Impersonate any user system-wide', true),
      -- Organizations
      (uuid_generate_v1(), 'admin:organizations:read', 'Admin - Read Organizations', 'admin', 'read', 'View all organizations', true),
      (uuid_generate_v1(), 'admin:organizations:manage', 'Admin - Manage Organizations', 'admin', 'manage', 'Manage all organizations', true),
      -- Environments
      (uuid_generate_v1(), 'admin:environments:read', 'Admin - Read Environments', 'admin', 'read', 'View all environments', true),
      (uuid_generate_v1(), 'admin:environments:manage', 'Admin - Manage Environments', 'admin', 'manage', 'Manage all environments', true),
      -- Members
      (uuid_generate_v1(), 'admin:members:read', 'Admin - Read Members', 'admin', 'read', 'View all members system-wide', true),
      (uuid_generate_v1(), 'admin:members:manage', 'Admin - Manage Members', 'admin', 'manage', 'Manage all members system-wide', true),
      -- Groups
      (uuid_generate_v1(), 'admin:groups:read', 'Admin - Read Groups', 'admin', 'read', 'View all groups system-wide', true),
      (uuid_generate_v1(), 'admin:groups:manage', 'Admin - Manage Groups', 'admin', 'manage', 'Manage all groups system-wide', true),
      -- Roles & Permissions
      (uuid_generate_v1(), 'admin:roles:read', 'Admin - Read Roles', 'admin', 'read', 'View all roles', true),
      (uuid_generate_v1(), 'admin:roles:manage', 'Admin - Manage Roles', 'admin', 'manage', 'Create, update, delete roles', true),
      (uuid_generate_v1(), 'admin:permissions:read', 'Admin - Read Permissions', 'admin', 'read', 'View all permissions', true),
      -- Role Assignments
      (uuid_generate_v1(), 'admin:assignments:read', 'Admin - Read Role Assignments', 'admin', 'read', 'View role assignments', true),
      (uuid_generate_v1(), 'admin:assignments:manage', 'Admin - Manage Role Assignments', 'admin', 'manage', 'Create, delete role assignments', true),
      -- Devices
      (uuid_generate_v1(), 'admin:devices:read', 'Admin - Read Devices', 'admin', 'read', 'View all devices system-wide', true),
      (uuid_generate_v1(), 'admin:devices:manage', 'Admin - Manage Devices', 'admin', 'manage', 'Manage all devices system-wide', true),
      -- Sessions
      (uuid_generate_v1(), 'admin:sessions:read', 'Admin - Read Sessions', 'admin', 'read', 'View all sessions system-wide', true),
      (uuid_generate_v1(), 'admin:sessions:manage', 'Admin - Manage Sessions', 'admin', 'manage', 'Revoke any session system-wide', true),
      -- Impersonation
      (uuid_generate_v1(), 'admin:impersonation:read', 'Admin - Read Impersonation', 'admin', 'read', 'View impersonation sessions', true),
      (uuid_generate_v1(), 'admin:impersonation:manage', 'Admin - Manage Impersonation', 'admin', 'manage', 'Force-end impersonation sessions', true),
      -- Events
      (uuid_generate_v1(), 'admin:events:read', 'Admin - Read Events', 'admin', 'read', 'View all events system-wide', true),
      (uuid_generate_v1(), 'admin:events:manage', 'Admin - Manage Events', 'admin', 'manage', 'Manage event types system-wide', true),
      -- Webhooks
      (uuid_generate_v1(), 'admin:webhooks:read', 'Admin - Read Webhooks', 'admin', 'read', 'View all webhooks system-wide', true),
      (uuid_generate_v1(), 'admin:webhooks:manage', 'Admin - Manage Webhooks', 'admin', 'manage', 'Manage all webhooks system-wide', true);

    -- ========================================
    -- System Roles
    -- ========================================

    -- Insert roles with initial permission_count = 0 (will be updated via role_permission)
    INSERT INTO role (id, name, description, is_system, permission_count) VALUES
      (uuid_generate_v1(), 'System Admin', 'Full system administration access', true, 0),
      (uuid_generate_v1(), 'Organization Admin', 'Full access to organization resources', true, 0),
      (uuid_generate_v1(), 'Organization Member', 'Standard member access within organization', true, 0),
      (uuid_generate_v1(), 'Organization Viewer', 'Read-only access to organization resources', true, 0);

    -- ========================================
    -- Role-Permission Mappings
    -- ========================================

    -- System Admin: All admin permissions
    INSERT INTO role_permission (id, role_id, permission_id)
    SELECT
      uuid_generate_v1(),
      (SELECT id FROM role WHERE name = 'System Admin'),
      id
    FROM permission
    WHERE key LIKE 'admin:%';

    -- Organization Admin: All tenant permissions
    INSERT INTO role_permission (id, role_id, permission_id)
    SELECT
      uuid_generate_v1(),
      (SELECT id FROM role WHERE name = 'Organization Admin'),
      id
    FROM permission
    WHERE key NOT LIKE 'admin:%';

    -- Organization Member: Limited tenant permissions
    INSERT INTO role_permission (id, role_id, permission_id)
    SELECT
      uuid_generate_v1(),
      (SELECT id FROM role WHERE name = 'Organization Member'),
      id
    FROM permission
    WHERE key IN (
      'devices:read', 'devices:manage',
      'sessions:read', 'sessions:manage',
      'members:read',
      'groups:read',
      'events:read',
      'webhooks:read',
      'environments:read'
    );

    -- Organization Viewer: Read-only tenant permissions
    INSERT INTO role_permission (id, role_id, permission_id)
    SELECT
      uuid_generate_v1(),
      (SELECT id FROM role WHERE name = 'Organization Viewer'),
      id
    FROM permission
    WHERE key IN (
      'devices:read',
      'sessions:read',
      'members:read',
      'groups:read',
      'events:read',
      'webhooks:read',
      'environments:read'
    );

    -- Update permission_count for all roles
    UPDATE role SET permission_count = (
      SELECT COUNT(*) FROM role_permission WHERE role_permission.role_id = role.id
    );
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    DELETE FROM role_permission WHERE role_id IN (SELECT id FROM role WHERE is_system = TRUE);
    DELETE FROM role WHERE is_system = TRUE;
    DELETE FROM permission WHERE is_system = TRUE;
  `);
}
