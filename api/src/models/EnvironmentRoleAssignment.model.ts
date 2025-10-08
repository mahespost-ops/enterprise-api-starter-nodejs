/**
 * EnvironmentRoleAssignment Model
 * Polymorphic role assignments to either membership or group within environment context
 */

import { Model, DataTypes, Optional, UUIDV1, Op, WhereOptions } from 'sequelize';
import sequelize from '../config/database';

export interface EnvironmentRoleAssignmentAttributes {
  id: string;
  environmentId: string;
  roleId: string;
  membershipId: string | null;
  groupId: string | null;
  assignedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type EnvironmentRoleAssignmentCreationAttributes =
  Optional<
    EnvironmentRoleAssignmentAttributes,
    'id' | 'membershipId' | 'groupId' | 'assignedBy' | 'createdAt' | 'updatedAt' | 'deletedAt'
  >;

/**
 * Filter options for finding role assignments
 */
export interface RoleAssignmentFilters {
  organizationId?: string;
  environmentId?: string;
  membershipId?: string;
  groupId?: string;
  roleId?: string;
  assigneeType?: 'member' | 'group';
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
}

/**
 * Query options for finding role assignments
 */
export interface RoleAssignmentQueryOptions {
  limit: number;
  offset: number;
  sort?: string;
  search?: string;
  searchFields?: string[];
  sortableFields?: string[];
  fields?: string[];
}

export class EnvironmentRoleAssignment
  extends Model<EnvironmentRoleAssignmentAttributes, EnvironmentRoleAssignmentCreationAttributes>
  implements EnvironmentRoleAssignmentAttributes
{
  declare id: string;
  declare environmentId: string;
  declare roleId: string;
  declare membershipId: string | null;
  declare groupId: string | null;
  declare assignedBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;

  /**
   * Find role assignments with advanced filtering, sorting, and search
   * All database logic contained in model layer per SOC standards
   */
  static async findWithFilters(
    filters: RoleAssignmentFilters,
    options: RoleAssignmentQueryOptions,
  ): Promise<{ rows: EnvironmentRoleAssignment[]; count: number }> {
    const { limit, offset, sort, search, searchFields = [], sortableFields = [], fields } = options;

    // Build where clause for direct filters
    const where: WhereOptions<EnvironmentRoleAssignmentAttributes> = {};

    // Filter by environmentId
    if (filters.environmentId) {
      where.environmentId = filters.environmentId;
    }

    // Filter by membershipId
    if (filters.membershipId) {
      where.membershipId = filters.membershipId;
    }

    // Filter by groupId
    if (filters.groupId) {
      where.groupId = filters.groupId;
    }

    // Filter by roleId
    if (filters.roleId) {
      where.roleId = filters.roleId;
    }

    // Filter by assigneeType (virtual field based on membershipId/groupId)
    if (filters.assigneeType === 'member') {
      where.membershipId = { [Op.ne]: null };
      where.groupId = null;
    } else if (filters.assigneeType === 'group') {
      where.groupId = { [Op.ne]: null };
      where.membershipId = null;
    }

    // Filter by createdAt
    if (filters.createdAt) {
      const createdAtFilter: Record<symbol, Date> = {};
      if (filters.createdAt.gte) createdAtFilter[Op.gte] = filters.createdAt.gte;
      if (filters.createdAt.lte) createdAtFilter[Op.lte] = filters.createdAt.lte;
      if (filters.createdAt.gt) createdAtFilter[Op.gt] = filters.createdAt.gt;
      if (filters.createdAt.lt) createdAtFilter[Op.lt] = filters.createdAt.lt;
      if (filters.createdAt.eq) createdAtFilter[Op.eq] = filters.createdAt.eq;
      if (filters.createdAt.ne) createdAtFilter[Op.ne] = filters.createdAt.ne;
      where.createdAt = createdAtFilter;
    }

    // Filter by updatedAt
    if (filters.updatedAt) {
      const updatedAtFilter: Record<symbol, Date> = {};
      if (filters.updatedAt.gte) updatedAtFilter[Op.gte] = filters.updatedAt.gte;
      if (filters.updatedAt.lte) updatedAtFilter[Op.lte] = filters.updatedAt.lte;
      if (filters.updatedAt.gt) updatedAtFilter[Op.gt] = filters.updatedAt.gt;
      if (filters.updatedAt.lt) updatedAtFilter[Op.lt] = filters.updatedAt.lt;
      if (filters.updatedAt.eq) updatedAtFilter[Op.eq] = filters.updatedAt.eq;
      if (filters.updatedAt.ne) updatedAtFilter[Op.ne] = filters.updatedAt.ne;
      where.updatedAt = updatedAtFilter;
    }

    // Build include for associations (needed for search and organizationId filter)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const include: any[] = [
      {
        association: 'role',
        required: true,
        attributes: fields?.includes('role') ? undefined : ['id', 'name'],
      },
      {
        association: 'environment',
        required: true,
        attributes: fields?.includes('environment') ? undefined : ['id', 'name', 'organizationId'],
        include: [
          {
            association: 'organization',
            required: true,
            attributes: ['id', 'name'],
            where: filters.organizationId ? { id: filters.organizationId } : undefined,
          },
        ],
      },
    ];

    // Add membership association if needed
    include.push({
      association: 'membership',
      required: false,
      attributes: fields?.includes('membership') ? undefined : ['id', 'userId'],
      include: [
        {
          association: 'user',
          required: false,
          attributes: ['id', 'email', 'givenName', 'familyName'],
        },
      ],
    });

    // Add group association if needed
    include.push({
      association: 'group',
      required: false,
      attributes: fields?.includes('group') ? undefined : ['id', 'name'],
    });

    // Build search condition (across associated fields)
    if (search) {
      const searchPattern = `%${search}%`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchConditions: any[] = [];

      // Search in role name
      if (searchFields.includes('role.name')) {
        searchConditions.push({
          '$role.name$': { [Op.iLike]: searchPattern },
        });
      }

      // Search in organization name
      if (searchFields.includes('organization.name')) {
        searchConditions.push({
          '$environment.organization.name$': { [Op.iLike]: searchPattern },
        });
      }

      // Search in environment name
      if (searchFields.includes('environment.name')) {
        searchConditions.push({
          '$environment.name$': { [Op.iLike]: searchPattern },
        });
      }

      if (searchConditions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (where as any)[Op.or] = searchConditions;
      }
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
    }

    // Default sort by createdAt descending
    if (order.length === 0) {
      order.push(['createdAt', 'DESC']);
    }

    // Note: Field selection not applied at SQL level when using includes
    // This avoids Sequelize complexity with nested associations
    // The controller layer can filter fields in the response if needed
    const attributes = undefined; // Always return all fields

    // Execute query
    const { rows, count } = await EnvironmentRoleAssignment.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order,
      attributes,
      distinct: true, // Required when using includes with search
      subQuery: false, // Prevent subquery issues with search
    });

    return { rows, count };
  }
}

EnvironmentRoleAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    environmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'environment_id',
      references: {
        model: 'environment',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    membershipId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'membership_id',
      references: {
        model: 'organization_member',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'group_id',
      references: {
        model: 'group',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_by',
      references: {
        model: 'user',
        key: 'id',
      },
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
    tableName: 'environment_role_assignment',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['environment_id'], where: { deleted_at: null } },
      { fields: ['role_id'], where: { deleted_at: null } },
      { fields: ['membership_id'], where: { membership_id: { [Op.ne]: null }, deleted_at: null } },
      { fields: ['group_id'], where: { group_id: { [Op.ne]: null }, deleted_at: null } },
    ],
    validate: {
      memberOrGroupOnly() {
        if (
          (this.membershipId && this.groupId) ||
          (!this.membershipId && !this.groupId)
        ) {
          throw new Error('Assignment must be to either membership or group, but not both');
        }
      },
    },
  },
);

export default EnvironmentRoleAssignment;
