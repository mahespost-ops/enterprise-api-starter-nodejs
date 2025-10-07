/**
 * Environment Model
 * Organizational spaces/environments (Live, Sandbox)
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
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

  /**
   * Find environments by organization with filters
   * All database query logic isolated in model layer per SOC
   */
  static async findByOrganization(
    organizationId: string,
    filters: {
      type?: string;
      isDefault?: boolean;
      search?: string;
    } = {},
    options: {
      limit?: number;
      offset?: number;
      fields?: string[];
    } = {}
  ): Promise<{ rows: Environment[]; count: number }> {
    const { limit = 20, offset = 0, fields } = options;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { organizationId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
    }

    if (filters.search) {
      where.name = { [Op.iLike]: `%${filters.search}%` };
    }

    return this.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: fields && fields.length > 0 ? ['id', ...fields] : undefined,
    });
  }

  /**
   * Find environments with filters, pagination, sorting, and search (admin)
   * All database query logic isolated in model layer per SOC
   */
  static async findWithFilters(
    filters: {
      organizationId?: string;
      type?: string;
      isActive?: boolean;
      isDefault?: boolean;
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
    } = {},
    options: {
      limit?: number;
      offset?: number;
      sort?: string;
      search?: string;
      searchFields?: string[];
      sortableFields?: string[];
      fields?: string[];
    } = {}
  ): Promise<{ rows: Environment[]; count: number }> {
    const { Op } = await import('sequelize');

    const {
      limit = 20,
      offset = 0,
      sort = '-createdAt',
      search,
      searchFields = ['name'],
      sortableFields = ['name', 'type', 'createdAt', 'updatedAt', 'isDefault', 'isActive'],
      fields,
    } = options;

    // Build where clause from filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter by organizationId
    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    // Filter by type
    if (filters.type) {
      where.type = filters.type;
    }

    // Filter by isActive
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Filter by isDefault
    if (filters.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
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

    // Default order if none specified or all invalid
    if (order.length === 0) {
      order.push(['createdAt', 'DESC']);
    }

    // Build attributes for field selection
    const attributes = fields && fields.length > 0 ? ['id', ...fields] : undefined;

    return this.findAndCountAll({
      where,
      limit,
      offset,
      order,
      attributes,
    });
  }
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
