/**
 * UserSession Model
 * Active user sessions with geolocation and activity tracking
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
import sequelize from '../config/database';

export interface UserSessionAttributes {
  id: string;
  userId: string;
  deviceId: string;
  refreshTokenHash: string;
  ipAddress: string;
  userAgent: string | null;
  geoLocation: Record<string, unknown> | null;
  requestCount: number;
  lastActivityType: string | null;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  revokedAt: Date | null;
  revokedBy: string | null;
  revocationReason: string | null;
}

export type UserSessionCreationAttributes =
  Optional<
    UserSessionAttributes,
    | 'id'
    | 'userAgent'
    | 'geoLocation'
    | 'requestCount'
    | 'lastActivityType'
    | 'createdAt'
    | 'lastAccessedAt'
    | 'isActive'
    | 'revokedAt'
    | 'revokedBy'
    | 'revocationReason'
  >;

export class UserSession
  extends Model<UserSessionAttributes, UserSessionCreationAttributes>
  implements UserSessionAttributes
{
  declare id: string;
  declare userId: string;
  declare deviceId: string;
  declare refreshTokenHash: string;
  declare ipAddress: string;
  declare userAgent: string | null;
  declare geoLocation: Record<string, unknown> | null;
  declare requestCount: number;
  declare lastActivityType: string | null;
  declare readonly createdAt: Date;
  declare lastAccessedAt: Date;
  declare expiresAt: Date;
  declare isActive: boolean;
  declare revokedAt: Date | null;
  declare revokedBy: string | null;
  declare revocationReason: string | null;

  /**
   * Find session by refresh token hash
   */
  static async findByRefreshTokenHash(hash: string): Promise<UserSession | null> {
    return this.findOne({
      where: {
        refreshTokenHash: hash,
        isActive: true,
      },
    });
  }

  /**
   * Find active sessions by user ID
   * Used for logout and token refresh with constant-time lookup
   */
  static async findActiveByUserId(userId: string): Promise<UserSession[]> {
    return this.findAll({
      where: {
        userId,
        isActive: true,
      },
    });
  }

  /**
   * Revoke session
   */
  async revoke(revokedBy?: string, reason?: string): Promise<void> {
    this.isActive = false;
    this.revokedAt = new Date();
    if (revokedBy) this.revokedBy = revokedBy;
    if (reason) this.revocationReason = reason;
    await this.save();
  }

  /**
   * Update activity
   */
  async updateActivity(activityType?: string): Promise<void> {
    this.requestCount += 1;
    this.lastAccessedAt = new Date();
    if (activityType) this.lastActivityType = activityType;
    await this.save();
  }

  /**
   * Find sessions with filters, pagination, sorting, and search
   * Used by admin endpoints for advanced session querying
   */
  static async findWithFilters(
    filters: {
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
    },
    options: {
      limit?: number;
      offset?: number;
      sort?: string;
      search?: string;
      searchFields?: string[];
      sortableFields?: string[];
      fields?: string[];
    } = {},
  ): Promise<{ rows: UserSession[]; count: number }> {
    const { Op } = await import('sequelize');
    const where: Record<string, unknown> = {};

    // Apply filters
    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.deviceId) {
      where.deviceId = filters.deviceId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isRevoked !== undefined) {
      where.revokedAt = filters.isRevoked ? { [Op.ne]: null } : null;
    }

    // Date range filters
    if (filters.createdAt) {
      const dateFilter: Record<string, unknown> = {};
      if (filters.createdAt.gte) dateFilter[Op.gte as unknown as string] = filters.createdAt.gte;
      if (filters.createdAt.lte) dateFilter[Op.lte as unknown as string] = filters.createdAt.lte;
      if (filters.createdAt.gt) dateFilter[Op.gt as unknown as string] = filters.createdAt.gt;
      if (filters.createdAt.lt) dateFilter[Op.lt as unknown as string] = filters.createdAt.lt;
      if (filters.createdAt.eq) dateFilter[Op.eq as unknown as string] = filters.createdAt.eq;
      if (filters.createdAt.ne) dateFilter[Op.ne as unknown as string] = filters.createdAt.ne;
      if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
      }
    }

    if (filters.lastAccessedAt) {
      const dateFilter: Record<string, unknown> = {};
      if (filters.lastAccessedAt.gte) dateFilter[Op.gte as unknown as string] = filters.lastAccessedAt.gte;
      if (filters.lastAccessedAt.lte) dateFilter[Op.lte as unknown as string] = filters.lastAccessedAt.lte;
      if (filters.lastAccessedAt.gt) dateFilter[Op.gt as unknown as string] = filters.lastAccessedAt.gt;
      if (filters.lastAccessedAt.lt) dateFilter[Op.lt as unknown as string] = filters.lastAccessedAt.lt;
      if (filters.lastAccessedAt.eq) dateFilter[Op.eq as unknown as string] = filters.lastAccessedAt.eq;
      if (filters.lastAccessedAt.ne) dateFilter[Op.ne as unknown as string] = filters.lastAccessedAt.ne;
      if (Object.keys(dateFilter).length > 0) {
        where.lastAccessedAt = dateFilter;
      }
    }

    if (filters.expiresAt) {
      const dateFilter: Record<string, unknown> = {};
      if (filters.expiresAt.gte) dateFilter[Op.gte as unknown as string] = filters.expiresAt.gte;
      if (filters.expiresAt.lte) dateFilter[Op.lte as unknown as string] = filters.expiresAt.lte;
      if (filters.expiresAt.gt) dateFilter[Op.gt as unknown as string] = filters.expiresAt.gt;
      if (filters.expiresAt.lt) dateFilter[Op.lt as unknown as string] = filters.expiresAt.lt;
      if (filters.expiresAt.eq) dateFilter[Op.eq as unknown as string] = filters.expiresAt.eq;
      if (filters.expiresAt.ne) dateFilter[Op.ne as unknown as string] = filters.expiresAt.ne;
      if (Object.keys(dateFilter).length > 0) {
        where.expiresAt = dateFilter;
      }
    }

    // Search across specified fields
    if (options.search && options.searchFields && options.searchFields.length > 0) {
      const searchConditions = options.searchFields.map((field) => ({
        [field]: { [Op.iLike as unknown as string]: `%${options.search}%` },
      }));
      where[Op.or as unknown as string] = searchConditions;
    }

    // Sorting
    const order: [string, string][] = [];
    if (options.sort && options.sortableFields) {
      const sortField = options.sort.startsWith('-') ? options.sort.slice(1) : options.sort;
      const sortDirection = options.sort.startsWith('-') ? 'DESC' : 'ASC';

      if (options.sortableFields.includes(sortField)) {
        order.push([sortField, sortDirection]);
      }
    } else {
      // Default sort by createdAt DESC
      order.push(['createdAt', 'DESC']);
    }

    // Field selection
    const attributes = options.fields && options.fields.length > 0 ? options.fields : undefined;

    return this.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order,
      attributes,
    });
  }
}

UserSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'user',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    deviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'device_id',
      references: {
        model: 'device',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    refreshTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'refresh_token_hash',
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: false,
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
    },
    geoLocation: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'geo_location',
    },
    requestCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'request_count',
    },
    lastActivityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'last_activity_type',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'last_accessed_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at',
    },
    revokedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'revoked_by',
      references: {
        model: 'user',
        key: 'id',
      },
    },
    revocationReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'revocation_reason',
    },
  },
  {
    sequelize,
    tableName: 'user_session',
    timestamps: false, // We manage timestamps manually
    underscored: true,
    indexes: [
      { fields: ['user_id'], where: { is_active: true } },
      { fields: ['device_id'] },
      { fields: ['expires_at'], where: { is_active: true } },
      { fields: [{ name: 'last_accessed_at', order: 'DESC' }] },
    ],
  },
);

export default UserSession;
