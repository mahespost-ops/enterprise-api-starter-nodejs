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

  /**
   * Find groups with advanced filtering, sorting, search, and field selection
   * Used by admin list endpoint
   *
   * All database operations in model layer per CLAUDE.md separation of concerns
   *
   * @param filters - Filter criteria
   * @param options - Query options (pagination, sorting, search, fields)
   * @returns Paginated groups with total count
   */
  static async findWithFilters(
    filters: {
      organizationId?: string;
      parentId?: string | null;
      hierarchyLevel?: number;
      isActive?: boolean;
      createdAt?: {
        gte?: Date;
        lte?: Date;
        gt?: Date;
        lt?: Date;
        eq?: Date;
        ne?: Date;
      };
      updatedAt?: {
        gte?: Date;
        lte?: Date;
        gt?: Date;
        lt?: Date;
        eq?: Date;
        ne?: Date;
      };
    },
    options: {
      limit?: number;
      offset?: number;
      sort?: string;
      search?: string;
      searchFields?: string[];
      sortableFields?: string[];
      fields?: string[];
    }
  ): Promise<{ rows: Group[]; count: number }> {
    const { limit = 20, offset = 0, sort, search, searchFields = [], sortableFields = [], fields } = options;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Apply filters
    if (filters.organizationId !== undefined) {
      where.organizationId = filters.organizationId;
    }

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.hierarchyLevel !== undefined) {
      where.hierarchyLevel = filters.hierarchyLevel;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Filter by createdAt
    if (filters.createdAt) {
      where.createdAt = {};
      if (filters.createdAt.gte) where.createdAt[Op.gte] = filters.createdAt.gte;
      if (filters.createdAt.lte) where.createdAt[Op.lte] = filters.createdAt.lte;
      if (filters.createdAt.gt) where.createdAt[Op.gt] = filters.createdAt.gt;
      if (filters.createdAt.lt) where.createdAt[Op.lt] = filters.createdAt.lt;
      if (filters.createdAt.eq) where.createdAt[Op.eq] = filters.createdAt.eq;
      if (filters.createdAt.ne) where.createdAt[Op.ne] = filters.createdAt.ne;
    }

    // Filter by updatedAt
    if (filters.updatedAt) {
      where.updatedAt = {};
      if (filters.updatedAt.gte) where.updatedAt[Op.gte] = filters.updatedAt.gte;
      if (filters.updatedAt.lte) where.updatedAt[Op.lte] = filters.updatedAt.lte;
      if (filters.updatedAt.gt) where.updatedAt[Op.gt] = filters.updatedAt.gt;
      if (filters.updatedAt.lt) where.updatedAt[Op.lt] = filters.updatedAt.lt;
      if (filters.updatedAt.eq) where.updatedAt[Op.eq] = filters.updatedAt.eq;
      if (filters.updatedAt.ne) where.updatedAt[Op.ne] = filters.updatedAt.ne;
    }

    // Search across multiple fields
    if (search) {
      const searchPattern = `%${search}%`;
      where[Op.or] = searchFields.map((field) => ({
        [field]: { [Op.iLike]: searchPattern },
      }));
    }

    // Parse sort parameter
    const order: [string, string][] = [];
    if (sort) {
      const sortFields = sort.split(',');
      for (const field of sortFields) {
        if (field.startsWith('-')) {
          const fieldName = field.substring(1);
          if (sortableFields.includes(fieldName)) {
            order.push([fieldName, 'DESC']);
          }
        } else {
          if (sortableFields.includes(field)) {
            order.push([field, 'ASC']);
          }
        }
      }
    }

    // Build query options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryOptions: any = {
      where,
      limit,
      offset,
      order: order.length > 0 ? order : [['createdAt', 'DESC']],
    };

    // Field selection
    if (fields && fields.length > 0) {
      queryOptions.attributes = fields;
    }

    // Execute query
    return this.findAndCountAll(queryOptions);
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
