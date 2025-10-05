/**
 * OrganizationMember Model
 * User membership in organizations with invitation and context tracking
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
import sequelize from '../config/database';

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
