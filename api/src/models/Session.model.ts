/**
 * Session Model (Stub)
 *
 * Temporary in-memory implementation for TDD purposes.
 * Will be replaced with actual database model later.
 */

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  refreshTokenHash: string;
  expiresAt: string;
  createdAt: string;
  lastAccessedAt?: string;
  isActive: boolean;
  revokedAt?: string;
}

// Temporary in-memory storage
const sessions: Map<string, Session> = new Map();

export class SessionModel {
  /**
   * Create a new session
   */
  static async create(data: Session): Promise<Session> {
    sessions.set(data.id, data);
    return data;
  }

  /**
   * Find session by ID
   */
  static async findById(id: string): Promise<Session | null> {
    return sessions.get(id) || null;
  }

  /**
   * Find all sessions for a user
   */
  static async findByUserId(userId: string): Promise<Session[]> {
    return Array.from(sessions.values()).filter(s => s.userId === userId);
  }

  /**
   * Find all sessions (for refresh token validation)
   */
  static async findAll(): Promise<Session[]> {
    return Array.from(sessions.values());
  }

  /**
   * Find session by refresh token hash
   */
  static async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    return Array.from(sessions.values()).find(s => s.refreshTokenHash === hash) || null;
  }

  /**
   * Update session
   */
  static async update(id: string, data: Partial<Session>): Promise<Session | null> {
    const session = sessions.get(id);
    if (!session) return null;

    const updated = {
      ...session,
      ...data,
    };

    sessions.set(id, updated);
    return updated;
  }

  /**
   * Revoke session
   */
  static async revoke(id: string): Promise<boolean> {
    const session = sessions.get(id);
    if (!session) return false;

    session.isActive = false;
    session.revokedAt = new Date().toISOString();
    return true;
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeAllForUser(userId: string): Promise<number> {
    const userSessions = Array.from(sessions.values()).filter(s => s.userId === userId);
    let count = 0;

    for (const session of userSessions) {
      session.isActive = false;
      session.revokedAt = new Date().toISOString();
      count++;
    }

    return count;
  }

  /**
   * Delete session
   */
  static async delete(id: string): Promise<boolean> {
    return sessions.delete(id);
  }

  /**
   * Clear all sessions (for testing)
   */
  static async clear(): Promise<void> {
    sessions.clear();
  }
}
