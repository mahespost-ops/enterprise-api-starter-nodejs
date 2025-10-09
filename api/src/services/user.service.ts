/**
 * User Service
 * Business logic for user-related operations
 */

import { User } from '../models/User.model';
import { Device } from '../models/Device.model';
import { UserSession } from '../models/UserSession.model';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import logger from '../config/logger';

interface UpdateUserDto {
  fullName?: string;
  phoneNumber?: string | null;
  zoneinfo?: string | null;
  locale?: string | null;
}

interface UpdateDeviceDto {
  name?: string;
}

interface PaginationOptions {
  limit?: number;
  offset?: number;
}

interface DeviceFilters extends PaginationOptions {
  trustStatus?: 'trusted' | 'pending' | 'revoked';
}

interface SessionFilters extends PaginationOptions {
  isActive?: boolean;
}

class UserService {
  /**
   * Find user by ID
   * @param id - User UUID
   * @returns User object or null
   */
  async findById(id: string): Promise<User | null> {
    logger.debug(`Finding user by ID: ${id}`);

    const user = await User.findByPk(id);

    if (!user) {
      logger.warn(`User not found: ${id}`);
      return null;
    }

    return user;
  }

  /**
   * Get current user by ID (throws if not found)
   * @param userId - User UUID
   * @returns User object
   * @throws NotFoundError if user not found
   */
  async getCurrentUser(userId: string): Promise<User> {
    logger.debug(`Getting current user: ${userId}`);

    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  /**
   * Update user profile
   * @param userId - User UUID
   * @param updateData - User update data
   * @returns Updated user
   * @throws NotFoundError if user not found
   */
  async updateProfile(userId: string, updateData: UpdateUserDto): Promise<User> {
    logger.info(`Updating user profile: ${userId}`);

    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Update only allowed fields
    if (updateData.fullName !== undefined) {
      // Split fullName into givenName and familyName
      const names = updateData.fullName.trim().split(/\s+/);
      if (names.length === 1) {
        user.givenName = names[0];
        user.familyName = '';
      } else {
        user.givenName = names[0];
        user.familyName = names.slice(1).join(' ');
      }
    }

    if (updateData.phoneNumber !== undefined) {
      user.phoneNumber = updateData.phoneNumber;
    }

    if (updateData.zoneinfo !== undefined) {
      user.zoneinfo = updateData.zoneinfo;
    }

    if (updateData.locale !== undefined) {
      user.locale = updateData.locale;
    }

    await user.save();

    logger.info(`User profile updated: ${userId}`);
    return user;
  }

  /**
   * Get user's organizations (stub - requires Organization model)
   * @param userId - User UUID
   * @param options - Pagination options
   * @returns Organizations with pagination
   */
  async getUserOrganizations(
    userId: string,
    options: PaginationOptions & { includeInactive?: boolean }
  ): Promise<{ data: unknown[]; pagination: { limit: number; offset: number; total: number; hasMore: boolean } }> {
    logger.debug(`Getting organizations for user: ${userId}`);

    const { limit = 20, offset = 0 } = options;

    // TODO: Implement once Organization model is complete
    // For now, return empty array
    const data: unknown[] = [];
    const total = 0;

    return {
      data,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get user's effective permissions (stub - requires RBAC implementation)
   * @param userId - User UUID
   * @param orgId - Organization ID (from JWT or query)
   * @param envId - Environment ID (from JWT or query)
   * @returns Permissions with context
   */
  async getUserPermissions(
    userId: string,
    orgId: string,
    envId: string
  ): Promise<{
    data: unknown[];
    context: {
      organization_id: string;
      organization_name: string;
      environment_id: string;
      environment_name: string;
    };
  }> {
    logger.debug(`Getting permissions for user: ${userId}, org: ${orgId}, env: ${envId}`);

    // TODO: Implement RBAC permission calculation
    // For now, return empty permissions
    const data: unknown[] = [];

    return {
      data,
      context: {
        organization_id: orgId,
        organization_name: 'TODO',
        environment_id: envId,
        environment_name: 'TODO',
      },
    };
  }

  /**
   * Get user's devices
   * @param userId - User UUID
   * @param filters - Device filters and pagination
   * @returns Devices with pagination
   */
  async getUserDevices(
    userId: string,
    filters: DeviceFilters
  ): Promise<{ data: Device[]; pagination: { limit: number; offset: number; total: number; hasMore: boolean } }> {
    logger.debug(`Getting devices for user: ${userId}`);

    const { limit = 20, offset = 0, trustStatus } = filters;

    const where: { userId: string; trustStatus?: 'trusted' | 'pending' | 'revoked' } = { userId };

    if (trustStatus) {
      where.trustStatus = trustStatus;
    }

    const { rows: devices, count: total } = await Device.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      data: devices,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Update user's device
   * @param userId - User UUID
   * @param deviceId - Device UUID
   * @param updateData - Device update data
   * @returns Updated device
   * @throws NotFoundError if device not found
   * @throws ForbiddenError if device belongs to another user
   */
  async updateDevice(userId: string, deviceId: string, updateData: UpdateDeviceDto): Promise<Device> {
    logger.info(`Updating device: ${deviceId} for user: ${userId}`);

    const device = await Device.findByPk(deviceId);

    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE_NOT_FOUND_OR_ACCESS_DENIED);
    }

    // Verify ownership
    if (device.userId !== userId) {
      logger.warn(`User ${userId} attempted to update device ${deviceId} owned by ${device.userId}`);
      throw new ForbiddenError(ERROR_MESSAGES.DEVICE_ACCESS_DENIED);
    }

    // Update allowed fields
    if (updateData.name !== undefined) {
      device.deviceName = updateData.name;
    }

    await device.save();

    logger.info(`Device updated: ${deviceId}`);
    return device;
  }

  /**
   * Revoke user's device
   * @param userId - User UUID
   * @param deviceId - Device UUID
   * @throws NotFoundError if device not found
   * @throws ForbiddenError if device belongs to another user
   */
  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    logger.info(`Revoking device: ${deviceId} for user: ${userId}`);

    const device = await Device.findByPk(deviceId);

    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE_NOT_FOUND_OR_ACCESS_DENIED);
    }

