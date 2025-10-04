/**
 * Authentication Middleware Tests (TDD - Phase 1.2.1)
 *
 * These tests are written BEFORE implementation following TDD methodology.
 * They will FAIL initially until the middleware is implemented.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticate,
  authenticateOptional,
  validateTenantContext,
} from '../../../middleware/auth.middleware';
import { UnauthorizedError, ForbiddenError } from '../../../utils/errors';
import { JWTPayload } from '../../../types/express';

// Mock config
jest.mock('../../../config', () => ({
  jwt: {
    secret: 'test-secret-key',
    expiresIn: '1h',
  },
}));

describe('authenticate', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  describe('Valid JWT Token', () => {
    it('should attach user to req when JWT is valid', () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        orgId: 'org-456',
        envId: 'env-789',
        user: {
          fullName: 'Test User',
          email: 'test@example.com',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, 'test-secret-key');
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.sub).toBe('user-123');
      expect(mockRequest.user?.orgId).toBe('org-456');
      expect(mockRequest.user?.envId).toBe('env-789');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should attach impersonation context when present in JWT', () => {
      const payload: JWTPayload = {
        sub: 'impersonated-user-123',
        orgId: 'org-456',
        envId: 'env-789',
        user: {
          fullName: 'Impersonated User',
          email: 'impersonated@example.com',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        impersonation: {
          originalUserId: 'admin-user-999',
          effectiveUserId: 'impersonated-user-123',
          impersonationChain: [
            {
              sessionId: 'session-abc',
              userId: 'impersonated-user-123',
              startedAt: new Date().toISOString(),
              impersonationType: 'system',
              permissions: null,
            },
          ],
        },
      };

      const token = jwt.sign(payload, 'test-secret-key');
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user?.impersonation).toBeDefined();
      expect(mockRequest.user?.impersonation?.originalUserId).toBe(
        'admin-user-999'
      );
      expect(mockRequest.user?.impersonation?.effectiveUserId).toBe(
        'impersonated-user-123'
      );
      expect(mockRequest.user?.impersonation?.impersonationChain).toHaveLength(
        1
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should accept token without Bearer prefix', () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        orgId: 'org-456',
        envId: 'env-789',
        user: {
          fullName: 'Test User',
          email: 'test@example.com',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, 'test-secret-key');
      mockRequest.headers = {
        authorization: token,
      };

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Missing or Invalid Token', () => {
    it('should throw UnauthorizedError when no Authorization header', () => {
      expect(() => {
        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }).toThrow(UnauthorizedError);

      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when Authorization header is empty', () => {
      mockRequest.headers = {
        authorization: '',
      };

      expect(() => {
        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }).toThrow(UnauthorizedError);

      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when JWT has invalid format', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token.format',
      };

      expect(() => {
        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }).toThrow(UnauthorizedError);

      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when JWT signature is invalid', () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        orgId: 'org-456',
        envId: 'env-789',
        user: {
          fullName: 'Test User',
          email: 'test@example.com',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, 'wrong-secret-key');
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      expect(() => {
        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }).toThrow(UnauthorizedError);

      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when JWT is expired', () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        orgId: 'org-456',
        envId: 'env-789',
        user: {
          fullName: 'Test User',
          email: 'test@example.com',
        },
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      };

      const token = jwt.sign(payload, 'test-secret-key');
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      expect(() => {
        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }).toThrow(UnauthorizedError);

      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle malformed tokens gracefully', () => {
      mockRequest.headers = {
        authorization: 'Bearer not-a-jwt-token',
      };

      expect(() => {
        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }).toThrow(UnauthorizedError);

      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});

describe('authenticateOptional', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  it('should attach user to req when valid token provided', () => {
    const payload: JWTPayload = {
      sub: 'user-123',
      orgId: 'org-456',
      envId: 'env-789',
      user: {
        fullName: 'Test User',
        email: 'test@example.com',
      },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = jwt.sign(payload, 'test-secret-key');
    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    authenticateOptional(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.sub).toBe('user-123');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should allow request to proceed when no token provided', () => {
    authenticateOptional(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.user).toBeUndefined();
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should allow request to proceed when invalid token provided', () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };

    authenticateOptional(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.user).toBeUndefined();
    expect(nextFunction).toHaveBeenCalled();
  });
});

describe('validateTenantContext', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      user: {
        sub: 'user-123',
        orgId: 'org-456',
        envId: 'env-789',
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
  });

  it('should pass when orgId matches JWT claim', () => {
    mockRequest.params = {
      orgId: 'org-456',
    };

    validateTenantContext(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
  });

  it('should pass when both orgId and envId match JWT claims', () => {
    mockRequest.params = {
      orgId: 'org-456',
      envId: 'env-789',
    };

    validateTenantContext(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
  });

  it('should throw ForbiddenError when orgId does not match JWT', () => {
    mockRequest.params = {
      orgId: 'wrong-org-999',
    };

    expect(() => {
      validateTenantContext(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
    }).toThrow(ForbiddenError);

    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError when envId does not match JWT', () => {
    mockRequest.params = {
      orgId: 'org-456',
      envId: 'wrong-env-999',
    };

    expect(() => {
      validateTenantContext(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
    }).toThrow(ForbiddenError);

    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError when user context is missing from JWT', () => {
    mockRequest.user = undefined;
    mockRequest.params = {
      orgId: 'org-456',
    };

    expect(() => {
      validateTenantContext(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
    }).toThrow(ForbiddenError);

    expect(nextFunction).not.toHaveBeenCalled();
  });

  it.skip('should allow admin to bypass context validation - REMOVED: Security anti-pattern', () => {
    // SECURITY DECISION: Admin bypass is NOT implemented by design
    // Admins should use:
    // 1. /admin/* routes (no tenant context)
    // 2. User impersonation (gets proper context)
    // 3. Group membership (added to org as member)
    //
    // Admin bypass creates security vulnerabilities and is unnecessary
  });
});
