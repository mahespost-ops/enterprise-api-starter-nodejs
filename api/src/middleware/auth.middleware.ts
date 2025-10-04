/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user context to requests
 *
 * ⚠️ SECURITY CRITICAL: This middleware MUST be implemented before any endpoint implementation
 * See: /api/docs/SECURITY_VULNERABILITY_ASSESSMENT.md
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { JWTPayload } from '../types/express';
import config from '../config';

/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user to request
 *
 * @throws UnauthorizedError if token is missing or invalid
 */
export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    // Remove 'Bearer ' prefix if present, otherwise use token as-is
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token || token.trim() === '') {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token signature and decode payload
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Attach decoded payload to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    // Re-throw if already an UnauthorizedError
    throw error;
  }
};

/**
 * Optional Authentication Middleware
 * Attempts to authenticate but allows request to proceed if no token
 * Used for endpoints that have different behavior for authenticated vs unauthenticated users
 */
export const optionalAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token || token.trim() === '') {
      return next();
    }

    // Try to verify token, but don't throw if invalid
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    req.user = decoded;

    next();
  } catch {
    // Token invalid, continue without authentication
    next();
  }
};

/**
 * Multi-tenant Context Validation Middleware
 * Validates that orgId and envId from path match JWT token claims
 *
 * @throws ForbiddenError if context doesn't match token
 */
export const validateTenantContextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // User must be authenticated first
  if (!req.user) {
    throw new ForbiddenError('User context missing from request');
  }

  const { orgId, envId } = req.params;

  // Validate orgId if present in path
  if (orgId && orgId !== req.user.orgId) {
    throw new ForbiddenError(
      `Access denied: Organization context mismatch (expected: ${req.user.orgId}, got: ${orgId})`
    );
  }

  // Validate envId if present in path
  if (envId && envId !== req.user.envId) {
    throw new ForbiddenError(
      `Access denied: Environment context mismatch (expected: ${req.user.envId}, got: ${envId})`
    );
  }

  next();
};

export default authMiddleware;
