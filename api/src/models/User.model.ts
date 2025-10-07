/**
 * User Model
 * OIDC-compliant user identity with email/phone authentication
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';

// User attributes
export interface UserAttributes {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneNumberVerified: boolean;
  givenName: string;
  familyName: string;
  middleName: string | null;
  nickname: string | null;
  preferredUsername: string | null;
  profile: string | null;
  picture: string | null;
  website: string | null;
  gender: string | null;
  birthdate: Date | null;
  zoneinfo: string | null;
  locale: string | null;
  preferredAuthMethod: 'email' | 'sms';
  isActive: boolean;
  lastLoginAt: Date | null;
  lastOrgId: string | null;
  lastEnvId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Optional fields for creation
export type UserCreationAttributes =
  Optional<
    UserAttributes,
    | 'id'
    | 'emailVerified'
    | 'phoneNumber'
    | 'phoneNumberVerified'
    | 'middleName'
    | 'nickname'
    | 'preferredUsername'
    | 'profile'
    | 'picture'
    | 'website'
    | 'gender'
    | 'birthdate'
    | 'zoneinfo'
    | 'locale'
    | 'preferredAuthMethod'
    | 'isActive'
    | 'lastLoginAt'
    | 'lastOrgId'
    | 'lastEnvId'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  >;

/**
 * User Model Class
 */
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare emailVerified: boolean;
  declare phoneNumber: string | null;
  declare phoneNumberVerified: boolean;
  declare givenName: string;
  declare familyName: string;
  declare middleName: string | null;
  declare nickname: string | null;
  declare preferredUsername: string | null;
  declare profile: string | null;
  declare picture: string | null;
  declare website: string | null;
  declare gender: string | null;
  declare birthdate: Date | null;
  declare zoneinfo: string | null;
  declare locale: string | null;
  declare preferredAuthMethod: 'email' | 'sms';
  declare isActive: boolean;
  declare lastLoginAt: Date | null;
  declare lastOrgId: string | null;
  declare lastEnvId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;

  /**
   * Get full name
   */
  get fullName(): string {
    return `${this.givenName} ${this.familyName}`;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    return this.findOne({
      where: { email },
      paranoid: true,
    });
  }

  /**
   * Find user by phone (E.164 format)
   */
  static async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.findOne({
      where: { phoneNumber },
      paranoid: true,
    });
  }

  /**
   * Find user by identifier (polymorphic: email or phone)
   */
  static async findByIdentifier(identifier: string): Promise<User | null> {
    // Try email first (most common case)
    const byEmail = await this.findByEmail(identifier);
    if (byEmail) return byEmail;

    // Try phone (E.164 format starts with +)
    if (identifier.startsWith('+')) {
      return await this.findByPhone(identifier);
    }

    return null;
  }

  /**
   * Find users with filters, pagination, sorting, and search (admin)
   * All database query logic isolated in model layer per SOC
   */
  static async findWithFilters(
    filters: {
      isActive?: boolean;
      organizationId?: string;
      emailVerified?: boolean;
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
  ): Promise<{ rows: User[]; count: number }> {
    const { Op } = await import('sequelize');
    const { OrganizationMember } = await import('./OrganizationMember.model');

    const {
      limit = 20,
      offset = 0,
      sort = '-createdAt',
      search,
      searchFields = ['email', 'givenName', 'familyName'],
      sortableFields = ['createdAt', 'updatedAt', 'email', 'name'],
      fields,
    } = options;

    // Build where clause from filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter by isActive
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Filter by emailVerified
    if (filters.emailVerified !== undefined) {
      where.emailVerified = filters.emailVerified;
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

    // Filter by organizationId (users who are members of org)
    if (filters.organizationId) {
      const members = await OrganizationMember.findAll({
        where: { organizationId: filters.organizationId },
        attributes: ['userId'],
      });
      const userIds = members.map((m) => m.userId);
      where.id = { [Op.in]: userIds };
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

// Initialize User model
User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'email_verified',
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      field: 'phone_number',
      validate: {
        is: /^\+[1-9]\d{1,14}$/, // E.164 format
      },
    },
    phoneNumberVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'phone_number_verified',
    },
    givenName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'given_name',
    },
    familyName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'family_name',
    },
    middleName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'middle_name',
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    preferredUsername: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'preferred_username',
    },
    profile: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    picture: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    birthdate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    zoneinfo: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    locale: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    preferredAuthMethod: {
      type: DataTypes.ENUM('email', 'sms'),
      allowNull: false,
      defaultValue: 'email',
      field: 'preferred_auth_method',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at',
    },
    lastOrgId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'last_org_id',
    },
    lastEnvId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'last_env_id',
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
    tableName: 'user',
    timestamps: true,
    paranoid: true, // Soft deletes
    underscored: true,
    indexes: [
      { fields: ['email'], where: { deleted_at: null } },
      { fields: ['phone_number'], where: { phone_number: { [Op.ne]: null }, deleted_at: null } },
      { fields: ['created_at'] },
      { fields: ['last_login_at'], where: { last_login_at: { [Op.ne]: null } } },
      { fields: ['is_active'], where: { deleted_at: null } },
    ],
  },
);

export default User;
