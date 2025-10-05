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
