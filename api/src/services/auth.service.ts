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
import { SUCCESS_MESSAGES } from '../constants/messages.constants';
import { EMAIL_SUBJECTS } from '../constants/email.constants';
import { TRUST_STATUS, DEVICE_DEFAULTS, DEVICE_NAMES } from '../constants/device.constants';
import { NETWORK_DEFAULTS, DEFAULT_CONTEXT } from '../constants/network.constants';
import { CRYPTO_DEFAULTS, MAGIC_CODE } from '../constants/crypto.constants';
import { TOKEN_PREFIX } from '../constants/http.constants';
import { User } from '../models/User.model';
import { MagicLinkToken } from '../models/MagicLinkToken.model';
import { UserSession } from '../models/UserSession.model';
import { Device } from '../models/Device.model';
import { Organization } from '../models/Organization.model';
import { OrganizationMember } from '../models/OrganizationMember.model';
import { Environment } from '../models/Environment.model';
import { DELIVERY_METHOD, IDENTIFIER_REGEX, TOKEN_EXPIRATION, TOKEN_EXPIRATION_MS, JWT_EXPIRATION, type DeliveryMethod } from '../constants/auth.constants';
import { AdapterFactory } from './adapter.factory';

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
    expiresAt: Date;
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

    const existingUser = await User.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError(ERROR_MESSAGES.USER_EXISTS);
    }

    const user = await User.create({
      email: data.email,
      phoneNumber: data.phone,
      givenName: data.firstName,
      familyName: data.lastName,
      preferredAuthMethod: data.preferredAuthMethod || DELIVERY_METHOD.EMAIL,
      zoneinfo: data.timezone,
      emailVerified: false,
    });

    const { token, code } = await this.generateMagicToken(user.id, data.fingerprint);

    const deliveryMethod: DeliveryMethod = data.preferredAuthMethod || DELIVERY_METHOD.EMAIL;
    const contactToMask = deliveryMethod === DELIVERY_METHOD.EMAIL ? data.email : (data.phone || data.email);
    const sentTo = this.maskContact(contactToMask, deliveryMethod);

    // Send magic token via email/SMS adapter
    if (deliveryMethod === DELIVERY_METHOD.EMAIL) {
      const emailAdapter = AdapterFactory.getInstance().getEmailAdapter();
      await emailAdapter.sendEmail({
        to: data.email,
        from: config.email.from,
        subject: EMAIL_SUBJECTS.MAGIC_LINK,
        body: `Welcome! Use this link to sign in: ${config.app.url}/auth/verify?token=${token}\n\nOr enter this code: ${code}\n\nThis link expires in ${TOKEN_EXPIRATION.MAGIC_TOKEN / 60} minutes.`,
        html: `
          <p>Welcome! Click the link below to sign in:</p>
          <p><a href="${config.app.url}/auth/verify?token=${token}">Sign In</a></p>
          <p>Or enter this code: <strong>${code}</strong></p>
          <p>This link expires in ${TOKEN_EXPIRATION.MAGIC_TOKEN / 60} minutes.</p>
        `,
      });
    }
    // TODO: Implement SMS delivery

    logger.info(`Magic token sent via ${deliveryMethod} to ${sentTo}`);

    return {
      message: SUCCESS_MESSAGES.MAGIC_TOKEN_SENT,
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
    const user = await User.findByIdentifier(data.identifier);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const { token, code } = await this.generateMagicToken(user.id, data.fingerprint);

    // Determine delivery method based on identifier type
    const isPhone = IDENTIFIER_REGEX.PHONE_E164.test(data.identifier);
    const deliveryMethod: DeliveryMethod = isPhone ? DELIVERY_METHOD.SMS : (user.preferredAuthMethod || DELIVERY_METHOD.EMAIL);
    const contactToMask = isPhone ? data.identifier : user.email;
    const sentTo = this.maskContact(contactToMask, deliveryMethod);

    // Send magic token via email/SMS adapter
    if (deliveryMethod === DELIVERY_METHOD.EMAIL) {
      const emailAdapter = AdapterFactory.getInstance().getEmailAdapter();
      await emailAdapter.sendEmail({
        to: user.email,
        from: config.email.from,
        subject: EMAIL_SUBJECTS.MAGIC_LINK,
        body: `Use this link to sign in: ${config.app.url}/auth/verify?token=${token}\n\nOr enter this code: ${code}\n\nThis link expires in ${TOKEN_EXPIRATION.MAGIC_TOKEN / 60} minutes.`,
        html: `
          <p>Click the link below to sign in:</p>
          <p><a href="${config.app.url}/auth/verify?token=${token}">Sign In</a></p>
          <p>Or enter this code: <strong>${code}</strong></p>
          <p>This link expires in ${TOKEN_EXPIRATION.MAGIC_TOKEN / 60} minutes.</p>
        `,
      });
    }
    // TODO: Implement SMS delivery

    logger.info(`Magic token sent via ${deliveryMethod} to ${sentTo}`);

    return {
      message: SUCCESS_MESSAGES.MAGIC_TOKEN_SENT,
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

    // Find all unexpired, unused tokens and compare
    const allTokens = await MagicLinkToken.findAllValidTokens();

    let magicToken: MagicLinkToken | null = null;
    for (const token of allTokens) {
      let isMatch = false;
      if (data.token) {
        isMatch = await bcrypt.compare(tokenKey, token.tokenHash);
      } else if (data.code) {
        isMatch = await bcrypt.compare(tokenKey, token.codeHash);
      }

      if (isMatch) {
        magicToken = token;
        break;
      }
    }

    if (!magicToken) {
      throw new UnauthorizedError(ERROR_MESSAGES.INVALID_MAGIC_TOKEN);
    }

    await magicToken.markAsUsed();

    const user = await User.findByPk(magicToken.userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Create or find device
    const deviceId = crypto.randomUUID();
    const deviceName = this.extractDeviceName(data.userAgent);

    // Create Device record
    await Device.create({
      id: deviceId,
      userId: user.id,
      fingerprintHash: data.fingerprint ? await bcrypt.hash(data.fingerprint, 10) : await bcrypt.hash(deviceId, 10),
      deviceName: deviceName,
      deviceType: DEVICE_DEFAULTS.UNKNOWN_TYPE, // TODO: Parse from user agent
      os: DEVICE_DEFAULTS.UNKNOWN_OS, // TODO: Parse from user agent
      browser: DEVICE_DEFAULTS.UNKNOWN_BROWSER, // TODO: Parse from user agent
      trustStatus: TRUST_STATUS.TRUSTED,
      firstSeenIp: NETWORK_DEFAULTS.LOCALHOST_IP, // TODO: Get from request context
      lastSeenIp: NETWORK_DEFAULTS.LOCALHOST_IP, // TODO: Get from request context
      createdAt: new Date(),
      lastUsedAt: new Date(),
    });

    const device = {
      id: deviceId,
      name: deviceName,
      isNew: true, // TODO: Check against existing devices
    };

    const sessionId = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(CRYPTO_DEFAULTS.REFRESH_TOKEN_BYTES).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await UserSession.create({
      id: sessionId,
      userId: user.id,
      deviceId,
      refreshTokenHash,
      ipAddress: NETWORK_DEFAULTS.LOCALHOST_IP, // TODO: Get from request context
      expiresAt: new Date(Date.now() + TOKEN_EXPIRATION_MS.REFRESH_TOKEN),
      createdAt: new Date(),
      isActive: true,
    });

    const accessToken = this.generateAccessToken({
      sub: user.id,
      orgId: DEFAULT_CONTEXT.ORG_ID, // TODO: Get from user's last_org_id
      envId: DEFAULT_CONTEXT.ENV_ID, // TODO: Get from user's last_env_id
      user: {
        fullName: user.fullName,
        email: user.email,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_EXPIRATION.ACCESS_TOKEN,
      refreshExpiresIn: TOKEN_EXPIRATION.REFRESH_TOKEN,
      tokenType: TOKEN_PREFIX.BEARER.trim(),
      user,
      device,
      session: {
        id: sessionId,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRATION_MS.REFRESH_TOKEN),
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
    const sessions = await UserSession.findAll();
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

    const user = await User.findByPk(matchedSession.userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Token rotation for security
    const newRefreshToken = crypto.randomBytes(CRYPTO_DEFAULTS.REFRESH_TOKEN_BYTES).toString('hex');
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await matchedSession.update({
      refreshTokenHash: newRefreshTokenHash,
      lastAccessedAt: new Date(),
    });

    const accessToken = this.generateAccessToken({
      sub: user.id,
      orgId: DEFAULT_CONTEXT.ORG_ID,
      envId: DEFAULT_CONTEXT.ENV_ID,
      user: {
        fullName: user.fullName,
        email: user.email,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: TOKEN_EXPIRATION.ACCESS_TOKEN,
      refreshExpiresIn: TOKEN_EXPIRATION.REFRESH_TOKEN,
      tokenType: TOKEN_PREFIX.BEARER.trim(),
    };
  }

  /**
   * Logout user and invalidate session
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    logger.info(`Logging out user: ${userId}`);

    if (refreshToken) {
      const sessions = await UserSession.findAll({ where: { userId } });

      for (const session of sessions) {
        const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
        if (isMatch) {
          await session.revoke();
          logger.info(`Session ${session.id} revoked`);
          return;
        }
      }
    } else {
      // Revoke all sessions for user
      const sessions = await UserSession.findAll({ where: { userId } });
      for (const session of sessions) {
        await session.revoke();
      }
      logger.info(`All sessions revoked for user ${userId}`);
    }
  }

  /**
   * Switch organization/environment context
   */
  async switchContext(data: SwitchContextData): Promise<SwitchContextResponse> {
    logger.info(`Switching context for user ${data.userId} to org ${data.organizationId}, env ${data.environmentId}`);

    const user = await User.findByPk(data.userId);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if organization exists first (return 404 if not)
    const org = await Organization.findByPk(data.organizationId);
    if (!org) {
      throw new NotFoundError(ERROR_MESSAGES.ORGANIZATION_NOT_FOUND);
    }

    // Check if environment exists and belongs to the organization (return 404 if not)
    const env = await Environment.findOne({
      where: { id: data.environmentId, organizationId: data.organizationId },
    });
    if (!env) {
      throw new NotFoundError(ERROR_MESSAGES.ENVIRONMENT_NOT_FOUND);
    }

    // Check if user has access to organization (return 403 if not)
    const orgMember = await OrganizationMember.findOne({
      where: { userId: data.userId, organizationId: data.organizationId },
    });
    if (!orgMember) {
      throw new ForbiddenError(ERROR_MESSAGES.NOT_ORGANIZATION_MEMBER);
    }

    // Update user's last_org_id and last_env_id
    await user.update({
      lastOrgId: data.organizationId,
      lastEnvId: data.environmentId,
    });

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
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      environment: {
        id: env.id,
        name: env.name,
        type: env.type,
      },
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async generateMagicToken(userId: string, fingerprint?: string): Promise<{ token: string; code: string }> {
    const token = crypto.randomBytes(CRYPTO_DEFAULTS.MAGIC_TOKEN_BYTES).toString('base64url');
    const code = Math.floor(MAGIC_CODE.MIN + Math.random() * MAGIC_CODE.RANGE).toString();

    // Hash both token and code before storing
    const tokenHash = await bcrypt.hash(token, 10);
    const codeHash = await bcrypt.hash(code, 10);

    await MagicLinkToken.create({
      userId,
      tokenHash,
      codeHash,
      fingerprint,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + TOKEN_EXPIRATION_MS.MAGIC_TOKEN),
    });

    return { token, code };
  }

  private generateAccessToken(payload: Record<string, unknown>): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: JWT_EXPIRATION.ACCESS_TOKEN,
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
    if (!userAgent) return DEVICE_DEFAULTS.UNKNOWN_NAME;

    if (userAgent.includes('iPhone')) return DEVICE_NAMES.IPHONE;
    if (userAgent.includes('iPad')) return DEVICE_NAMES.IPAD;
    if (userAgent.includes('Android')) return DEVICE_NAMES.ANDROID;
    if (userAgent.includes('Macintosh')) return DEVICE_NAMES.MAC;
    if (userAgent.includes('Windows')) return DEVICE_NAMES.WINDOWS;
    if (userAgent.includes('Linux')) return DEVICE_NAMES.LINUX;

    return DEVICE_DEFAULTS.UNKNOWN_NAME;
  }
}

export const authService = new AuthService();
export default authService;
