/**
 * Permission Model
 * Granular permissions for RBAC system
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
import sequelize from '../config/database';

export type PermissionAction = 'read' | 'manage' | 'assign';

export interface PermissionAttributes {
  id: string;
  key: string;
  name: string;
  description: string | null;
  resource: string;
  action: PermissionAction;
  isSystem: boolean;
  createdAt: Date;
}

export interface PermissionCreationAttributes
  extends Optional<PermissionAttributes, 'id' | 'description' | 'isSystem' | 'createdAt'> {}

export class Permission
  extends Model<PermissionAttributes, PermissionCreationAttributes>
  implements PermissionAttributes
{
  declare id: string;
  declare key: string;
  declare name: string;
  declare description: string | null;
  declare resource: string;
  declare action: PermissionAction;
  declare isSystem: boolean;
  declare readonly createdAt: Date;
}

Permission.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    resource: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM('read', 'manage', 'assign'),
      allowNull: false,
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_system',
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
    tableName: 'permission',
    timestamps: false, // Only createdAt, no updatedAt
    underscored: true,
    indexes: [
      { fields: ['key'] },
      { fields: ['resource', 'action'] },
    ],
  },
);

export default Permission;
