/**
 * EnvironmentRoleAssignment Model
 * Polymorphic role assignments to either membership or group within environment context
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';

export interface EnvironmentRoleAssignmentAttributes {
  id: string;
  environmentId: string;
  roleId: string;
  membershipId: string | null;
  groupId: string | null;
  assignedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type EnvironmentRoleAssignmentCreationAttributes =
  Optional<
    EnvironmentRoleAssignmentAttributes,
    'id' | 'membershipId' | 'groupId' | 'assignedBy' | 'createdAt' | 'updatedAt' | 'deletedAt'
  >;

export class EnvironmentRoleAssignment
  extends Model<EnvironmentRoleAssignmentAttributes, EnvironmentRoleAssignmentCreationAttributes>
  implements EnvironmentRoleAssignmentAttributes
{
  declare id: string;
  declare environmentId: string;
  declare roleId: string;
  declare membershipId: string | null;
  declare groupId: string | null;
  declare assignedBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;
}

EnvironmentRoleAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    environmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'environment_id',
      references: {
        model: 'environment',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'role_id',
      references: {
        model: 'role',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    membershipId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'membership_id',
      references: {
        model: 'organization_member',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'group_id',
      references: {
        model: 'group',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_by',
      references: {
        model: 'user',
        key: 'id',
      },
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
    tableName: 'environment_role_assignment',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['environment_id'], where: { deleted_at: null } },
      { fields: ['role_id'], where: { deleted_at: null } },
      { fields: ['membership_id'], where: { membership_id: { [Op.ne]: null }, deleted_at: null } },
      { fields: ['group_id'], where: { group_id: { [Op.ne]: null }, deleted_at: null } },
    ],
    validate: {
      memberOrGroupOnly() {
        if (
          (this.membershipId && this.groupId) ||
          (!this.membershipId && !this.groupId)
        ) {
          throw new Error('Assignment must be to either membership or group, but not both');
        }
      },
    },
  },
);

export default EnvironmentRoleAssignment;
