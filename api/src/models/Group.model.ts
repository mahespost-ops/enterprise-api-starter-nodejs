/**
 * Group Model
 * Hierarchical groups for RBAC with parent-child relationships
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';

export interface GroupAttributes {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  hierarchyLevel: number;
  metadata: Record<string, unknown> | null;
  memberCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type GroupCreationAttributes =
  Optional<
    GroupAttributes,
    | 'id'
    | 'description'
    | 'parentId'
    | 'hierarchyLevel'
    | 'metadata'
    | 'memberCount'
    | 'isActive'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  >;

export class Group extends Model<GroupAttributes, GroupCreationAttributes> implements GroupAttributes {
  declare id: string;
  declare organizationId: string;
  declare name: string;
  declare description: string | null;
  declare parentId: string | null;
  declare hierarchyLevel: number;
  declare metadata: Record<string, unknown> | null;
  declare memberCount: number;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;

  /**
   * Find groups by organization with optional filters
   */
  static async findByOrganization(
    organizationId: string,
    filters: {
      parentId?: string | null;
      hierarchyLevel?: number;
      isActive?: boolean;
      createdAtGte?: Date;
      createdAtLte?: Date;
    } = {},
    limit = 20,
    offset = 0
  ): Promise<{ rows: Group[]; count: number }> {
    const { Op } = await import('sequelize');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { organizationId };

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.hierarchyLevel !== undefined) {
      where.hierarchyLevel = filters.hierarchyLevel;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
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

    return this.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find group by ID in specific organization
   */
  static async findByIdInOrg(groupId: string, organizationId: string): Promise<Group | null> {
    return this.findOne({
      where: {
        id: groupId,
        organizationId,
      },
    });
  }

  /**
   * Find child groups of a parent
   */
  static async findChildren(
    parentId: string,
    organizationId: string,
    limit = 20,
    offset = 0
  ): Promise<{ rows: Group[]; count: number }> {
    return this.findAndCountAll({
      where: {
        organizationId,
        parentId,
      },
      limit,
      offset,
      order: [['hierarchyLevel', 'ASC'], ['name', 'ASC']],
    });
  }
}

Group.init(
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
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
      references: {
        model: 'group',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    hierarchyLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'hierarchy_level',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    memberCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'member_count',
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
    tableName: 'group',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['organization_id'], where: { deleted_at: null } },
      { fields: ['parent_id'], where: { parent_id: { [Op.ne]: null }, deleted_at: null } },
      { fields: ['organization_id', 'hierarchy_level'], where: { deleted_at: null } },
    ],
    validate: {
      noSelfParent() {
        if (this.id === this.parentId) {
          throw new Error('Group cannot be its own parent');
        }
      },
    },
  },
);

export default Group;
