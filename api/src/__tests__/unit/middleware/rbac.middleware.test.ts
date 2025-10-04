/**
 * Authorization (RBAC) Middleware Tests (TDD - Phase 1.2.2)
 *
 * These tests are written BEFORE implementation following TDD methodology.
 * They will FAIL initially until the middleware is implemented.
 */

import { Request, Response, NextFunction } from 'express';
import { authorize, hasPermission } from '../../../middleware/rbac.middleware';
import { ForbiddenError } from '../../../utils/errors';

// Note: Using real rbac.service.ts stub (returns mock permissions based on userId pattern)

describe('authorize middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  // Realistic test UUIDs matching mock data in rbac.service.ts
  const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';
  const REGULAR_USER_ID = '11111111-1111-1111-1111-111111111111';
  const IMPERSONATED_USER_ID = '22222222-2222-2222-2222-222222222222';
  const NO_PERMISSIONS_USER_ID = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    mockRequest = {
      user: {
        sub: REGULAR_USER_ID,
        orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        envId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        user: {
          fullName: 'Test User',
          email: 'test@example.com',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    };
    mockResponse = {};
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('Permission Checks', () => {
    it('should allow access when user has required permission', async () => {
      // REGULAR_USER_ID has 'users:read' permission
      const middleware = authorize(['users:read']);
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access when user lacks permission', async () => {
      // REGULAR_USER_ID does NOT have admin permissions
      const middleware = authorize(['admin:users:manage']);

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Should call next with ForbiddenError (Express best practice)
      expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should handle multiple required permissions (OR logic)', async () => {
      // REGULAR_USER_ID has 'groups:read' (one of the required permissions)
      const middleware = authorize(['groups:read', 'groups:manage']);
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny when user has none of multiple required permissions', async () => {
      // REGULAR_USER_ID does NOT have admin permissions
      const middleware = authorize(['admin:groups:read', 'admin:groups:manage']);

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Should call next with ForbiddenError
      expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('Admin Permissions', () => {
    it('should allow access when user has admin permission', async () => {
      // Use ADMIN_USER_ID which has all admin:* permissions
      mockRequest.user!.sub = ADMIN_USER_ID;

      const middleware = authorize(['admin:users:read']);
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny tenant-scoped permission when user only has admin permission', async () => {
      // ADMIN_USER_ID has admin:* permissions but NOT tenant permissions
      mockRequest.user!.sub = ADMIN_USER_ID;

      const middleware = authorize(['users:read']);

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Should call next with ForbiddenError
      expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('Impersonation Context', () => {
    it('should check effective user permissions during impersonation', async () => {
      mockRequest.user = {
        sub: IMPERSONATED_USER_ID,
        orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        envId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        user: {
          fullName: 'Impersonated User',
          email: 'impersonated@example.com',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        impersonation: {
          originalUserId: ADMIN_USER_ID,
          effectiveUserId: IMPERSONATED_USER_ID,
          impersonationChain: [
            {
              sessionId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
              userId: IMPERSONATED_USER_ID,
              startedAt: new Date().toISOString(),
              impersonationType: 'system',
              permissions: null,
            },
          ],
        },
      };

      // IMPERSONATED_USER_ID has 'users:read' permission
      const middleware = authorize(['users:read']);
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should respect permission overrides in impersonation context', async () => {
      mockRequest.user = {
        sub: IMPERSONATED_USER_ID,
        orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        envId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        user: {
          fullName: 'Impersonated User',
          email: 'impersonated@example.com',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        impersonation: {
          originalUserId: ADMIN_USER_ID,
          effectiveUserId: IMPERSONATED_USER_ID,
          impersonationChain: [
            {
              sessionId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
              userId: IMPERSONATED_USER_ID,
              startedAt: new Date().toISOString(),
              impersonationType: 'organization',
              permissions: { 'users:read': true, 'devices:manage': false }, // Override permissions
            },
          ],
        },
      };

      // When permissions object is present in impersonation context, use those instead
      const middleware = authorize(['users:read']);
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Should use impersonation permissions, not query database
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should call next with ForbiddenError when user not authenticated', async () => {
      mockRequest.user = undefined;

      const middleware = authorize(['users:read']);

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Express best practice: pass error to next()
      expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should call next with error when invalid user ID provided', async () => {
      // Invalid UUID format should trigger error in stub service
      mockRequest.user!.sub = 'invalid-user-id-not-uuid';

      const middleware = authorize(['users:read']);

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Should pass error to next() for global error handler
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('Invalid user ID format');
    });

    it('should call next with ForbiddenError when user has no permissions', async () => {
      // NO_PERMISSIONS_USER_ID has empty permissions array
      mockRequest.user!.sub = NO_PERMISSIONS_USER_ID;

      const middleware = authorize(['users:read']);

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Should pass ForbiddenError to next()
      expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});

describe('hasPermission utility', () => {
  const REGULAR_USER_ID = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when user has permission', async () => {
    // REGULAR_USER_ID has 'users:read' permission
    const result = await hasPermission(REGULAR_USER_ID, 'users:read');

    expect(result).toBe(true);
  });

  it('should return false when user does not have permission', async () => {
    // REGULAR_USER_ID does NOT have admin permissions
    const result = await hasPermission(REGULAR_USER_ID, 'admin:users:manage');

    expect(result).toBe(false);
  });

  it('should handle errors and return false', async () => {
    // Invalid UUID format triggers error
    const result = await hasPermission('invalid-uuid', 'users:read');

    expect(result).toBe(false);
  });
});
