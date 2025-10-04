/**
 * RBAC Service - Permission Management
 *
 * STUB IMPLEMENTATION: This service currently returns mock permissions for testing.
 *
 * TODO (Phase 2): Implement database queries to retrieve actual user permissions
 * based on:
 * - User's organization_member roles
 * - User's group_member roles
 * - Environment-specific role assignments
 * - Impersonation context overrides
 */

import { Permission } from '../middleware/rbac.middleware';

/**
 * Mock user permission mappings for testing
 * Maps UUIDs to permission sets
 */
const MOCK_USER_PERMISSIONS: Record<string, Permission[]> = {
  // System Admin User
  '00000000-0000-0000-0000-000000000001': [
    'admin:users:read',
    'admin:users:manage',
    'admin:users:impersonate',
    'admin:organizations:read',
    'admin:organizations:manage',
    'admin:environments:read',
    'admin:environments:manage',
    'admin:groups:read',
    'admin:groups:manage',
    'admin:members:read',
    'admin:members:manage',
    'admin:devices:read',
    'admin:devices:manage',
    'admin:sessions:read',
    'admin:sessions:manage',
    'admin:roles:read',
    'admin:roles:manage',
    'admin:permissions:read',
    'admin:assignments:read',
    'admin:assignments:manage',
    'admin:impersonation:read',
    'admin:impersonation:manage',
    'admin:events:read',
    'admin:webhooks:read',
    'admin:webhooks:manage',
  ],

  // Regular User with Standard Permissions
  '11111111-1111-1111-1111-111111111111': [
    'users:read',
    'devices:manage',
    'sessions:manage',
    'members:read',
    'groups:read',
    'organizations:read',
    'environments:read',
    'events:read',
  ],

  // Impersonated User (limited permissions)
  '22222222-2222-2222-2222-222222222222': [
    'users:read',
    'events:read',
  ],

  // User with No Permissions (edge case)
  '33333333-3333-3333-3333-333333333333': [],
};

/**
 * Get user's permissions in current context
 *
 * @param userId - User ID (UUID) to get permissions for
 * @returns Array of permission strings
 *
 * STUB: Returns mock permissions for testing
 * TODO: Implement actual database lookup:
 * 1. Query environment_role_assignment for user's roles
 * 2. Join with role_permission to get permissions
 * 3. Consider group hierarchy (inherited permissions)
 * 4. Return unique list of permissions
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error(`Invalid user ID format: ${userId}`);
  }

  // Return mock permissions if user exists, otherwise default empty array
  return MOCK_USER_PERMISSIONS[userId] || [];
}

/**
 * Check if user has specific permission
 *
 * @param userId - User ID to check
 * @param permission - Permission to check for
 * @returns True if user has permission
 */
export async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}

/**
 * Get permissions for impersonation context
 * Handles permission overrides from impersonation session
 *
 * @param effectiveUserId - The user being impersonated
 * @param permissionOverrides - Optional permission overrides from impersonation session
 * @returns Array of permissions
 */
export async function getImpersonationPermissions(
  effectiveUserId: string,
  permissionOverrides?: Record<string, boolean> | null
): Promise<Permission[]> {
  // If permission overrides specified, use those
  if (permissionOverrides) {
    return Object.entries(permissionOverrides)
      .filter(([_, allowed]) => allowed)
      .map(([perm]) => perm as Permission);
  }

  // Otherwise, get effective user's normal permissions
  return getUserPermissions(effectiveUserId);
}
