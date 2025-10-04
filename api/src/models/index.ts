/**
 * Models Index
 * Central export point for all Sequelize models
 */

// Database connection
export { default as sequelize } from '../config/database';

// Authentication & Identity Models
export { User } from './User.model';
export { ExternalIdentity } from './ExternalIdentity.model';
export { MagicLinkToken } from './MagicLinkToken.model';
export { Device } from './Device.model';
export { UserSession } from './UserSession.model';

// Multi-Tenancy Models
export { Organization } from './Organization.model';
export { Environment } from './Environment.model';
export { OrganizationMember } from './OrganizationMember.model';

// RBAC Models
export { Group } from './Group.model';
export { GroupMember } from './GroupMember.model';
export { Role } from './Role.model';
export { Permission } from './Permission.model';
export { RolePermission } from './RolePermission.model';
export { EnvironmentRoleAssignment } from './EnvironmentRoleAssignment.model';

// Impersonation Models
export { UserImpersonationSession } from './UserImpersonationSession.model';

// Event & Webhook Models
export { EventType } from './EventType.model';
export { Event } from './Event.model';
export { Webhook } from './Webhook.model';
export { WebhookDelivery } from './WebhookDelivery.model';

// Type exports for convenience
export type { UserAttributes, UserCreationAttributes } from './User.model';
export type { ExternalIdentityAttributes, ExternalIdentityCreationAttributes } from './ExternalIdentity.model';
export type { MagicLinkTokenAttributes, MagicLinkTokenCreationAttributes } from './MagicLinkToken.model';
export type { DeviceAttributes, DeviceCreationAttributes } from './Device.model';
export type { UserSessionAttributes, UserSessionCreationAttributes } from './UserSession.model';
export type { OrganizationAttributes, OrganizationCreationAttributes } from './Organization.model';
export type { EnvironmentAttributes, EnvironmentCreationAttributes } from './Environment.model';
export type { OrganizationMemberAttributes, OrganizationMemberCreationAttributes } from './OrganizationMember.model';
export type { GroupAttributes, GroupCreationAttributes } from './Group.model';
export type { GroupMemberAttributes, GroupMemberCreationAttributes } from './GroupMember.model';
export type { RoleAttributes, RoleCreationAttributes } from './Role.model';
export type { PermissionAttributes, PermissionCreationAttributes } from './Permission.model';
export type { RolePermissionAttributes, RolePermissionCreationAttributes } from './RolePermission.model';
export type {
  EnvironmentRoleAssignmentAttributes,
  EnvironmentRoleAssignmentCreationAttributes,
} from './EnvironmentRoleAssignment.model';
export type {
  UserImpersonationSessionAttributes,
  UserImpersonationSessionCreationAttributes,
} from './UserImpersonationSession.model';
export type { EventTypeAttributes, EventTypeCreationAttributes } from './EventType.model';
export type { EventAttributes, EventCreationAttributes } from './Event.model';
export type { WebhookAttributes, WebhookCreationAttributes } from './Webhook.model';
export type { WebhookDeliveryAttributes, WebhookDeliveryCreationAttributes } from './WebhookDelivery.model';

/**
 * Initialize all model associations
 * Must be imported after all models are defined
 */
export { initializeAssociations } from './associations';
