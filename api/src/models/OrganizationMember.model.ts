/**
 * OrganizationMember Model
 * User membership in organizations with invitation and context tracking
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
import sequelize from '../config/database';
import type { User } from './User.model';

export type MemberStatus = 'active' | 'invited' | 'suspended';

export interface OrganizationMemberAttributes {
  id: string;
  organizationId: string;
  userId: string;
  status: MemberStatus;
  invitedBy: string | null;
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  joinedAt: Date | null; // Timestamp when user became active member (null until first login)
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type OrganizationMemberCreationAttributes =
  Optional<
    OrganizationMemberAttributes,
    | 'id'
    | 'status'
    | 'invitedBy'
    | 'invitationToken'
    | 'invitationExpiresAt'
    | 'joinedAt'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  >;

export class OrganizationMember
  extends Model<OrganizationMemberAttributes, OrganizationMemberCreationAttributes>
  implements OrganizationMemberAttributes
{
  declare id: string;
  declare organizationId: string;
  declare userId: string;
  declare status: MemberStatus;
  declare invitedBy: string | null;
  declare invitationToken: string | null;
  declare invitationExpiresAt: Date | null;
  declare joinedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;

  // Association declarations for TypeScript
  declare user?: User; // User model association

  /**
   * Find members by organization with optional filters
   */
  static async findByOrganization(
    organizationId: string,
    filters: {
      status?: string;
      createdAtGte?: Date;
      createdAtLte?: Date;
      joinedAtGte?: Date;
      joinedAtLte?: Date;
    } = {},
    limit = 20,
    offset = 0
  ): Promise<{ rows: OrganizationMember[]; count: number }> {
    const { Op } = await import('sequelize');
    const { User } = await import('./User.model');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { organizationId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.createdAtGte || filters.createdAtLte) {
      where.createdAt = {};
      if (filters.createdAtGte) {
        where.createdAt[Op.gte] = filters.createdAtGte;
      }
      if (filters.createdAtLte) {
        where.createdAt[Op.lte] = filters.createdAtLte;
      }
    }

    if (filters.joinedAtGte || filters.joinedAtLte) {
      where.joinedAt = {};
      if (filters.joinedAtGte) {
        where.joinedAt[Op.gte] = filters.joinedAtGte;
      }
      if (filters.joinedAtLte) {
        where.joinedAt[Op.lte] = filters.joinedAtLte;
      }
    }

    return this.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'givenName', 'familyName'],
        },
      ],
    });
  }

  /**
   * Find member by ID in specific organization
   */
  static async findByIdInOrg(
    memberId: string,
    organizationId: string
  ): Promise<OrganizationMember | null> {
    const { User } = await import('./User.model');

    return this.findOne({
      where: {
        id: memberId,
        organizationId,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'givenName', 'familyName'],
        },
      ],
    });
  }

  /**
   * Find member by user ID and organization ID
   */
  static async findByUserAndOrg(
    userId: string,
    organizationId: string
  ): Promise<OrganizationMember | null> {
    return this.findOne({
      where: {
        userId,
        organizationId,
      },
    });
  }

  /**
   * Find all active memberships for a user
   */
  static async findActiveByUser(userId: string): Promise<OrganizationMember[]> {
    return this.findAll({
      where: {
        userId,
        status: 'active',
      },
    });
  }
}

OrganizationMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'organization_id',
      references: {
        model: 'organization',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    status: {
      type: DataTypes.ENUM('active', 'invited', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'invited_by',
      references: {
        model: 'user',
        key: 'id',
      },
    },
    invitationToken: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      field: 'invitation_token',
    },
    invitationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'invitation_expires_at',
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'joined_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'organization_member',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['organization_id'], where: { deleted_at: null } },
      { fields: ['user_id'], where: { deleted_at: null } },
      { fields: ['status'], where: { deleted_at: null } },
      { fields: ['invitation_token'], where: { status: 'invited', deleted_at: null } },
      { fields: ['organization_id', 'user_id'], unique: true },
    ],
  },
);

export default OrganizationMember;
