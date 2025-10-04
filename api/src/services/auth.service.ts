/**
 * Authentication Service
 * Business logic for passwordless authentication using magic tokens
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config';
import logger from '../config/logger';
import { NotFoundError, UnauthorizedError, ConflictError, ForbiddenError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import { UserModel, type User } from '../models/User.model';
import { MagicTokenModel } from '../models/MagicToken.model';
import { SessionModel } from '../models/Session.model';
import { OrganizationModel } from '../models/Organization.model';
import { EnvironmentModel } from '../models/Environment.model';
import { DELIVERY_METHOD, IDENTIFIER_REGEX, TOKEN_EXPIRATION, type DeliveryMethod } from '../constants/auth.constants';

// Types
interface RegisterData {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  preferredAuthMethod?: 'email' | 'sms';
  timezone?: string;
  fingerprint: string;
}

interface RequestTokenData {
  identifier: string; // Polymorphic: email or E.164 phone number
  fingerprint: string;
}

interface VerifyTokenData {
  token?: string;
  code?: string;
  fingerprint: string;
  userAgent?: string;
}

interface SwitchContextData {
  userId: string;
  organizationId: string;
  environmentId: string;
  fingerprint: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenType: string;
  user: User;
  device: {
    id: string;
    name: string;
    isNew: boolean;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenType: string;
}

interface SwitchContextResponse {
  accessToken: string;
  organization: {
    id: string;
    name: string;
    slug?: string;
  };
  environment: {
    id: string;
    name: string;
    type: 'live' | 'sandbox';
  };
}

/**
 * AuthService class
 */
class AuthService {
  /**
   * Register a new user and send magic token
   */
  async register(data: RegisterData): Promise<{ message: string; deliveryMethod: string; sentTo: string; expiresIn: number }> {
    logger.info(`Registering user: ${data.email}`);

    const existingUser = await UserModel.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError(ERROR_MESSAGES.USER_EXISTS);
    }

    const user = await UserModel.create({
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      preferredAuthMethod: data.preferredAuthMethod || DELIVERY_METHOD.EMAIL,
      timezone: data.timezone,
      emailVerified: false,
    });

    await this.generateMagicToken(user.id, data.fingerprint);

    const deliveryMethod: DeliveryMethod = data.preferredAuthMethod || DELIVERY_METHOD.EMAIL;
    const contactToMask = deliveryMethod === DELIVERY_METHOD.EMAIL ? data.email : (data.phone || data.email);
    const sentTo = this.maskContact(contactToMask, deliveryMethod);

    // TODO: Send via email/SMS adapter
    logger.info(`Magic token would be sent via ${deliveryMethod} to ${sentTo}`);

