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
export interface UserImpersonationSessionCreationAttributes
  extends Optional<
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
  > {}

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
