/**
 * Admin Group Service
 * Business logic for admin group management operations
 *
 * Separation of concerns:
 * - Admin-specific group operations separated from tenant-scoped group service
 * - All database queries delegated to model static methods (no Op imports)
 */

import { Group } from '../models/Group.model';
import { NotFoundError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import { GROUP_SORTABLE_FIELDS, GROUP_SEARCHABLE_FIELDS } from '../constants/group.constants';
import logger from '../config/logger';

/**
 * DTO for updating group (admin)
 */
export interface UpdateGroupDto {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

/**
 * Filter options for listing groups
 */
export interface ListGroupsFilters {
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
}

/**
 * Pagination and query options for list
 */
export interface ListGroupsOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListGroupsFilters;
}

class AdminGroupService {
  /**
   * List all groups with filters, pagination, sorting, and search
   * Delegates all database logic to Group model static method
   * @param options - Query options
   * @returns Paginated group list
   */
  async listGroups(options: ListGroupsOptions): Promise<{ groups: Group[]; total: number }> {
    logger.debug('Admin: Listing groups', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: groups, count: total } = await Group.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: GROUP_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: Object.values(GROUP_SORTABLE_FIELDS) as string[],
      fields,
    });

    logger.debug('Admin: Groups retrieved', { count: groups.length, total });

    return { groups, total };
  }

  /**
   * Get group by ID
   * @param groupId - Group ID
   * @returns Group
   * @throws NotFoundError if group not found
   */
  async getGroupById(groupId: string): Promise<Group> {
    logger.debug('Admin: Getting group', { groupId });

    const group = await Group.findByPk(groupId);

    if (!group) {
      throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
    }

    return group;
  }

  /**
   * Update group
   * @param groupId - Group ID
   * @param data - Update data
   * @returns Updated group
   * @throws NotFoundError if group not found
   */
  async updateGroup(groupId: string, data: UpdateGroupDto): Promise<Group> {
    logger.debug('Admin: Updating group', { groupId, data });

    const group = await this.getGroupById(groupId);

    // Update fields
    if (data.name !== undefined) group.name = data.name;
    if (data.description !== undefined) group.description = data.description;
    if (data.isActive !== undefined) group.isActive = data.isActive;

    await group.save();

    logger.info('Admin: Group updated', { groupId });

    return group;
  }

  /**
   * Delete group (soft delete)
   * @param groupId - Group ID
   * @throws NotFoundError if group not found
   */
  async deleteGroup(groupId: string): Promise<void> {
    logger.debug('Admin: Deleting group', { groupId });

    const group = await this.getGroupById(groupId);

    await group.destroy();

    logger.info('Admin: Group deleted', { groupId });
  }
}

export default new AdminGroupService();
