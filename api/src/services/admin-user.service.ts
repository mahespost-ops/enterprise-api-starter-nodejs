/**
 * Admin User Service
 * Business logic for admin user management operations
 *
 * Separation of concerns: Admin-specific user operations separated from tenant-scoped user service
 */

import { Op } from 'sequelize';
import { User } from '../models/User.model';
import { OrganizationMember } from '../models/OrganizationMember.model';
import { NotFoundError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import { USER_SORTABLE_FIELDS, USER_SEARCHABLE_FIELDS } from '../constants/user.constants';
import logger from '../config/logger';

/**
 * DTO for updating user (admin)
 */
export interface UpdateUserDto {
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string | null;
  picture?: string | null;
  locale?: string | null;
  isActive?: boolean;
}

/**
 * Filter options for listing users
 */
export interface ListUsersFilters {
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
}

/**
 * Pagination and query options for list
 */
export interface ListUsersOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListUsersFilters;
}

class AdminUserService {
  /**
   * List all users with filters, pagination, sorting, and search
   * @param options - Query options
   * @returns Paginated user list
   */
  async listUsers(options: ListUsersOptions): Promise<{ users: User[]; total: number }> {
    logger.debug('Admin: Listing users', { options });

    const {
      limit = 20,
      offset = 0,
      sort = '-createdAt',
      search,
      fields,
      filters = {},
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
      where[Op.or] = USER_SEARCHABLE_FIELDS.map((field) => ({
        [field]: { [Op.iLike]: searchPattern },
      }));
    }

    // Parse sort parameter
    const order: [string, string][] = [];
    if (sort) {
      const sortFields = sort.split(',');
      const validSortFields = Object.values(USER_SORTABLE_FIELDS) as string[];
      for (const field of sortFields) {
        if (field.startsWith('-')) {
          const fieldName = field.substring(1);
          if (validSortFields.includes(fieldName)) {
            order.push([fieldName, 'DESC']);
          }
        } else {
          if (validSortFields.includes(field)) {
            order.push([field, 'ASC']);
          }
        }
      }
    }

    // Field selection
    const attributes = fields && fields.length > 0 ? fields : undefined;

    // Execute query
    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: order.length > 0 ? order : [['createdAt', 'DESC']],
      attributes,
    });

    logger.info(`Admin: Listed ${users.length} users (total: ${total})`);
    return { users, total };
  }

  /**
   * Get user by ID
   * @param userId - User UUID
   * @returns User object
   * @throws NotFoundError if user not found
   */
  async getUserById(userId: string): Promise<User> {
    logger.debug(`Admin: Getting user: ${userId}`);

    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  /**
   * Update user
   * @param userId - User UUID
   * @param updateData - Update DTO
   * @returns Updated user
   * @throws NotFoundError if user not found
   */
  async updateUser(userId: string, updateData: UpdateUserDto): Promise<User> {
    logger.info(`Admin: Updating user: ${userId}`, { updateData });

    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Update fields
    if (updateData.email !== undefined) user.email = updateData.email;
    if (updateData.name !== undefined) {
      // Split name into givenName and familyName if provided
      const names = updateData.name.trim().split(/\s+/);
      if (names.length === 1) {
        user.givenName = names[0];
        user.familyName = '';
      } else {
        user.givenName = names[0];
        user.familyName = names.slice(1).join(' ');
      }
    }
    if (updateData.givenName !== undefined) user.givenName = updateData.givenName;
    if (updateData.familyName !== undefined) user.familyName = updateData.familyName;
    if (updateData.phoneNumber !== undefined) user.phoneNumber = updateData.phoneNumber;
    if (updateData.picture !== undefined) user.picture = updateData.picture;
    if (updateData.locale !== undefined) user.locale = updateData.locale;
    if (updateData.isActive !== undefined) user.isActive = updateData.isActive;

    await user.save();

    logger.info(`Admin: Updated user: ${userId}`);
    return user;
  }

  /**
   * Delete user (soft delete)
   * @param userId - User UUID
   * @throws NotFoundError if user not found
   */
  async deleteUser(userId: string): Promise<void> {
    logger.info(`Admin: Deleting user: ${userId}`);

    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Soft delete (paranoid mode)
    await user.destroy();

    logger.info(`Admin: Deleted user: ${userId}`);
  }
}

export default new AdminUserService();
