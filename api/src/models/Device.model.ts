/**
 * Device Model
 * Device fingerprinting and trust management
 */

import { Model, DataTypes, Optional, UUIDV1, Op, WhereOptions, Order } from 'sequelize';
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

export type DeviceCreationAttributes = Optional<
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
>;

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

  /**
   * Static method to find devices with filters
   * All database query logic stays in model layer (SOC)
   */
  static async findWithFilters(
    filters: {
      userId?: string;
      trustStatus?: TrustStatus;
      deviceType?: DeviceType;
      isRevoked?: boolean;
      createdAt?: {
        gte?: Date;
        lte?: Date;
        gt?: Date;
        lt?: Date;
        eq?: Date;
        ne?: Date;
      };
      lastUsedAt?: {
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
    },
  ): Promise<{ rows: Device[]; count: number }> {
    const where: WhereOptions = {};

    // Apply filters
    if (filters.userId !== undefined) {
      where.userId = filters.userId;
    }

    if (filters.trustStatus !== undefined) {
      where.trustStatus = filters.trustStatus;
    }

    if (filters.deviceType !== undefined) {
      where.deviceType = filters.deviceType;
    }

    if (filters.isRevoked !== undefined) {
      if (filters.isRevoked) {
        where.revokedAt = { [Op.ne]: null };
      } else {
        where.revokedAt = null;
      }
    }

    // Date filters for createdAt
    if (filters.createdAt) {
      const createdAtConditions: Record<symbol, Date> = {};
      if (filters.createdAt.gte) createdAtConditions[Op.gte] = filters.createdAt.gte;
      if (filters.createdAt.lte) createdAtConditions[Op.lte] = filters.createdAt.lte;
      if (filters.createdAt.gt) createdAtConditions[Op.gt] = filters.createdAt.gt;
      if (filters.createdAt.lt) createdAtConditions[Op.lt] = filters.createdAt.lt;
      if (filters.createdAt.eq) createdAtConditions[Op.eq] = filters.createdAt.eq;
      if (filters.createdAt.ne) createdAtConditions[Op.ne] = filters.createdAt.ne;
      if (Object.keys(createdAtConditions).length > 0) {
        where.createdAt = createdAtConditions;
      }
    }

    // Date filters for lastUsedAt
    if (filters.lastUsedAt) {
      const lastUsedAtConditions: Record<symbol, Date> = {};
      if (filters.lastUsedAt.gte) lastUsedAtConditions[Op.gte] = filters.lastUsedAt.gte;
      if (filters.lastUsedAt.lte) lastUsedAtConditions[Op.lte] = filters.lastUsedAt.lte;
      if (filters.lastUsedAt.gt) lastUsedAtConditions[Op.gt] = filters.lastUsedAt.gt;
      if (filters.lastUsedAt.lt) lastUsedAtConditions[Op.lt] = filters.lastUsedAt.lt;
      if (filters.lastUsedAt.eq) lastUsedAtConditions[Op.eq] = filters.lastUsedAt.eq;
      if (filters.lastUsedAt.ne) lastUsedAtConditions[Op.ne] = filters.lastUsedAt.ne;
      if (Object.keys(lastUsedAtConditions).length > 0) {
        where.lastUsedAt = lastUsedAtConditions;
      }
    }

    // Search across specified fields
    if (options.search && options.searchFields) {
      const searchConditions = options.searchFields.map((field) => ({
        [field]: { [Op.iLike]: `%${options.search}%` },
      }));
      // Type assertion needed for Sequelize Op.or symbol indexing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (where as any)[Op.or] = searchConditions;
    }

    // Parse sort parameter
    let order: Order = [['createdAt', 'DESC']]; // Default sort
    if (options.sort && options.sortableFields) {
      const sortFields = options.sort.split(',');
      order = sortFields
        .map((field) => {
          const direction = field.startsWith('-') ? 'DESC' : 'ASC';
          const fieldName = field.startsWith('-') ? field.slice(1) : field;

          // Map API field names to database field names
          const fieldMap: Record<string, string> = {
            name: 'deviceName',
            deviceType: 'deviceType',
            trustStatus: 'trustStatus',
            createdAt: 'createdAt',
            lastUsedAt: 'lastUsedAt',
          };

          const dbFieldName = fieldMap[fieldName] || fieldName;

          if (options.sortableFields?.includes(dbFieldName)) {
            return [dbFieldName, direction] as [string, string];
          }
          return null;
        })
        .filter((item): item is [string, string] => item !== null);
    }

    // Build query options
    const queryOptions: {
      where: WhereOptions;
      limit?: number;
      offset?: number;
      order: Order;
      attributes?: string[];
    } = {
      where,
      limit: options.limit,
      offset: options.offset,
      order,
    };

    // Apply field selection
    if (options.fields && options.fields.length > 0) {
      queryOptions.attributes = options.fields;
    }

    return Device.findAndCountAll(queryOptions);
  }
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
