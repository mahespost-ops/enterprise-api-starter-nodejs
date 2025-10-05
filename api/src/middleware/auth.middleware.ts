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
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import { HTTP_HEADERS, TOKEN_PREFIX } from '../constants/http.constants';
import { JWTPayload } from '../types/express';
import config from '../config';

/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user to request
 *
 * @throws UnauthorizedError if token is missing or invalid
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers[HTTP_HEADERS.AUTHORIZATION];

    if (!authHeader) {
      throw new UnauthorizedError(ERROR_MESSAGES.NO_AUTH_HEADER);
    }

    // Remove 'Bearer ' prefix if present, otherwise use token as-is
    const token = authHeader.startsWith(TOKEN_PREFIX.BEARER)
      ? authHeader.substring(TOKEN_PREFIX.BEARER.length)
      : authHeader;

    if (!token || token.trim() === '') {
      throw new UnauthorizedError(ERROR_MESSAGES.NO_TOKEN_PROVIDED);
    }

    // Verify token signature and decode payload
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Attach decoded payload to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError(ERROR_MESSAGES.INVALID_TOKEN);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError(ERROR_MESSAGES.TOKEN_EXPIRED);
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
export const authenticateOptional = (
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
export const validateTenantContext = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // User must be authenticated first
  if (!req.user) {
    throw new ForbiddenError(ERROR_MESSAGES.USER_CONTEXT_MISSING);
  }

  const { orgId, envId } = req.params;

  // Validate orgId if present in path
  if (orgId && orgId !== req.user.orgId) {
    throw new ForbiddenError(ERROR_MESSAGES.ORGANIZATION_CONTEXT_MISMATCH);
  }

  // Validate envId if present in path
  if (envId && envId !== req.user.envId) {
    throw new ForbiddenError(ERROR_MESSAGES.ENVIRONMENT_CONTEXT_MISMATCH);
  }

  next();
};
