/**
 * MagicToken Model (Stub)
 *
 * Temporary in-memory implementation for TDD purposes.
 * Will be replaced with actual database model later.
 */

export interface MagicToken {
  userId: string;
  token: string;
  code: string;
  deviceFingerprint?: Record<string, any>;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

// Temporary in-memory storage
// Using token/code as key for quick lookup
const tokens: Map<string, MagicToken> = new Map();

export class MagicTokenModel {
  /**
   * Create a new magic token
   */
  static async create(data: MagicToken): Promise<MagicToken> {
    // Store by both token and code for flexible verification
    tokens.set(data.token, data);
    tokens.set(data.code, data);
    return data;
  }

  /**
   * Find token by token string or code
   */
  static async findByToken(tokenOrCode: string): Promise<MagicToken | null> {
    return tokens.get(tokenOrCode) || null;
  }

  /**
   * Mark token as used
   */
  static async markAsUsed(tokenOrCode: string): Promise<boolean> {
    const token = tokens.get(tokenOrCode);
    if (!token) return false;

    token.usedAt = new Date().toISOString();
    return true;
  }

  /**
   * Delete token
   */
  static async delete(tokenOrCode: string): Promise<boolean> {
    const token = tokens.get(tokenOrCode);
    if (!token) return false;

    // Delete both entries (token and code)
    tokens.delete(token.token);
    tokens.delete(token.code);
    return true;
  }

  /**
   * Clear all tokens (for testing)
   */
  static async clear(): Promise<void> {
    tokens.clear();
  }
}
