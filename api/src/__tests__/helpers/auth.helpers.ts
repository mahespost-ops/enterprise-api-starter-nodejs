/**
 * Test helpers for authentication flows
 * Provides utilities for JWT generation and magic token extraction
 */

import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import config from '../../config';
import { MagicLinkToken } from '../../models/MagicLinkToken.model';
import { User } from '../../models/User.model';
import { UserSession } from '../../models/UserSession.model';
import { AdapterFactory } from '../../services/adapter.factory';
import type { MockEmailAdapter } from '../../services/email/mock.email.adapter';

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
 * Uses the MockEmailAdapter to retrieve tokens from sent emails
 */
export async function getLatestMagicTokenForUser(email: string): Promise<{
  token: string;
  code: string;
} | null> {
  // Get the email adapter (must be MockEmailAdapter in test environment)
  const emailAdapter = AdapterFactory.getInstance().getEmailAdapter() as MockEmailAdapter;

  // Extract token from the latest email sent to this address
  return emailAdapter.getLatestMagicTokenForEmail(email);
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

/**
 * Clear all devices (for test cleanup)
 */
export async function clearAllDevices(): Promise<void> {
  const { Device } = await import('../../models/Device.model');
  await Device.destroy({ where: {}, force: true });
}

/**
 * Clear all sent emails from mock adapter (for test cleanup)
 */
export function clearAllSentEmails(): void {
  const emailAdapter = AdapterFactory.getInstance().getEmailAdapter() as MockEmailAdapter;
  emailAdapter.clearSentEmails();
}

/**
 * Grant permissions to a user (for test setup)
 * Uses the mock RBAC service to assign permissions
 * @param userId - User ID to grant permissions to
 * @param permissions - Array of permission strings
 */
export async function grantPermissions(
  userId: string,
  permissions: string[]
): Promise<void> {
  const { setMockUserPermissions } = await import('../../services/rbac.service');
  setMockUserPermissions(userId, permissions as any[]);
}

/**
 * Clear permissions for a user (for test cleanup)
 * @param userId - User ID to clear permissions for
 */
export async function clearUserPermissions(userId: string): Promise<void> {
  const { clearMockUserPermissions } = await import('../../services/rbac.service');
  clearMockUserPermissions(userId);
}

/**
 * Clear all mock permissions (for test cleanup)
 */
export async function clearAllPermissions(): Promise<void> {
  const { clearAllMockPermissions } = await import('../../services/rbac.service');
  clearAllMockPermissions();
}
