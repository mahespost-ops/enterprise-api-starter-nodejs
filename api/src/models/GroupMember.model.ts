/**
 * GroupMember Model
 * User membership in hierarchical groups
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
import sequelize from '../config/database';

export interface GroupMemberAttributes {
  id: string;
  groupId: string;
  userId: string;
  addedBy: string | null;
  createdAt: Date;
}

export interface GroupMemberCreationAttributes
  extends Optional<GroupMemberAttributes, 'id' | 'addedBy' | 'createdAt'> {}

export class GroupMember
  extends Model<GroupMemberAttributes, GroupMemberCreationAttributes>
  implements GroupMemberAttributes
{
  declare id: string;
  declare groupId: string;
  declare userId: string;
  declare addedBy: string | null;
  declare readonly createdAt: Date;
}

GroupMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'group_id',
      references: {
        model: 'group',
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
    addedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'added_by',
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
  },
  {
    sequelize,
    tableName: 'group_member',
    timestamps: false, // Only createdAt, no updatedAt
    underscored: true,
    indexes: [
      { fields: ['group_id'] },
      { fields: ['user_id'] },
      { fields: ['group_id', 'user_id'], unique: true },
    ],
  },
);

export default GroupMember;
