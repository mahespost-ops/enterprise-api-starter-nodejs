/**
 * Organization Model
 * Multi-tenant organization entity with contact and address information
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';

export interface OrganizationAttributes {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  defaultEnvId: string | null;
  logoUrl: string | null;
  website: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type OrganizationCreationAttributes =
  Optional<
    OrganizationAttributes,
    | 'id'
    | 'description'
    | 'defaultEnvId'
    | 'logoUrl'
    | 'website'
    | 'primaryContactName'
    | 'primaryContactEmail'
    | 'primaryContactPhone'
    | 'addressLine1'
    | 'addressLine2'
    | 'city'
    | 'stateProvince'
    | 'postalCode'
    | 'country'
    | 'metadata'
    | 'isActive'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  >;

export class Organization
  extends Model<OrganizationAttributes, OrganizationCreationAttributes>
  implements OrganizationAttributes
{
  declare id: string;
  declare name: string;
  declare slug: string;
  declare description: string | null;
  declare defaultEnvId: string | null;
  declare logoUrl: string | null;
  declare website: string | null;
  declare primaryContactName: string | null;
  declare primaryContactEmail: string | null;
  declare primaryContactPhone: string | null;
  declare addressLine1: string | null;
  declare addressLine2: string | null;
  declare city: string | null;
  declare stateProvince: string | null;
  declare postalCode: string | null;
  declare country: string | null;
  declare metadata: Record<string, unknown> | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;

  /**
   * Find organization by slug
   */
  static async findBySlug(slug: string): Promise<Organization | null> {
    return this.findOne({
      where: { slug },
      paranoid: true,
    });
  }

  /**
   * Find organizations with filters, pagination, sorting, and search (admin)
   * All database query logic isolated in model layer per SOC
   */
  static async findWithFilters(
    filters: {
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
  ): Promise<{ rows: Organization[]; count: number }> {
    const { Op } = await import('sequelize');

    const {
      limit = 20,
      offset = 0,
      sort = '-createdAt',
      search,
      searchFields = ['name', 'slug'],
      sortableFields = ['createdAt', 'updatedAt', 'name', 'slug'],
      fields,
    } = options;

    // Build where clause from filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter by isActive
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

Organization.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/, // Lowercase alphanumeric with hyphens
      },
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    defaultEnvId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'default_env_id',
      references: {
        model: 'environment',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'logo_url',
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    primaryContactName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'primary_contact_name',
    },
    primaryContactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'primary_contact_email',
      validate: {
        isEmail: true,
      },
    },
    primaryContactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'primary_contact_phone',
      validate: {
        is: /^\+[1-9]\d{1,14}$/, // E.164 format
      },
    },
    addressLine1: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'address_line1',
    },
    addressLine2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'address_line2',
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    stateProvince: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'state_province',
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'postal_code',
    },
    country: {
      type: DataTypes.CHAR(2),
      allowNull: true,
      validate: {
        is: /^[A-Z]{2}$/, // ISO 3166-1 alpha-2
      },
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
    tableName: 'organization',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['slug'], unique: true, where: { deleted_at: null } },
      { fields: ['is_active'], where: { deleted_at: null } },
      { fields: ['created_at'] },
      { fields: ['country'], where: { country: { [Op.ne]: null }, deleted_at: null } },
      { fields: ['country', 'state_province'], where: { state_province: { [Op.ne]: null }, deleted_at: null } },
      { fields: ['primary_contact_email'], where: { primary_contact_email: { [Op.ne]: null }, deleted_at: null } },
    ],
  },
);

export default Organization;
