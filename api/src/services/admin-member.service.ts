/**
 * Admin Member Service
 * Business logic for admin member management operations
 *
 * Separation of concerns:
 * - Admin-specific member operations separated from tenant-scoped member service
 * - All database queries delegated to model static methods (no Op imports)
 */

import { Organization } from '../models/Organization.model';
import { OrganizationMember } from '../models/OrganizationMember.model';
import { Group } from '../models/Group.model';
import { GroupMember } from '../models/GroupMember.model';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import { MEMBER_SORTABLE_FIELDS, MEMBER_SEARCHABLE_FIELDS, MEMBER_STATUS } from '../constants/member.constants';
import logger from '../config/logger';

/**
 * DTO for updating organization member (admin)
 */
export interface UpdateOrganizationMemberDto {
  status: 'invited' | 'active' | 'suspended';
}

/**
 * Filter options for listing organization members
 */
export interface ListOrganizationMembersFilters {
  status?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
    eq?: Date;
    ne?: Date;
  };
  joinedAt?: {
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
export interface ListOrganizationMembersOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListOrganizationMembersFilters;
}

class AdminMemberService {
  // ==================== Organization Members ====================

  /**
   * List all members in an organization with filters, pagination, sorting, and search
   * Delegates all database logic to OrganizationMember model static method
   * @param organizationId - Organization ID
   * @param options - Query options
   * @returns Paginated member list
   * @throws NotFoundError if organization not found
   */
  async listOrganizationMembers(
    organizationId: string,
    options: ListOrganizationMembersOptions
  ): Promise<{ members: OrganizationMember[]; total: number }> {
    logger.debug('Admin: Listing organization members', { organizationId, options });

    // Verify organization exists
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      throw new NotFoundError(ERROR_MESSAGES.ORGANIZATION_NOT_FOUND);
    }

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: members, count: total } = await OrganizationMember.findWithFilters(
      organizationId,
      filters,
      {
        limit,
        offset,
        sort,
        search,
        searchFields: MEMBER_SEARCHABLE_FIELDS as unknown as string[],
        sortableFields: Object.values(MEMBER_SORTABLE_FIELDS) as string[],
        fields,
      }
    );

    logger.debug('Admin: Organization members retrieved', { count: members.length, total });

    return { members, total };
  }

  /**
   * Get organization member by ID
   * @param organizationId - Organization ID
   * @param memberId - Member ID
   * @returns Organization member
   * @throws NotFoundError if organization or member not found
   */
  async getOrganizationMemberById(organizationId: string, memberId: string): Promise<OrganizationMember> {
    logger.debug('Admin: Getting organization member', { organizationId, memberId });

    // Verify organization exists
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      throw new NotFoundError(ERROR_MESSAGES.ORGANIZATION_NOT_FOUND);
    }

    const member = await OrganizationMember.findByIdInOrg(memberId, organizationId);

    if (!member) {
      throw new NotFoundError(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }

    return member;
  }

  /**
   * Update organization member
   * @param organizationId - Organization ID
   * @param memberId - Member ID
   * @param data - Update data
   * @returns Updated member
   * @throws NotFoundError if organization or member not found
   */
  async updateOrganizationMember(
    organizationId: string,
    memberId: string,
    data: UpdateOrganizationMemberDto
  ): Promise<OrganizationMember> {
    logger.debug('Admin: Updating organization member', { organizationId, memberId, data });

    const member = await this.getOrganizationMemberById(organizationId, memberId);

    // Update status
    if (data.status !== undefined) {
      member.status = data.status;

      // If activating an invited member, set joinedAt
      if (data.status === MEMBER_STATUS.ACTIVE && member.joinedAt === null) {
        member.joinedAt = new Date();
      }
    }

    await member.save();

    logger.info('Admin: Organization member updated', { organizationId, memberId });

    // Reload with user data
    const updatedMember = await OrganizationMember.findByIdInOrg(memberId, organizationId);
    return updatedMember!;
  }

  /**
   * Delete organization member (soft delete)
   * @param organizationId - Organization ID
   * @param memberId - Member ID
   * @throws NotFoundError if organization or member not found
   */
  async deleteOrganizationMember(organizationId: string, memberId: string): Promise<void> {
    logger.debug('Admin: Deleting organization member', { organizationId, memberId });

    const member = await this.getOrganizationMemberById(organizationId, memberId);

    await member.destroy();

    logger.info('Admin: Organization member deleted', { organizationId, memberId });
  }

  // ==================== Group Members ====================

  /**
   * List all members in a group with pagination
   * @param groupId - Group ID
   * @param limit - Page size
   * @param offset - Page offset
   * @returns Paginated group member list
   * @throws NotFoundError if group not found
   */
  async listGroupMembers(
    groupId: string,
    limit = 20,
    offset = 0
  ): Promise<{ members: GroupMember[]; total: number }> {
    logger.debug('Admin: Listing group members', { groupId, limit, offset });

    // Verify group exists
    const group = await Group.findByPk(groupId);
    if (!group) {
      throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
    }

    // Delegate to model's static method
    const { rows: members, count: total } = await GroupMember.findByGroupWithUsers(groupId, limit, offset);

    logger.debug('Admin: Group members retrieved', { count: members.length, total });

    return { members, total };
  }

  /**
   * Add member to group
   * @param groupId - Group ID
   * @param userId - User ID
   * @returns Created group member
   * @throws NotFoundError if group not found
   * @throws ConflictError if member already exists in group
   */
  async addGroupMember(groupId: string, userId: string): Promise<GroupMember> {
    logger.debug('Admin: Adding member to group', { groupId, userId });

    // Verify group exists
    const group = await Group.findByPk(groupId);
    if (!group) {
      throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
    }

    // Check if member already exists
    const existing = await GroupMember.findByGroupAndUser(groupId, userId);
    if (existing) {
      throw new ConflictError(ERROR_MESSAGES.GROUP_MEMBER_EXISTS);
    }

    // Create group member
    const member = await GroupMember.create({
      groupId,
      userId,
      addedBy: null, // Admin action, no specific user
    });

    logger.info('Admin: Member added to group', { groupId, userId, memberId: member.id });

    // Reload with user data
    const { User } = await import('../models/User.model');
    const memberWithUser = await GroupMember.findByPk(member.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'givenName', 'familyName'],
        },
      ],
    });

    return memberWithUser!;
  }

  /**
   * Remove member from group
   * @param groupId - Group ID
   * @param userId - User ID
   * @throws NotFoundError if group or member not found
   */
  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    logger.debug('Admin: Removing member from group', { groupId, userId });

    // Verify group exists
    const group = await Group.findByPk(groupId);
    if (!group) {
      throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
    }

    // Find and delete member
    const member = await GroupMember.findByGroupAndUser(groupId, userId);
    if (!member) {
      throw new NotFoundError(ERROR_MESSAGES.GROUP_MEMBER_NOT_FOUND);
    }

    await member.destroy();

    logger.info('Admin: Member removed from group', { groupId, userId });
  }
}

export default new AdminMemberService();
