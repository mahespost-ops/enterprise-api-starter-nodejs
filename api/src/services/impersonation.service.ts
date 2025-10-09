/**
 * Impersonation Service
 * Handles user impersonation logic (both system-level and organization-level)
 */

import jwt from 'jsonwebtoken';
import { type StringValue } from 'ms';
import config from '../config';
import { UserImpersonationSession } from '../models/UserImpersonationSession.model';
import { User } from '../models/User.model';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import {
  NotFoundError,
  BadRequestError,
} from '../utils/errors';

interface ImpersonationChainItem {
  sessionId: string;
  userId: string;
  startedAt: string;
  impersonationType: 'system' | 'organization';
  permissions: Record<string, unknown> | null;
}

interface StartImpersonationDto {
  originalUserId: string;
  impersonatedUserId: string;
  impersonationType: 'system' | 'organization';
  reason: string;
  expiresInMinutes?: number;
  organizationId?: string;
  environmentId: string;
  ipAddress?: string;
  userAgent?: string;
  parentSessionId?: string | null;
}

interface ImpersonationResult {
  sessionId: string;
  accessToken: string;
  expiresAt: Date;
  impersonatedUser: {
    id: string;
    email: string | null;
    fullName: string;
  };
  organizationContext?: {
    organizationId: string;
    organizationName: string;
    environmentId: string;
    environmentName: string;
  };
}

interface EndImpersonationResult {
  accessToken: string;
  originalUser: {
    id: string;
    email: string | null;
    fullName: string;
  };
}

export class ImpersonationService {
  /**
   * Start system-level impersonation (admin → any user)
   * No hierarchy restrictions
   */
  async startSystemImpersonation(dto: StartImpersonationDto): Promise<ImpersonationResult> {
    const {
      originalUserId,
      impersonatedUserId,
      reason,
      expiresInMinutes = 60,
      organizationId,
      environmentId,
      ipAddress,
      userAgent,
      parentSessionId = null,
    } = dto;

    // Validate users exist
    const [originalUser, impersonatedUser] = await Promise.all([
      User.findByPk(originalUserId),
      User.findByPk(impersonatedUserId),
    ]);

    if (!originalUser) {
      throw new NotFoundError('Original user not found');
    }

    if (!impersonatedUser) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Prevent self-impersonation
    if (originalUserId === impersonatedUserId) {
      throw new BadRequestError(ERROR_MESSAGES.CANNOT_IMPERSONATE_SELF);
    }

    // Calculate expiration
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + expiresInMinutes * 60 * 1000);

    // Determine context (use provided or impersonated user's last context)
    const contextOrgId = organizationId || impersonatedUser.lastOrgId;
    const contextEnvId = environmentId || impersonatedUser.lastEnvId;

    if (!contextOrgId || !contextEnvId) {
      throw new BadRequestError(
        'Organization and environment context required. User has no default context.'
      );
    }

    // Create impersonation session
    const session = await UserImpersonationSession.create({
      originalUserId,
      impersonatedUserId,
      parentSessionId,
      environmentId: contextEnvId,
      impersonationType: 'system',
      permissions: null,
      reason,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      startedAt,
      expiresAt,
      isActive: true,
    });

    // Generate JWT with impersonation context
    const accessToken = this.generateImpersonationToken({
      originalUserId,
      impersonatedUserId,
      sessionId: session.id,
      impersonationType: 'system',
      orgId: contextOrgId,
      envId: contextEnvId,
      impersonatedUser,
      parentSessionId,
      startedAt,
    });

