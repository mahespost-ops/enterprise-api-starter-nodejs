/**
 * Device Model
 * Device fingerprinting and trust management
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
import sequelize from '../config/database';

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';
export type TrustStatus = 'trusted' | 'pending' | 'revoked';

export interface DeviceAttributes {
  id: string;
  userId: string;
  fingerprintHash: string;
  deviceName: string | null;
  deviceType: DeviceType | null;
  os: string | null;
  browser: string | null;
  userAgent: string | null;
  timezone: string | null;
  screenResolution: string | null;
  trustStatus: TrustStatus;
  firstSeenIp: string;
  lastSeenIp: string | null;
  lastCountry: string | null;
  lastRegion: string | null;
  lastCity: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
}

export interface DeviceCreationAttributes
  extends Optional<
    DeviceAttributes,
    | 'id'
    | 'deviceName'
    | 'deviceType'
    | 'os'
    | 'browser'
    | 'userAgent'
    | 'timezone'
    | 'screenResolution'
    | 'trustStatus'
    | 'lastSeenIp'
    | 'lastCountry'
    | 'lastRegion'
    | 'lastCity'
    | 'createdAt'
    | 'lastUsedAt'
    | 'revokedAt'
  > {}

export class Device extends Model<DeviceAttributes, DeviceCreationAttributes> implements DeviceAttributes {
  declare id: string;
  declare userId: string;
  declare fingerprintHash: string;
  declare deviceName: string | null;
  declare deviceType: DeviceType | null;
  declare os: string | null;
  declare browser: string | null;
  declare userAgent: string | null;
  declare timezone: string | null;
  declare screenResolution: string | null;
  declare trustStatus: TrustStatus;
  declare firstSeenIp: string;
  declare lastSeenIp: string | null;
  declare lastCountry: string | null;
  declare lastRegion: string | null;
  declare lastCity: string | null;
  declare readonly createdAt: Date;
  declare lastUsedAt: Date;
  declare revokedAt: Date | null;
}

Device.init(
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
    fingerprintHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'fingerprint_hash',
    },
    deviceName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'device_name',
    },
    deviceType: {
      type: DataTypes.ENUM('desktop', 'mobile', 'tablet', 'unknown'),
      allowNull: true,
      field: 'device_type',
    },
    os: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    browser: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    screenResolution: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'screen_resolution',
    },
    trustStatus: {
      type: DataTypes.ENUM('trusted', 'pending', 'revoked'),
      allowNull: false,
      defaultValue: 'pending',
      field: 'trust_status',
    },
    firstSeenIp: {
      type: DataTypes.INET,
      allowNull: false,
      field: 'first_seen_ip',
    },
    lastSeenIp: {
      type: DataTypes.INET,
      allowNull: true,
      field: 'last_seen_ip',
    },
    lastCountry: {
      type: DataTypes.CHAR(2),
      allowNull: true,
      field: 'last_country',
    },
    lastRegion: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'last_region',
    },
    lastCity: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'last_city',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'last_used_at',
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at',
    },
  },
  {
    sequelize,
    tableName: 'device',
    timestamps: false, // We manage timestamps manually
    underscored: true,
    indexes: [
      { fields: ['user_id'], where: { revoked_at: null } },
      { fields: ['fingerprint_hash'] },
      { fields: ['trust_status'], where: { revoked_at: null } },
      { fields: [{ name: 'last_used_at', order: 'DESC' }] },
      { fields: ['user_id', 'fingerprint_hash'], unique: true },
    ],
  },
);

export default Device;
