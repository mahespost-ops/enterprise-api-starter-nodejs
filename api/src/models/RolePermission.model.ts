/**
 * RolePermission Model
 * Many-to-many association between roles and permissions
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
import sequelize from '../config/database';
import type { Permission } from './Permission.model';
import { ConflictError, NotFoundError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';

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

  // Association
  declare permission?: Permission;

  /**
   * Add permission to role with transaction support
   * Encapsulates transaction logic in model layer
   */
  static async addPermissionToRole(roleId: string, permissionId: string): Promise<RolePermission> {
    const transaction = await sequelize.transaction();

    try {
      // Check if permission already assigned
      const existing = await RolePermission.findOne({
        where: { roleId, permissionId },
      });

      if (existing) {
        await transaction.rollback();
        throw new ConflictError(ERROR_MESSAGES.ROLE_PERMISSION_EXISTS);
      }

      // Create association
      const rolePermission = await RolePermission.create(
        { roleId, permissionId },
        { transaction }
      );

      // Increment permission count on role
      await sequelize.query(
        'UPDATE role SET permission_count = permission_count + 1 WHERE id = :roleId',
        {
          replacements: { roleId },
          transaction,
        }
      );

      await transaction.commit();
      return rolePermission;
    } catch (error) {
      // Safely rollback if not already rolled back
      try {
        await transaction.rollback();
      } catch {
        // Transaction already rolled back, ignore
      }
      throw error;
    }
  }

  /**
   * Remove permission from role with transaction support
   * Encapsulates transaction logic in model layer
   */
  static async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      // Find and delete association
      const rolePermission = await RolePermission.findOne({
        where: { roleId, permissionId },
      });

      if (!rolePermission) {
        await transaction.rollback();
        throw new NotFoundError(ERROR_MESSAGES.ROLE_PERMISSION_NOT_FOUND);
      }

      await rolePermission.destroy({ transaction });

      // Decrement permission count on role
      await sequelize.query(
        'UPDATE role SET permission_count = permission_count - 1 WHERE id = :roleId',
        {
          replacements: { roleId },
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      // Safely rollback if not already rolled back
      try {
        await transaction.rollback();
      } catch {
        // Transaction already rolled back, ignore
      }
      throw error;
    }
  }
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
