/**
 * Role Model
 * RBAC roles with permission counts
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';

export interface RoleAttributes {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type RoleCreationAttributes =
  Optional<
    RoleAttributes,
    'id' | 'description' | 'isSystem' | 'permissionCount' | 'createdAt' | 'updatedAt' | 'deletedAt'
  >;

export class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  declare id: string;
  declare name: string;
  declare description: string | null;
  declare isSystem: boolean;
  declare permissionCount: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;

  /**
   * Find roles with filters, pagination, sorting, and search
   * All database operations are encapsulated in the model layer
   */
  static async findWithFilters(
    filters: {
      isSystem?: boolean;
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
  ): Promise<{ rows: Role[]; count: number }> {
    const { limit = 20, offset = 0, sort, search, searchFields = [], sortableFields = [], fields } = options;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Apply filters
    if (filters.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
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

    // Build order clause
    const order: [string, string][] = [];
    if (sort) {
      const sortFields = sort.split(',');
      for (const field of sortFields) {
        const direction = field.startsWith('-') ? 'DESC' : 'ASC';
        const fieldName = field.startsWith('-') ? field.substring(1) : field;

        // Only allow sorting by sortable fields
        if (sortableFields.includes(fieldName)) {
          order.push([fieldName, direction]);
        }
      }
    } else {
      // Default sort by createdAt descending
      order.push(['createdAt', 'DESC']);
    }

    // Build attributes for field selection
    const attributes = fields && fields.length > 0 ? fields : undefined;

    // Execute query
    const { rows, count } = await Role.findAndCountAll({
      where,
      limit,
      offset,
      order,
      attributes,
    });

    return { rows, count };
  }
}

Role.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_system',
    },
    permissionCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'permission_count',
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
    tableName: 'role',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [{ fields: ['name'], where: { deleted_at: null } }],
  },
);

export default Role;
