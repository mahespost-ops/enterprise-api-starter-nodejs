/**
 * Test helpers for authentication flows
 * Provides utilities for JWT generation and magic token extraction
 */

import jwt from 'jsonwebtoken';
import config from '../../config';
import { MagicTokenModel } from '../../models/MagicToken.model';
import { UserModel } from '../../models/User.model';
import { SessionModel } from '../../models/Session.model';

/**
 * Generate a valid JWT token for testing
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
      permissions: any;
    }>;
  };
  expiresIn?: string | number;
}): string {
  const { expiresIn = '1h', ...jwtPayload } = payload;

  return jwt.sign(jwtPayload, config.jwt.secret, {
    expiresIn: expiresIn as string | number,
  });
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
 * This is a test helper that accesses the in-memory token store
 */
export async function getLatestMagicTokenForUser(email: string): Promise<{
  token: string;
  code: string;
} | null> {
  // Find user by email
  const user = await UserModel.findByEmail(email);
  if (!user) {
    return null;
  }

  // Access the internal token map (this is a hack for testing only)
  // In production, we'd query the database
  // TypeScript hack to access private storage
  const MagicTokenModelAny = MagicTokenModel as any;
  const tokensModule = await import('../../models/MagicToken.model');

  // Get all map entries
  const tokenEntries: any[] = [];

  // Try to find the tokens map through various methods
  // Method 1: Check if it's exposed on the class
  if (MagicTokenModelAny.tokens) {
    for (const [, value] of MagicTokenModelAny.tokens.entries()) {
      if (value.userId === user.id && !value.usedAt) {
        tokenEntries.push(value);
      }
    }
  }

  // Method 2: Try accessing through module scope
  if (tokenEntries.length === 0 && (tokensModule as any).tokens) {
    for (const [, value] of (tokensModule as any).tokens.entries()) {
      if (value.userId === user.id && !value.usedAt) {
        tokenEntries.push(value);
      }
    }
  }

  if (tokenEntries.length === 0) {
    return null;
  }

  // Deduplicate by token (since we store by both token and code)
  const uniqueTokens = new Map<string, any>();
  for (const entry of tokenEntries) {
    if (!uniqueTokens.has(entry.token)) {
      uniqueTokens.set(entry.token, entry);
    }
  }

  // Sort by createdAt and return the most recent
  const sortedTokens = Array.from(uniqueTokens.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    token: sortedTokens[0].token,
    code: sortedTokens[0].code,
  };
}

/**
 * Clear all magic tokens (for test cleanup)
 */
export async function clearAllMagicTokens(): Promise<void> {
  await MagicTokenModel.clear();
}

/**
 * Clear all users (for test cleanup)
 */
export async function clearAllUsers(): Promise<void> {
  await UserModel.clear();
}

/**
 * Clear all sessions (for test cleanup)
 */
export async function clearAllSessions(): Promise<void> {
  await SessionModel.clear();
}