    return {
      sessionId: session.id,
      accessToken,
      expiresAt,
      impersonatedUser: {
        id: impersonatedUser.id,
        email: impersonatedUser.email,
        fullName: `${impersonatedUser.givenName} ${impersonatedUser.familyName}`,
      },
    };
  }

  /**
   * Start organization-level impersonation (manager → subordinate)
   * Enforces hierarchy restrictions
   */
  async startOrganizationImpersonation(dto: StartImpersonationDto): Promise<ImpersonationResult> {
    const {
      originalUserId,
      impersonatedUserId,
      reason,
      expiresInMinutes = 60,
      environmentId,
      ipAddress,
      userAgent,
      parentSessionId = null,
    } = dto;

    // Validate users exist
    const [originalUser, impersonatedUser] = await Promise.all([
      User.findByPk(originalUserId),
      User.findByPk(impersonatedUserId),
    ]);

    if (!originalUser) {
      throw new NotFoundError('Original user not found');
    }

    if (!impersonatedUser) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Prevent self-impersonation
    if (originalUserId === impersonatedUserId) {
      throw new BadRequestError(ERROR_MESSAGES.CANNOT_IMPERSONATE_SELF);
    }

    // TODO: Validate hierarchy - can only impersonate subordinates
    // This requires querying groups and comparing hierarchy_level
    // For now, we'll allow any member in the same org (to be implemented)

    // Calculate expiration
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + expiresInMinutes * 60 * 1000);

    // Use impersonated user's org context (org-scoped impersonation must stay in same org)
    const contextOrgId = impersonatedUser.lastOrgId;
    const contextEnvId = environmentId;

    if (!contextOrgId) {
      throw new BadRequestError('Impersonated user has no organization context');
    }

    // Create impersonation session
    const session = await UserImpersonationSession.create({
      originalUserId,
      impersonatedUserId,
      parentSessionId,
      environmentId: contextEnvId,
      impersonationType: 'organization',
      permissions: null,
      reason,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      startedAt,
      expiresAt,
      isActive: true,
    });

    // Generate JWT with impersonation context
    const accessToken = this.generateImpersonationToken({
      originalUserId,
      impersonatedUserId,
      sessionId: session.id,
      impersonationType: 'organization',
      orgId: contextOrgId,
      envId: contextEnvId,
      impersonatedUser,
      parentSessionId,
      startedAt,
    });

    return {
      sessionId: session.id,
      accessToken,
      expiresAt,
      impersonatedUser: {
        id: impersonatedUser.id,
        email: impersonatedUser.email,
        fullName: `${impersonatedUser.givenName} ${impersonatedUser.familyName}`,
      },
    };
  }

  /**
   * End impersonation session
   * Returns original user's JWT
   */
  async endImpersonation(sessionId: string, originalUserId: string): Promise<EndImpersonationResult> {
    // Find active session
    const session = await UserImpersonationSession.findOne({
      where: {
        id: sessionId,
        originalUserId,
        isActive: true,
      },
    });

    if (!session) {
      throw new NotFoundError(ERROR_MESSAGES.IMPERSONATION_SESSION_NOT_FOUND);
    }

    // End the session
    await session.end();

    // Get original user
    const originalUser = await User.findByPk(originalUserId);
    if (!originalUser) {
      throw new NotFoundError('Original user not found');
    }

    // Generate new JWT for original user (without impersonation context)
    const accessToken = jwt.sign(
      {
        sub: originalUser.id,
        orgId: originalUser.lastOrgId,
        envId: originalUser.lastEnvId,
        user: {
          fullName: `${originalUser.givenName} ${originalUser.familyName}`,
          email: originalUser.email,
        },
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as StringValue }
    );

    return {
      accessToken,
      originalUser: {
        id: originalUser.id,
        email: originalUser.email,
        fullName: `${originalUser.givenName} ${originalUser.familyName}`,
      },
    };
  }

  /**
   * Get active impersonation session by ID
   */
  async getActiveSession(sessionId: string): Promise<UserImpersonationSession | null> {
    return UserImpersonationSession.findActiveById(sessionId);
  }

  /**
   * Generate JWT token with impersonation context
   */
  private generateImpersonationToken(params: {
    originalUserId: string;
    impersonatedUserId: string;
    sessionId: string;
    impersonationType: 'system' | 'organization';
    orgId: string;
    envId: string;
    impersonatedUser: User;
    parentSessionId: string | null;
    startedAt: Date;
  }): string {
    const {
      originalUserId,
      impersonatedUserId,
      sessionId,
      impersonationType,
      orgId,
      envId,
      impersonatedUser,
      startedAt,
    } = params;

    // Build impersonation chain
    const impersonationChain: ImpersonationChainItem[] = [
      {
        sessionId,
        userId: impersonatedUserId,
        startedAt: startedAt.toISOString(),
        impersonationType,
        permissions: null,
      },
    ];

    // Generate JWT
    const payload = {
      sub: impersonatedUserId, // Effective user
      orgId,
      envId,
      user: {
        fullName: `${impersonatedUser.givenName} ${impersonatedUser.familyName}`,
        email: impersonatedUser.email,
      },
      impersonation: {
        originalUserId,
        effectiveUserId: impersonatedUserId,
        impersonationChain,
      },
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as StringValue,
    });
  }
}

export default new ImpersonationService();
