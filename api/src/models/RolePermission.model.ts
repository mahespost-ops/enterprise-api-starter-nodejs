/**
 * RolePermission Model
 * Many-to-many association between roles and permissions
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
import sequelize from '../config/database';

export interface RolePermissionAttributes {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
}

export type RolePermissionCreationAttributes =
  Optional<RolePermissionAttributes, 'id' | 'createdAt'>;

export class RolePermission
  extends Model<RolePermissionAttributes, RolePermissionCreationAttributes>
  implements RolePermissionAttributes
{
  declare id: string;
  declare roleId: string;
  declare permissionId: string;
  declare readonly createdAt: Date;
}

RolePermission.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
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
    permissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'permission_id',
      references: {
        model: 'permission',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    tableName: 'role_permission',
    timestamps: false, // Only createdAt, no updatedAt
    underscored: true,
    indexes: [
      { fields: ['role_id'] },
      { fields: ['permission_id'] },
      { fields: ['role_id', 'permission_id'], unique: true },
    ],
  },
);

export default RolePermission;
