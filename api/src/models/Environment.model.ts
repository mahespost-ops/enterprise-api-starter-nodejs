/**
 * Environment Model
 * Organizational spaces/environments (Live, Sandbox)
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
import sequelize from '../config/database';

export type EnvironmentType = 'live' | 'sandbox';

export interface EnvironmentAttributes {
  id: string;
  organizationId: string;
  name: string;
  type: EnvironmentType;
  description: string | null;
  isDefault: boolean;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type EnvironmentCreationAttributes =
  Optional<
    EnvironmentAttributes,
    'id' | 'description' | 'isDefault' | 'metadata' | 'isActive' | 'createdAt' | 'updatedAt' | 'deletedAt'
  >;

export class Environment
  extends Model<EnvironmentAttributes, EnvironmentCreationAttributes>
  implements EnvironmentAttributes
{
  declare id: string;
  declare organizationId: string;
  declare name: string;
  declare type: EnvironmentType;
  declare description: string | null;
  declare isDefault: boolean;
  declare metadata: Record<string, unknown> | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;
}

Environment.init(
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
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('live', 'sandbox'),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
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
    tableName: 'environment',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['organization_id'], where: { deleted_at: null } },
      { fields: ['type'] },
      { fields: ['organization_id', 'is_default'], where: { is_default: true, deleted_at: null } },
      { fields: ['organization_id', 'name'], unique: true },
    ],
  },
);

export default Environment;
