/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces permission checks based on user roles
 *
 * ⚠️ SECURITY CRITICAL: This middleware MUST be implemented before any endpoint implementation
 * See: /api/docs/SECURITY_VULNERABILITY_ASSESSMENT.md
 */

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';

/**
 * Permission key types as documented in OpenAPI spec
 * These are the string values stored in the permission.key field
 *
 * Note: This is distinct from the Permission model class (models/Permission.model.ts)
 * - PermissionKey = string literal type for permission keys (e.g., 'users:read')
 * - Permission = Sequelize model class for permission database records
 */
export type PermissionKey =
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
 * @param requiredPermissions - Array of permissions, user needs at least one (OR logic)
 * @returns Middleware function
 */
export const authorize = (
  requiredPermissions: PermissionKey[]
): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // User must be authenticated
      if (!req.user) {
        throw new ForbiddenError(ERROR_MESSAGES.USER_NOT_AUTHENTICATED);
      }

      let userPermissions: PermissionKey[];

      // Check for impersonation context with permission overrides
      if (req.user.impersonation?.impersonationChain?.length) {
        const latestImpersonation = req.user.impersonation.impersonationChain[
          req.user.impersonation.impersonationChain.length - 1
        ];

        // SECURITY: Log all actions performed under impersonation
        const logger = await import('../config/logger');
        logger.default.warn('Action performed under impersonation', {
          path: req.path,
          method: req.method,
          originalUserId: req.user.impersonation.originalUserId,
          effectiveUserId: req.user.impersonation.effectiveUserId,
          targetUserId: req.user.sub,
          targetEmail: req.user.user?.email,
          impersonationChain: req.user.impersonation.impersonationChain.map(i => ({
            sessionId: i.sessionId,
            userId: i.userId,
            startedAt: i.startedAt,
            impersonationType: i.impersonationType
          })),
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        // If permission overrides specified in impersonation, use those
        if (latestImpersonation.permissions) {
          userPermissions = Object.entries(latestImpersonation.permissions)
            .filter(([_, allowed]) => allowed)
            .map(([perm]) => perm as PermissionKey);
        } else {
          // No overrides, get effective user's permissions
          const { getUserPermissions: getPerms } = await import('../services/rbac.service');
          userPermissions = await getPerms(req.user.sub);
        }
      } else {
        // No impersonation, get user's normal permissions
        const { getUserPermissions: getPerms } = await import('../services/rbac.service');
        userPermissions = await getPerms(req.user.sub);
      }

      // Check if user has ANY of the required permissions (OR logic)
      const hasRequiredPermission = requiredPermissions.some((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasRequiredPermission) {
        throw new ForbiddenError(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Admin-only middleware
 * Shorthand for requiring admin:* permissions
 */
export const requireAdmin = authorize(['admin:users:read']);

/**
 * Check if user has permission (utility function)
 * Can be used in controllers for conditional logic
 *
 * @param userId - User ID to check permissions for
 * @param permission - Permission to check
 * @returns Promise<boolean>
 */
export async function hasPermission(
  userId: string,
  permission: PermissionKey
): Promise<boolean> {
  try {
    const { getUserPermissions } = await import('../services/rbac.service');
    const permissions = await getUserPermissions(userId);
    return permissions.includes(permission);
  } catch {
    return false;
  }
}

export default authorize;
