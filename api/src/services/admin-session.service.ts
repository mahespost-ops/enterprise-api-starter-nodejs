/**
 * Admin Session Service
 * Business logic for admin session management operations
 *
 * Separation of concerns:
 * - Admin-specific session operations separated from tenant-scoped session service
 * - All database queries delegated to model static methods (no Op imports)
 */

import { UserSession } from '../models/UserSession.model';
import { User } from '../models/User.model';
import { NotFoundError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import { SESSION_SORTABLE_FIELDS, SESSION_SEARCHABLE_FIELDS } from '../constants/session.constants';
import logger from '../config/logger';

/**
 * Filter options for listing sessions
 */
export interface ListSessionsFilters {
  userId?: string;
  deviceId?: string;
  isActive?: boolean;
  isRevoked?: boolean;
  createdAt?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
    eq?: Date;
    ne?: Date;
  };
  lastAccessedAt?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
    eq?: Date;
    ne?: Date;
  };
  expiresAt?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
    eq?: Date;
    ne?: Date;
  };
}

/**
 * Pagination and query options for list
 */
export interface ListSessionsOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListSessionsFilters;
}

class AdminSessionService {
  /**
   * List all sessions with filters, pagination, sorting, and search
   * Delegates all database logic to UserSession model static method
   * @param options - Query options
   * @returns Paginated session list
   */
  async listSessions(options: ListSessionsOptions): Promise<{ sessions: UserSession[]; total: number }> {
    logger.debug('Admin: Listing sessions', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: sessions, count: total } = await UserSession.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: SESSION_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: Object.values(SESSION_SORTABLE_FIELDS) as string[],
      fields,
    });

    logger.debug('Admin: Sessions retrieved', { count: sessions.length, total });

    return { sessions, total };
  }

  /**
   * Get session by ID
   * @param sessionId - Session ID
   * @returns Session
   * @throws NotFoundError if session not found
   */
  async getSessionById(sessionId: string): Promise<UserSession> {
    logger.debug('Admin: Getting session', { sessionId });

    const session = await UserSession.findByPk(sessionId);

    if (!session) {
      throw new NotFoundError(ERROR_MESSAGES.SESSION_NOT_FOUND);
    }

    return session;
  }

  /**
   * Revoke session (admin action)
   * @param sessionId - Session ID
   * @throws NotFoundError if session not found
   */
  async revokeSession(sessionId: string): Promise<void> {
    logger.debug('Admin: Revoking session', { sessionId });

    const session = await this.getSessionById(sessionId);

    await session.revoke(undefined, 'Admin revoked');

    logger.info('Admin: Session revoked', { sessionId });
  }

  /**
   * Revoke all sessions for a user (admin action)
   * @param userId - User ID
   * @returns Count of revoked sessions
   * @throws NotFoundError if user not found
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    logger.debug('Admin: Revoking all sessions for user', { userId });

    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Find all active sessions for user
    const activeSessions = await UserSession.findActiveByUserId(userId);

    // Revoke each session
    for (const session of activeSessions) {
      await session.revoke(undefined, 'Admin revoked all user sessions');
    }

    logger.info('Admin: All user sessions revoked', { userId, count: activeSessions.length });

    return activeSessions.length;
  }
}

export default new AdminSessionService();
