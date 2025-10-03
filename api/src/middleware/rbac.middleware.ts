/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces permission checks based on user roles
 *
 * ⚠️ SECURITY CRITICAL: This middleware MUST be implemented before any endpoint implementation
 * See: /api/docs/SECURITY_VULNERABILITY_ASSESSMENT.md
 */

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

/**
 * Permission types as documented in OpenAPI spec
 */
export type Permission =
  // User-scoped permissions
  | 'users:read'
  | 'devices:manage'
  | 'sessions:manage'
  | 'members:read'
  | 'members:manage'
  | 'members:impersonate'
  | 'groups:read'
  | 'groups:manage'
  | 'organizations:read'
  | 'organizations:manage'
  | 'environments:read'
  | 'environments:manage'
  | 'roles:assign'
  | 'events:read'
  | 'webhooks:read'
  | 'webhooks:manage'
  // Admin-scoped permissions
  | 'admin:users:read'
  | 'admin:users:manage'
  | 'admin:users:impersonate'
  | 'admin:organizations:read'
  | 'admin:organizations:manage'
  | 'admin:environments:read'
  | 'admin:environments:manage'
  | 'admin:groups:read'
  | 'admin:groups:manage'
  | 'admin:members:read'
  | 'admin:members:manage'
  | 'admin:devices:read'
  | 'admin:devices:manage'
  | 'admin:sessions:read'
  | 'admin:sessions:manage'
  | 'admin:roles:read'
  | 'admin:roles:manage'
  | 'admin:permissions:read'
  | 'admin:assignments:read'
  | 'admin:assignments:manage'
  | 'admin:impersonation:read'
  | 'admin:impersonation:manage'
  | 'admin:events:read'
  | 'admin:webhooks:read'
  | 'admin:webhooks:manage';

/**
 * RBAC Middleware Factory
 * Creates middleware that checks if user has required permissions
 *
 * @param requiredPermissions - Array of permissions, user needs at least one
 * @returns Middleware function
 *
 * TODO: Implement RBAC logic:
 * 1. Get user permissions from database based on req.user.sub
 * 2. Check if user has any of the required permissions
 * 3. Handle impersonation context (check both original and effective user permissions)
 * 4. Throw ForbiddenError if no matching permissions
 */
export const requirePermissions = (
  _requiredPermissions: Permission[]
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (_req: Request, _res: Response, _next: NextFunction): void => {
    // TODO: Implement permission checking
    // Required permissions: _requiredPermissions.join(', ')
    throw new ForbiddenError();

    // Implementation reference:
    // const userPermissions = await getUserPermissions(req.user.sub);
    // const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
    // if (!hasPermission) throw new ForbiddenError('Insufficient permissions');
    // next();
  };
};

/**
 * Admin-only middleware
 * Shorthand for requiring admin:* permissions
 */
export const requireAdmin = requirePermissions(['admin:users:read']);

/**
 * Check if user has permission (utility function)
 * Can be used in controllers for conditional logic
 *
 * @param userId - User ID to check permissions for
 * @param permission - Permission to check
 * @returns Promise<boolean>
 */
export async function hasPermission(
  _userId: string,
  _permission: Permission
): Promise<boolean> {
  // TODO: Implement permission check
  return false;
}

export default requirePermissions;
