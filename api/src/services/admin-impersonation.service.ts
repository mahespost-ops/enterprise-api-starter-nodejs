/**
 * Admin Impersonation Service
 * Business logic for admin-level impersonation management
 *
 * Separation of concerns:
 * - Admin endpoints separated from tenant-scoped impersonation
 * - System-wide impersonation control (any user, any org)
 * - All database queries delegated to model static methods (no Op imports)
 */

import { UserImpersonationSession } from '../models/UserImpersonationSession.model';
import { User } from '../models/User.model';
import impersonationService from './impersonation.service';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import {
  IMPERSONATION_SORTABLE_FIELDS,
  IMPERSONATION_SEARCHABLE_FIELDS,
} from '../constants/impersonation.constants';
import logger from '../config/logger';

/**
 * Filter options for listing impersonation sessions
 */
export interface ListImpersonationSessionsFilters {
  originalUserId?: string;
  impersonatedUserId?: string;
  environmentId?: string;
  impersonationType?: 'system' | 'organization';
  isActive?: boolean;
  startedAt?: {
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
  endedAt?: {
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
export interface ListImpersonationSessionsOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListImpersonationSessionsFilters;
}

/**
 * Start impersonation DTO
 */
export interface StartImpersonationDto {
  userId: string;
  reason: string;
  expiresInMinutes?: number;
}

/**
 * Active session response
 */
export interface ActiveSessionResponse {
  sessionId: string;
  originalUser: {
    id: string;
    email: string | null;
    fullName: string;
  };
  impersonatedUser: {
    id: string;
    email: string | null;
    fullName: string;
  };
  impersonationType: 'system' | 'organization';
  startedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

class AdminImpersonationService {
  /**
   * Start system-wide impersonation (admin action)
   * Delegates to core impersonation service
   * @param adminUserId - ID of admin user starting impersonation
   * @param dto - Impersonation details
   * @param ipAddress - Request IP address
   * @param userAgent - Request user agent
   * @returns Impersonation result with JWT
   */
  async startImpersonation(
    adminUserId: string,
    dto: StartImpersonationDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    sessionId: string;
    accessToken: string;
    expiresAt: Date;
    impersonatedUser: {
      id: string;
      email: string | null;
      fullName: string;
    };
  }> {
    logger.info('Admin: Starting impersonation', {
      adminUserId,
      targetUserId: dto.userId,
      reason: dto.reason,
    });

    // Get admin user to determine context
    const adminUser = await User.findByPk(adminUserId);
    if (!adminUser) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Delegate to core impersonation service
    const result = await impersonationService.startSystemImpersonation({
      originalUserId: adminUserId,
      impersonatedUserId: dto.userId,
      impersonationType: 'system',
      reason: dto.reason,
      expiresInMinutes: dto.expiresInMinutes,
      environmentId: adminUser.lastEnvId || '', // Use admin's context as fallback
      ipAddress,
      userAgent,
    });

    logger.info('Admin: Impersonation started', {
      sessionId: result.sessionId,
      adminUserId,
      targetUserId: dto.userId,
    });

    return result;
  }

  /**
   * End impersonation session (from impersonation context)
   * Extracts session info from JWT impersonation context
   * @param impersonationContext - Impersonation context from JWT
   * @returns Original user JWT
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async endImpersonation(impersonationContext: any): Promise<{
    accessToken: string;
    originalUser: {
      id: string;
      email: string | null;
      fullName: string;
    };
  }> {
    if (!impersonationContext?.impersonationChain?.[0]?.sessionId) {
      throw new BadRequestError(ERROR_MESSAGES.NOT_CURRENTLY_IMPERSONATING);
    }

    const sessionId = impersonationContext.impersonationChain[0].sessionId;
    const originalUserId = impersonationContext.originalUserId;

    logger.info('Admin: Ending impersonation', { sessionId, originalUserId });

    // Delegate to core impersonation service
    const result = await impersonationService.endImpersonation(sessionId, originalUserId);

    logger.info('Admin: Impersonation ended', { sessionId, originalUserId });

    return result;
  }

  /**
   * Get active impersonation sessions (all users)
   * @returns Array of active sessions
   */
  async getActiveSessions(): Promise<ActiveSessionResponse[]> {
    logger.debug('Admin: Getting active impersonation sessions');

    const sessions = await UserImpersonationSession.findAll({
      where: {
        isActive: true,
      },
      order: [['startedAt', 'DESC']],
    });

    // Fetch user details for each session
    const sessionsWithUsers = await Promise.all(
      sessions.map(async (session) => {
        const [originalUser, impersonatedUser] = await Promise.all([
          User.findByPk(session.originalUserId),
          User.findByPk(session.impersonatedUserId),
        ]);

        return {
          sessionId: session.id,
          originalUser: {
            id: session.originalUserId,
            email: originalUser?.email || null,
            fullName: originalUser
              ? `${originalUser.givenName} ${originalUser.familyName}`
              : 'Unknown User',
          },
          impersonatedUser: {
            id: session.impersonatedUserId,
            email: impersonatedUser?.email || null,
            fullName: impersonatedUser
              ? `${impersonatedUser.givenName} ${impersonatedUser.familyName}`
              : 'Unknown User',
          },
          impersonationType: session.impersonationType,
          startedAt: session.startedAt,
          expiresAt: session.expiresAt,
          isActive: session.isActive,
        };
      })
    );

    logger.debug('Admin: Active sessions retrieved', { count: sessionsWithUsers.length });

    return sessionsWithUsers;
  }

  /**
   * List all impersonation sessions with filters, pagination, sorting, and search
   * @param options - Query options
   * @returns Paginated impersonation session list
   */
  async listSessions(
    options: ListImpersonationSessionsOptions
  ): Promise<{ sessions: UserImpersonationSession[]; total: number }> {
    logger.debug('Admin: Listing impersonation sessions', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: sessions, count: total } = await UserImpersonationSession.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: IMPERSONATION_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: Object.values(IMPERSONATION_SORTABLE_FIELDS) as string[],
      fields,
    });

    logger.debug('Admin: Impersonation sessions retrieved', { count: sessions.length, total });

    return { sessions, total };
  }

  /**
   * Force-end impersonation session (admin action)
   * @param sessionId - Session ID to end
   * @throws NotFoundError if session not found
   */
  async forceEndSession(sessionId: string): Promise<void> {
    logger.info('Admin: Force-ending impersonation session', { sessionId });

    const session = await UserImpersonationSession.findByPk(sessionId);

    if (!session) {
      throw new NotFoundError(ERROR_MESSAGES.IMPERSONATION_SESSION_NOT_FOUND);
    }

    await session.end();

    logger.info('Admin: Impersonation session force-ended', { sessionId });
  }
}

export default new AdminImpersonationService();