    return {
      message: 'Magic token sent successfully',
      deliveryMethod,
      sentTo,
      expiresIn: TOKEN_EXPIRATION.MAGIC_TOKEN,
    };
  }

  /**
   * Request a magic token for existing user
   */
  async requestMagicToken(data: RequestTokenData): Promise<{ message: string; deliveryMethod: DeliveryMethod; sentTo: string; expiresIn: number }> {
    logger.info(`Requesting magic token for identifier: ${this.maskContact(data.identifier)}`);

    // Find user by polymorphic identifier (email or phone)
    const user = await UserModel.findByIdentifier(data.identifier);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    await this.generateMagicToken(user.id, data.fingerprint);

    // Determine delivery method based on identifier type
    const isPhone = IDENTIFIER_REGEX.PHONE_E164.test(data.identifier);
    const deliveryMethod: DeliveryMethod = isPhone ? DELIVERY_METHOD.SMS : (user.preferredAuthMethod || DELIVERY_METHOD.EMAIL);
    const contactToMask = isPhone ? data.identifier : user.email;
    const sentTo = this.maskContact(contactToMask, deliveryMethod);

    // TODO: Send via email/SMS adapter
    logger.info(`Magic token would be sent via ${deliveryMethod} to ${sentTo}`);

    return {
      message: 'Magic token sent successfully',
      deliveryMethod,
      sentTo,
      expiresIn: TOKEN_EXPIRATION.MAGIC_TOKEN,
    };
  }

  /**
   * Verify magic token and return JWT tokens
   */
  async verifyMagicToken(data: VerifyTokenData): Promise<AuthResponse> {
    logger.info('Verifying magic token');

    const tokenKey = data.token || data.code;
    if (!tokenKey) {
      throw new UnauthorizedError(ERROR_MESSAGES.INVALID_MAGIC_TOKEN);
    }

    const magicToken = await MagicTokenModel.findByToken(tokenKey);
    if (!magicToken) {
      throw new UnauthorizedError(ERROR_MESSAGES.INVALID_MAGIC_TOKEN);
    }

    if (new Date() > new Date(magicToken.expiresAt)) {
      await MagicTokenModel.delete(tokenKey);
      throw new UnauthorizedError(ERROR_MESSAGES.TOKEN_EXPIRED);
    }

    if (magicToken.usedAt) {
      throw new UnauthorizedError(ERROR_MESSAGES.TOKEN_ALREADY_USED);
    }

    await MagicTokenModel.markAsUsed(tokenKey);

    const user = await UserModel.findById(magicToken.userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Create device and session
    const deviceId = crypto.randomUUID();
    const device = {
      id: deviceId,
      name: this.extractDeviceName(data.userAgent),
      isNew: true, // TODO: Check against existing devices
    };

    const sessionId = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await SessionModel.create({
      id: sessionId,
      userId: user.id,
      deviceId,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      isActive: true,
    });

    const accessToken = this.generateAccessToken({
      sub: user.id,
      orgId: 'default-org-id', // TODO: Get from user's last_org_id
      envId: 'default-env-id', // TODO: Get from user's last_env_id
      user: {
        fullName: user.fullName,
        email: user.email,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      refreshExpiresIn: 2592000,
      tokenType: 'Bearer',
      user,
      device,
      session: {
        id: sessionId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
    logger.info('Refreshing access token');

    if (!refreshToken) {
      throw new UnauthorizedError(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    // Find session with matching refresh token
    // Must check all sessions since refresh token is hashed
    const sessions = await SessionModel.findAll();
    let matchedSession = null;

    for (const session of sessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (isMatch && session.isActive) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedError(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    if (!matchedSession.isActive) {
      throw new UnauthorizedError(ERROR_MESSAGES.SESSION_REVOKED);
    }

    if (new Date() > new Date(matchedSession.expiresAt)) {
      throw new UnauthorizedError(ERROR_MESSAGES.SESSION_EXPIRED);
    }

    const user = await UserModel.findById(matchedSession.userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Token rotation for security
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await SessionModel.update(matchedSession.id, {
      refreshTokenHash: newRefreshTokenHash,
      lastAccessedAt: new Date().toISOString(),
    });

    const accessToken = this.generateAccessToken({
      sub: user.id,
      orgId: 'default-org-id',
      envId: 'default-env-id',
      user: {
        fullName: user.fullName,
        email: user.email,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
      refreshExpiresIn: 2592000,
      tokenType: 'Bearer',
    };
  }

  /**
   * Logout user and invalidate session
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    logger.info(`Logging out user: ${userId}`);

    if (refreshToken) {
      const sessions = await SessionModel.findByUserId(userId);

      for (const session of sessions) {
        const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
        if (isMatch) {
          await SessionModel.revoke(session.id);
          logger.info(`Session ${session.id} revoked`);
          return;
        }
      }
    } else {
      await SessionModel.revokeAllForUser(userId);
      logger.info(`All sessions revoked for user ${userId}`);
    }
  }

  /**
   * Switch organization/environment context
   */
  async switchContext(data: SwitchContextData): Promise<SwitchContextResponse> {
    logger.info(`Switching context for user ${data.userId} to org ${data.organizationId}, env ${data.environmentId}`);

    const user = await UserModel.findById(data.userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if user has access to organization
    const hasAccess = await OrganizationModel.userHasAccess(data.userId, data.organizationId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this organization');
    }

    // Check if organization exists
    const orgExists = await OrganizationModel.exists(data.organizationId);
    if (!orgExists) {
      throw new NotFoundError('Organization not found');
    }

    // Check if environment exists
    const envExists = await EnvironmentModel.exists(data.environmentId);
    if (!envExists) {
      throw new NotFoundError('Environment not found');
    }

    // TODO: Update user's last_org_id and last_env_id in database

    const accessToken = this.generateAccessToken({
      sub: user.id,
      orgId: data.organizationId,
      envId: data.environmentId,
      user: {
        fullName: user.fullName,
        email: user.email,
      },
    });

    return {
      accessToken,
      organization: {
        id: data.organizationId,
        name: 'Test Organization', // TODO: Get from database
        slug: 'test-org',
      },
      environment: {
        id: data.environmentId,
        name: 'Live', // TODO: Get from database
        type: 'live',
      },
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async generateMagicToken(userId: string, fingerprint?: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url');
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await MagicTokenModel.create({
      userId,
      token,
      code,
      fingerprint,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    return token;
  }

  private generateAccessToken(payload: Record<string, any>): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: '15m',
      issuer: config.app.name,
    });
  }

  private maskContact(contact: string, deliveryMethod?: DeliveryMethod): string {
    // Auto-detect if not provided
    const isEmail = deliveryMethod ? deliveryMethod === DELIVERY_METHOD.EMAIL : contact.includes('@');

    if (isEmail) {
      const [local, domain] = contact.split('@');
      return `${local[0]}***@${domain}`;
    }
    // Phone number masking (E.164 format)
    return `+***${contact.slice(-4)}`;
  }

  private extractDeviceName(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device';

    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Linux')) return 'Linux PC';

    return 'Unknown Device';
  }
}

export const authService = new AuthService();
export default authService;
