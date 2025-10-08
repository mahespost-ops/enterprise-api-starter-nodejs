/**
 * UserImpersonationSession Model
 * Tracks user impersonation sessions with chaining support for multi-level impersonation
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';

// ImpersonationSession attributes
export interface UserImpersonationSessionAttributes {
  id: string;
  originalUserId: string;
  impersonatedUserId: string;
  parentSessionId: string | null;
  environmentId: string;
  impersonationType: 'system' | 'organization';
  permissions: Record<string, unknown> | null;
  reason: string;
  ipAddress: string | null;
  userAgent: string | null;
  startedAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
}

// Optional fields for creation
export type UserImpersonationSessionCreationAttributes =
  Optional<
    UserImpersonationSessionAttributes,
    | 'id'
    | 'parentSessionId'
    | 'permissions'
    | 'ipAddress'
    | 'userAgent'
    | 'startedAt'
    | 'expiresAt'
    | 'endedAt'
    | 'isActive'
    | 'metadata'
  >;

/**
 * UserImpersonationSession Model Class
 */
export class UserImpersonationSession
  extends Model<UserImpersonationSessionAttributes, UserImpersonationSessionCreationAttributes>
  implements UserImpersonationSessionAttributes
{
  declare id: string;
  declare originalUserId: string;
  declare impersonatedUserId: string;
  declare parentSessionId: string | null;
  declare environmentId: string;
  declare impersonationType: 'system' | 'organization';
  declare permissions: Record<string, unknown> | null;
  declare reason: string;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare startedAt: Date;
  declare expiresAt: Date;
  declare endedAt: Date | null;
  declare isActive: boolean;
  declare metadata: Record<string, unknown> | null;

  /**
   * Find active impersonation session by ID
   */
  static async findActiveById(sessionId: string): Promise<UserImpersonationSession | null> {
    return this.findOne({
      where: {
        id: sessionId,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
  }

  /**
   * Find active impersonation sessions for a user
   */
  static async findActiveForUser(originalUserId: string): Promise<UserImpersonationSession[]> {
    return this.findAll({
      where: {
        originalUserId,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['startedAt', 'DESC']],
    });
  }

  /**
   * End impersonation session
   */
  async end(): Promise<void> {
    this.isActive = false;
    this.endedAt = new Date();
    await this.save();
  }

  /**
   * Check if session is expired
   */
  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  /**
   * Validate that user is not impersonating themselves
   */
  async validateNotSelfImpersonation(): Promise<void> {
    if (this.originalUserId === this.impersonatedUserId) {
      throw new Error('Cannot impersonate self');
    }
  }

  /**
   * Find impersonation sessions with advanced filtering, pagination, sorting, and search
   * Delegates all database logic to model layer (no Op imports in service)
   */
  static async findWithFilters(
    filters: {
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
    },
    options: {
      limit?: number;
      offset?: number;
      sort?: string;
      search?: string;
      searchFields?: string[];
      sortableFields?: string[];
      fields?: string[];
    }
  ): Promise<{ rows: UserImpersonationSession[]; count: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Apply filters
    if (filters.originalUserId) {
      where.originalUserId = filters.originalUserId;
    }
    if (filters.impersonatedUserId) {
      where.impersonatedUserId = filters.impersonatedUserId;
    }
    if (filters.environmentId) {
      where.environmentId = filters.environmentId;
    }
    if (filters.impersonationType) {
      where.impersonationType = filters.impersonationType;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Date range filters for startedAt
    if (filters.startedAt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startedAtConditions: any = {};
      if (filters.startedAt.gte) startedAtConditions[Op.gte] = filters.startedAt.gte;
      if (filters.startedAt.lte) startedAtConditions[Op.lte] = filters.startedAt.lte;
      if (filters.startedAt.gt) startedAtConditions[Op.gt] = filters.startedAt.gt;
      if (filters.startedAt.lt) startedAtConditions[Op.lt] = filters.startedAt.lt;
      if (filters.startedAt.eq) startedAtConditions[Op.eq] = filters.startedAt.eq;
      if (filters.startedAt.ne) startedAtConditions[Op.ne] = filters.startedAt.ne;
      // Check for Symbol keys using Object.getOwnPropertySymbols
      if (Object.keys(startedAtConditions).length > 0 || Object.getOwnPropertySymbols(startedAtConditions).length > 0) {
        where.startedAt = startedAtConditions;
      }
    }

    // Date range filters for expiresAt
    if (filters.expiresAt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const expiresAtConditions: any = {};
      if (filters.expiresAt.gte) expiresAtConditions[Op.gte] = filters.expiresAt.gte;
      if (filters.expiresAt.lte) expiresAtConditions[Op.lte] = filters.expiresAt.lte;
      if (filters.expiresAt.gt) expiresAtConditions[Op.gt] = filters.expiresAt.gt;
      if (filters.expiresAt.lt) expiresAtConditions[Op.lt] = filters.expiresAt.lt;
      if (filters.expiresAt.eq) expiresAtConditions[Op.eq] = filters.expiresAt.eq;
      if (filters.expiresAt.ne) expiresAtConditions[Op.ne] = filters.expiresAt.ne;
      // Check for Symbol keys using Object.getOwnPropertySymbols
      if (Object.keys(expiresAtConditions).length > 0 || Object.getOwnPropertySymbols(expiresAtConditions).length > 0) {
        where.expiresAt = expiresAtConditions;
      }
    }

    // Date range filters for endedAt
    if (filters.endedAt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const endedAtConditions: any = {};
      if (filters.endedAt.gte) endedAtConditions[Op.gte] = filters.endedAt.gte;
      if (filters.endedAt.lte) endedAtConditions[Op.lte] = filters.endedAt.lte;
      if (filters.endedAt.gt) endedAtConditions[Op.gt] = filters.endedAt.gt;
      if (filters.endedAt.lt) endedAtConditions[Op.lt] = filters.endedAt.lt;
      if (filters.endedAt.eq) endedAtConditions[Op.eq] = filters.endedAt.eq;
      if (filters.endedAt.ne) endedAtConditions[Op.ne] = filters.endedAt.ne;
      // Check for Symbol keys using Object.getOwnPropertySymbols
      if (Object.keys(endedAtConditions).length > 0 || Object.getOwnPropertySymbols(endedAtConditions).length > 0) {
        where.endedAt = endedAtConditions;
      }
    }

    // Search across reason field
    if (options.search && options.searchFields && options.searchFields.length > 0) {
      const searchConditions = options.searchFields.map((field) => ({
        [field]: { [Op.iLike]: `%${options.search}%` },
      }));
      where[Op.or] = searchConditions;
    }

    // Build order clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order: any[] = [];
    if (options.sort) {
      const sortFields = options.sort.split(',');
      for (const field of sortFields) {
        const direction = field.startsWith('-') ? 'DESC' : 'ASC';
        const fieldName = field.replace(/^-/, '');

        // Validate against sortable fields if provided
        if (options.sortableFields && !options.sortableFields.includes(fieldName)) {
          continue; // Skip invalid sort fields
        }

        order.push([fieldName, direction]);
      }
    }

    // Default sort if none provided
    if (order.length === 0) {
      order.push(['startedAt', 'DESC']);
    }

    // Field selection (attributes)
    const attributes = options.fields && options.fields.length > 0 ? options.fields : undefined;

    return this.findAndCountAll({
      where,
      limit: options.limit || 20,
      offset: options.offset || 0,
      order,
      attributes,
    });
  }
}

// Initialize UserImpersonationSession model
UserImpersonationSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    originalUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'original_user_id',
    },
    impersonatedUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'impersonated_user_id',
    },
    parentSessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_session_id',
    },
    environmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'environment_id',
    },
    impersonationType: {
      type: DataTypes.ENUM('system', 'organization'),
      allowNull: false,
      field: 'impersonation_type',
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Reserved for future permission overrides',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Audit trail: Why is this impersonation happening?',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
      comment: 'IPv4 or IPv6 address',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'started_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
      comment: 'Configurable session duration with system-enforced maximum',
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ended_at',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional context (e.g., support ticket ID, audit reference)',
    },
  },
  {
    sequelize,
    tableName: 'user_impersonation_session',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['original_user_id', 'is_active'] },
      { fields: ['impersonated_user_id'] },
      { fields: ['environment_id'] },
      { fields: ['parent_session_id'], where: { parent_session_id: { [Op.ne]: null } } },
      { fields: ['started_at'] },
      { fields: ['expires_at'] },
      { fields: ['is_active', 'expires_at'], where: { is_active: true } },
    ],
    validate: {
      async noSelfImpersonation() {
        if (this.originalUserId === this.impersonatedUserId) {
          throw new Error('Cannot impersonate self');
        }
      },
    },
  },
);

export default UserImpersonationSession;
