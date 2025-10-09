/**
 * Admin User Service
 * Business logic for admin user management operations
 *
 * Separation of concerns:
 * - Admin-specific user operations separated from tenant-scoped user service
 * - All database queries delegated to model static methods (no Op imports)
 */

import { User } from '../models/User.model';
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
   * Delegates all database logic to User model static method
   * @param options - Query options
   * @returns Paginated user list
   */
  async listUsers(options: ListUsersOptions): Promise<{ users: User[]; total: number }> {
    logger.debug('Admin: Listing users', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: users, count: total } = await User.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: USER_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: Object.values(USER_SORTABLE_FIELDS) as string[],
      fields,
    });

    logger.debug('Admin: Users retrieved', { count: users.length, total });

    return { users, total };
  }

  /**
   * Get user by ID
   * @param userId - User ID
   * @returns User
   * @throws NotFoundError if user not found
   */
  async getUserById(userId: string): Promise<User> {
    logger.debug('Admin: Getting user', { userId });

    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  /**
   * Update user
   * @param userId - User ID
   * @param data - Update data
   * @returns Updated user
   * @throws NotFoundError if user not found
   */
  async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
    logger.debug('Admin: Updating user', { userId, data });

    const user = await this.getUserById(userId);

    // Update fields
    if (data.email !== undefined) user.email = data.email;
    if (data.givenName !== undefined) user.givenName = data.givenName;
    if (data.familyName !== undefined) user.familyName = data.familyName;
    if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber;
    if (data.picture !== undefined) user.picture = data.picture;
    if (data.locale !== undefined) user.locale = data.locale;
    if (data.isActive !== undefined) user.isActive = data.isActive;

    await user.save();

    logger.info('Admin: User updated', { userId });

    return user;
  }

  /**
   * Delete user (soft delete)
   * @param userId - User ID
   * @throws NotFoundError if user not found
   */
  async deleteUser(userId: string): Promise<void> {
    logger.debug('Admin: Deleting user', { userId });

    const user = await this.getUserById(userId);

    await user.destroy();

    logger.info('Admin: User deleted', { userId });
  }
}

export default new AdminUserService();