    // Verify ownership
    if (device.userId !== userId) {
      logger.warn(`User ${userId} attempted to revoke device ${deviceId} owned by ${device.userId}`);
      throw new ForbiddenError(ERROR_MESSAGES.DEVICE_ACCESS_DENIED);
    }

    // Mark device as revoked
    device.revokedAt = new Date();
    await device.save();

    // Revoke all sessions for this device
    await UserSession.update({ isActive: false }, { where: { deviceId } });

    logger.info(`Device revoked: ${deviceId}`);
  }

  /**
   * Get user's sessions
   * @param userId - User UUID
   * @param filters - Session filters and pagination
   * @returns Sessions with pagination
   */
  async getUserSessions(
    userId: string,
    filters: SessionFilters
  ): Promise<{ data: UserSession[]; pagination: { limit: number; offset: number; total: number; hasMore: boolean } }> {
    logger.debug(`Getting sessions for user: ${userId}`);

    const { limit = 20, offset = 0, isActive } = filters;

    const where: { userId: string; isActive?: boolean } = { userId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const { rows: sessions, count: total } = await UserSession.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      // TODO: Add Device association once Sequelize associations are configured
      // include: [
      //   {
      //     model: Device,
      //     as: 'device',
      //     attributes: ['id', 'deviceName', 'fingerprintHash'],
      //   },
      // ],
    });

    return {
      data: sessions,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Revoke user's session
   * @param userId - User UUID
   * @param sessionId - Session UUID
   * @throws NotFoundError if session not found
   * @throws ForbiddenError if session belongs to another user
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    logger.info(`Revoking session: ${sessionId} for user: ${userId}`);

    const session = await UserSession.findByPk(sessionId);

    if (!session) {
      throw new NotFoundError(ERROR_MESSAGES.SESSION_NOT_FOUND_OR_ACCESS_DENIED);
    }

    // Verify ownership
    if (session.userId !== userId) {
      logger.warn(`User ${userId} attempted to revoke session ${sessionId} owned by ${session.userId}`);
      throw new ForbiddenError(ERROR_MESSAGES.SESSION_ACCESS_DENIED);
    }

    // Mark session as inactive
    session.isActive = false;
    await session.save();

    logger.info(`Session revoked: ${sessionId}`);
  }

  /**
   * Revoke all user's sessions except current
   * @param userId - User UUID
   * @param currentSessionId - Current session ID to preserve (optional)
   */
  async revokeAllSessions(userId: string, currentSessionId?: string): Promise<void> {
    logger.info(`Revoking all sessions for user: ${userId} except ${currentSessionId || 'none'}`);

    const where: { userId: string; id?: { [key: string]: string } } = { userId };

    if (currentSessionId) {
      // Exclude current session
      where.id = { ['$ne']: currentSessionId } as { [key: string]: string };
    }

    await UserSession.update({ isActive: false }, { where });

    logger.info(`All sessions revoked for user: ${userId}`);
  }
}

export const userService = new UserService();
export default userService;
