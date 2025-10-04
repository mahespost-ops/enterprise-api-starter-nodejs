/**
 * Test helpers for authentication flows
 * Provides utilities for JWT generation and magic token extraction
 */

import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import config from '../../config';
import MagicLinkToken from '../../models/MagicLinkToken.model';
import User from '../../models/User.model';
import UserSession from '../../models/UserSession.model';

/**
 * Generate a valid JWT token for testing
 * @param payload - JWT payload with optional expiresIn (e.g., '1h', '15m', '7d')
 * @returns Signed JWT token
 */
export function generateTestJWT(payload: {
  sub: string;
  orgId?: string;
  envId?: string;
  user?: {
    fullName: string;
    email: string;
  };
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
  expiresIn?: StringValue;
}): string {
  const { expiresIn = '1h', ...jwtPayload } = payload;

  return jwt.sign(jwtPayload, config.jwt.secret, { expiresIn });
}

/**
 * Generate an expired JWT token for testing
 */
export function generateExpiredTestJWT(payload: {
  sub: string;
  orgId?: string;
  envId?: string;
  user?: {
    fullName: string;
    email: string;
  };
}): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '-1h', // Already expired
  });
}

/**
 * Extract the most recent magic token for a user (by email)
 * NOTE: In real Sequelize implementation, tokens are hashed and cannot be retrieved.
 * This helper is no longer functional with Sequelize. Tests should capture tokens
 * from API responses or use test-specific token generation.
 */
export async function getLatestMagicTokenForUser(email: string): Promise<{
  token: string;
  code: string;
} | null> {
  // Find user by email
  const user = await User.findByEmail(email);
  if (!user) {
    return null;
  }

  // With Sequelize, tokens are hashed and cannot be retrieved
  // This function is deprecated for Sequelize-based tests
  // Tests should capture tokens from registration/request-token responses
  throw new Error(
    'getLatestMagicTokenForUser is not supported with Sequelize. Tokens are hashed and cannot be retrieved. Capture tokens from API responses instead.'
  );
}

/**
 * Clear all magic tokens (for test cleanup)
 */
export async function clearAllMagicTokens(): Promise<void> {
  await MagicLinkToken.destroy({ where: {}, force: true });
}

/**
 * Clear all users (for test cleanup)
 */
export async function clearAllUsers(): Promise<void> {
  await User.destroy({ where: {}, force: true });
}

/**
 * Clear all sessions (for test cleanup)
 */
export async function clearAllSessions(): Promise<void> {
  await UserSession.destroy({ where: {}, force: true });
}
