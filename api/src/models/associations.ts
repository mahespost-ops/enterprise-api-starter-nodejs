/**
 * Model Associations
 * Defines all relationships between Sequelize models
 */

import { User } from './User.model';
import { ExternalIdentity } from './ExternalIdentity.model';
import { MagicLinkToken } from './MagicLinkToken.model';
import { Device } from './Device.model';
import { UserSession } from './UserSession.model';
import { Organization } from './Organization.model';
import { Environment } from './Environment.model';
import { OrganizationMember } from './OrganizationMember.model';
import { Group } from './Group.model';
import { GroupMember } from './GroupMember.model';
import { Role } from './Role.model';
import { Permission } from './Permission.model';
import { RolePermission } from './RolePermission.model';
import { EnvironmentRoleAssignment } from './EnvironmentRoleAssignment.model';
import { UserImpersonationSession } from './UserImpersonationSession.model';
import { EventType } from './EventType.model';
import { Event } from './Event.model';
import { Webhook } from './Webhook.model';
import { WebhookDelivery } from './WebhookDelivery.model';

/**
 * Initialize all model associations
 * Call this once after all models are defined
 */
export function initializeAssociations(): void {
  // ===========================
  // User Relationships
  // ===========================

  // User has many external identities (OAuth/SSO)
  User.hasMany(ExternalIdentity, {
    foreignKey: 'userId',
    as: 'externalIdentities',
    onDelete: 'CASCADE',
  });
  ExternalIdentity.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // User has many magic link tokens
  User.hasMany(MagicLinkToken, {
    foreignKey: 'userId',
    as: 'magicLinkTokens',
    onDelete: 'CASCADE',
  });
  MagicLinkToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // User has many devices
  User.hasMany(Device, {
    foreignKey: 'userId',
    as: 'devices',
    onDelete: 'CASCADE',
  });
  Device.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // User has many sessions
  User.hasMany(UserSession, {
    foreignKey: 'userId',
    as: 'sessions',
    onDelete: 'CASCADE',
  });
  UserSession.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // User has many impersonation sessions (as original user)
  User.hasMany(UserImpersonationSession, {
    foreignKey: 'originalUserId',
    as: 'initiatedImpersonations',
    onDelete: 'CASCADE',
  });

  // User has many impersonation sessions (as impersonated user)
  User.hasMany(UserImpersonationSession, {
    foreignKey: 'impersonatedUserId',
    as: 'receivedImpersonations',
    onDelete: 'CASCADE',
  });

  UserImpersonationSession.belongsTo(User, {
    foreignKey: 'originalUserId',
    as: 'originalUser',
  });

  UserImpersonationSession.belongsTo(User, {
    foreignKey: 'impersonatedUserId',
    as: 'impersonatedUser',
  });

  // ===========================
  // Organization Relationships
  // ===========================

  // Organization has many environments
  Organization.hasMany(Environment, {
    foreignKey: 'organizationId',
    as: 'environments',
    onDelete: 'CASCADE',
  });
  Environment.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // Organization belongs to default environment (circular FK)
  Organization.belongsTo(Environment, {
    foreignKey: 'defaultEnvId',
    as: 'defaultEnvironment',
    constraints: false, // Avoid circular constraint issues
  });

  // Organization has many members
  Organization.hasMany(OrganizationMember, {
    foreignKey: 'organizationId',
    as: 'members',
    onDelete: 'CASCADE',
  });
  OrganizationMember.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // Organization has many groups
  Organization.hasMany(Group, {
    foreignKey: 'organizationId',
    as: 'groups',
    onDelete: 'CASCADE',
  });
  Group.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // Organization has many webhooks (via environments)
  Organization.hasMany(Webhook, {
    foreignKey: 'environmentId',
    sourceKey: 'defaultEnvId',
    as: 'webhooks',
  });

  // ===========================
  // User-Organization Many-to-Many
  // ===========================

  // User belongs to many organizations (through organization_member)
  User.belongsToMany(Organization, {
    through: OrganizationMember,
    foreignKey: 'userId',
    otherKey: 'organizationId',
    as: 'organizations',
  });

  Organization.belongsToMany(User, {
    through: OrganizationMember,
    foreignKey: 'organizationId',
    otherKey: 'userId',
    as: 'users',
  });

  // OrganizationMember belongs to User
  OrganizationMember.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // ===========================
  // Environment Relationships
  // ===========================

  // Environment has many role assignments
  Environment.hasMany(EnvironmentRoleAssignment, {
    foreignKey: 'environmentId',
    as: 'roleAssignments',
    onDelete: 'CASCADE',
  });
  EnvironmentRoleAssignment.belongsTo(Environment, {
    foreignKey: 'environmentId',
    as: 'environment',
  });

  // Environment has many events
  Environment.hasMany(Event, {
    foreignKey: 'environmentId',
    as: 'events',
    onDelete: 'CASCADE',
  });
  Event.belongsTo(Environment, {
    foreignKey: 'environmentId',
    as: 'environment',
  });

  // Environment has many webhooks
  Environment.hasMany(Webhook, {
    foreignKey: 'environmentId',
    as: 'webhooks',
    onDelete: 'CASCADE',
  });
  Webhook.belongsTo(Environment, {
    foreignKey: 'environmentId',
    as: 'environment',
  });

  // Environment has many impersonation sessions
  Environment.hasMany(UserImpersonationSession, {
    foreignKey: 'environmentId',
    as: 'impersonationSessions',
    onDelete: 'CASCADE',
  });
  UserImpersonationSession.belongsTo(Environment, {
    foreignKey: 'environmentId',
    as: 'environment',
  });

  // ===========================
  // Group Relationships
  // ===========================

  // Group self-referencing hierarchy
  Group.belongsTo(Group, {
    foreignKey: 'parentId',
    as: 'parent',
    constraints: false,
  });

  Group.hasMany(Group, {
    foreignKey: 'parentId',
    as: 'children',
  });

  // Group has many members
  Group.hasMany(GroupMember, {
    foreignKey: 'groupId',
    as: 'members',
    onDelete: 'CASCADE',
  });
  GroupMember.belongsTo(Group, {
    foreignKey: 'groupId',
    as: 'group',
  });

  // Group has many role assignments
  Group.hasMany(EnvironmentRoleAssignment, {
    foreignKey: 'groupId',
    as: 'roleAssignments',
    onDelete: 'CASCADE',
  });
  EnvironmentRoleAssignment.belongsTo(Group, {
    foreignKey: 'groupId',
    as: 'group',
  });

  // ===========================
  // User-Group Many-to-Many
  // ===========================

  // User belongs to many groups (through group_member)
  User.belongsToMany(Group, {
    through: GroupMember,
    foreignKey: 'userId',
    otherKey: 'groupId',
    as: 'groups',
  });

  Group.belongsToMany(User, {
    through: GroupMember,
    foreignKey: 'groupId',
    otherKey: 'userId',
    as: 'users',
  });

  // GroupMember belongs to User
  GroupMember.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // ===========================
  // RBAC Relationships
  // ===========================

  // Role has many permissions (many-to-many through role_permission)
  Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'roleId',
    otherKey: 'permissionId',
    as: 'permissions',
  });

  Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permissionId',
    otherKey: 'roleId',
    as: 'roles',
  });

  // RolePermission belongs to Role and Permission
  RolePermission.belongsTo(Role, {
    foreignKey: 'roleId',
    as: 'role',
  });

  RolePermission.belongsTo(Permission, {
    foreignKey: 'permissionId',
    as: 'permission',
  });

  // Role has many environment role assignments
  Role.hasMany(EnvironmentRoleAssignment, {
    foreignKey: 'roleId',
    as: 'assignments',
    onDelete: 'CASCADE',
  });
  EnvironmentRoleAssignment.belongsTo(Role, {
    foreignKey: 'roleId',
    as: 'role',
  });

  // EnvironmentRoleAssignment belongs to OrganizationMember (polymorphic)
  EnvironmentRoleAssignment.belongsTo(OrganizationMember, {
    foreignKey: 'membershipId',
    as: 'membership',
  });

  OrganizationMember.hasMany(EnvironmentRoleAssignment, {
    foreignKey: 'membershipId',
    as: 'roleAssignments',
    onDelete: 'CASCADE',
  });

  // ===========================
  // Event & Webhook Relationships
  // ===========================

  // Event belongs to EventType (optional relationship via verb)
  Event.belongsTo(EventType, {
    foreignKey: 'verb',
    targetKey: 'verb',
    as: 'eventType',
    constraints: false,
  });

  // Webhook has many deliveries
  Webhook.hasMany(WebhookDelivery, {
    foreignKey: 'webhookId',
    as: 'deliveries',
    onDelete: 'CASCADE',
  });
  WebhookDelivery.belongsTo(Webhook, {
    foreignKey: 'webhookId',
    as: 'webhook',
  });

  // Event has many webhook deliveries
  Event.hasMany(WebhookDelivery, {
    foreignKey: 'eventId',
    as: 'deliveries',
    onDelete: 'CASCADE',
  });
  WebhookDelivery.belongsTo(Event, {
    foreignKey: 'eventId',
    as: 'event',
  });

  // ===========================
  // Session Relationships
  // ===========================

  // UserSession belongs to Device (optional)
  UserSession.belongsTo(Device, {
    foreignKey: 'deviceId',
    as: 'device',
  });

  Device.hasMany(UserSession, {
    foreignKey: 'deviceId',
    as: 'sessions',
  });

  // ===========================
  // Impersonation Session Chain
  // ===========================

  // UserImpersonationSession can reference parent session (chaining)
  UserImpersonationSession.belongsTo(UserImpersonationSession, {
    foreignKey: 'parentSessionId',
    as: 'parentSession',
    constraints: false,
  });

  UserImpersonationSession.hasMany(UserImpersonationSession, {
    foreignKey: 'parentSessionId',
    as: 'childSessions',
  });
}

export default initializeAssociations;
