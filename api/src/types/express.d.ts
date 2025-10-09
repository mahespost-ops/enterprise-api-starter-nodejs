/**
 * Express Request type extensions
 * Adds custom properties to Express Request object
 */

/**
 * JWT Token payload structure
 */
export interface JWTPayload {
  /** User ID (subject) - effective user ID when impersonating */
  sub: string;
  /** Organization ID from user's last_org_id */
  orgId: string;
  /** Environment ID from user's last_env_id */
  envId: string;
  /** User information */
  user: {
    fullName: string;
    email: string;
  };
  /** Issued at timestamp (Unix epoch) */
  iat: number;
  /** Expiration timestamp (Unix epoch) */
  exp: number;
  /** Impersonation context (present only when impersonating) */
  impersonation?: {
    originalUserId: string;
    effectiveUserId: string;
    impersonationChain: Array<{
      sessionId: string;
      userId: string;
      startedAt: string;
      impersonationType: 'system' | 'organization';
      permissions: Record<string, unknown> | null;
    }>;
  };
}

declare global {
  namespace Express {
    interface Request {
      /** Unique request ID for tracing and correlation */
      id: string;
      /** Authenticated user from JWT token (populated by authMiddleware) */
      user?: JWTPayload;
    }
  }
}

// Export empty object to make this a module
export {};
