/**
 * Group Service
 * Business logic for hierarchical group management
 */

import { Group } from '../models/Group.model';
import { GroupMember } from '../models/GroupMember.model';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import logger from '../config/logger';
import { Op } from 'sequelize';

interface ListGroupsFilters {
  parentGroupId?: string | null;
  hierarchyLevel?: number;
  isActive?: boolean;
  createdAtGte?: Date;
  createdAtLte?: Date;
}

interface CreateGroupDto {
  name: string;
  description?: string | null;
  parentGroupId?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface UpdateGroupDto {
  name?: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
}

class GroupService {
  /**
   * List groups with optional filtering
   */
  async listGroups(
    organizationId: string,
    filters: ListGroupsFilters = {},
    limit = 20,
    offset = 0
  ): Promise<{ groups: Group[]; total: number }> {
    logger.debug(`Listing groups for organization: ${organizationId}`);

    const where: any = { organizationId };

    if (filters.parentGroupId !== undefined) {
      where.parentId = filters.parentGroupId;
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

    const { count, rows } = await Group.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    logger.debug(`Found ${count} groups`);
    return { groups: rows, total: count };
  }

  /**
   * Get group by ID
   */
  async getGroupById(groupId: string, organizationId: string): Promise<Group> {
    logger.debug(`Finding group: ${groupId} in org: ${organizationId}`);

    const group = await Group.findOne({
      where: {
        id: groupId,
        organizationId,
      },
    });

    if (!group) {
      throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
    }

    return group;
  }

  /**
   * Create new group
   */
  async createGroup(
    organizationId: string,
    groupData: CreateGroupDto
  ): Promise<Group> {
    logger.info(`Creating group ${groupData.name} in org: ${organizationId}`);

    // Calculate hierarchy level if parent is specified
    let hierarchyLevel = 0;
    if (groupData.parentGroupId) {
      const parentGroup = await this.getGroupById(groupData.parentGroupId, organizationId);
      hierarchyLevel = parentGroup.hierarchyLevel + 1;
    }

    const group = await Group.create({
      organizationId,
      name: groupData.name,
      description: groupData.description,
      parentId: groupData.parentGroupId,
      hierarchyLevel,
      metadata: groupData.metadata,
      isActive: true,
    });

    logger.info(`Group created: ${group.id}`);
    return group;
  }

  /**
   * Update group
   */
  async updateGroup(
    groupId: string,
    organizationId: string,
    updateData: UpdateGroupDto
  ): Promise<Group> {
    logger.info(`Updating group: ${groupId}`);

    const group = await this.getGroupById(groupId, organizationId);

    // Update fields
    if (updateData.name !== undefined) {
      group.name = updateData.name;
    }
    if (updateData.description !== undefined) {
      group.description = updateData.description;
    }
    if (updateData.metadata !== undefined) {
      group.metadata = updateData.metadata;
    }
    if (updateData.isActive !== undefined) {
      group.isActive = updateData.isActive;
    }

    await group.save();

    logger.info(`Group updated: ${group.id}`);
    return group;
  }

  /**
   * Delete group
   */
  async deleteGroup(groupId: string, organizationId: string): Promise<void> {
    logger.info(`Deleting group: ${groupId} from org: ${organizationId}`);

    const group = await this.getGroupById(groupId, organizationId);
    await group.destroy();

    logger.info(`Group deleted: ${groupId}`);
  }

  /**
   * List group members
   */
  async listGroupMembers(
    groupId: string,
    organizationId: string,
    limit = 20,
    offset = 0
  ): Promise<{ members: GroupMember[]; total: number }> {
    logger.debug(`Listing members for group: ${groupId}`);

    // Verify group exists in this organization
    await this.getGroupById(groupId, organizationId);

    const { count, rows } = await GroupMember.findAndCountAll({
      where: { groupId },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    logger.debug(`Found ${count} group members`);
    return { members: rows, total: count };
  }

  /**
   * Add member to group
   */
  async addGroupMember(
    groupId: string,
    organizationId: string,
    userId: string,
    addedBy: string
  ): Promise<GroupMember> {
    logger.info(`Adding user ${userId} to group: ${groupId}`);

    // Verify group exists
    await this.getGroupById(groupId, organizationId);

    // Check if user is already a member
    const existingMember = await GroupMember.findOne({
      where: {
        groupId,
        userId,
      },
    });

    if (existingMember) {
      throw new ConflictError('User is already a member of this group');
    }

    const member = await GroupMember.create({
      groupId,
      userId,
      addedBy,
    });

    // Increment member count on group
    await Group.increment('memberCount', {
      where: { id: groupId },
    });

    logger.info(`Group member added: ${member.id}`);
    return member;
  }

  /**
   * Remove member from group
   */
  async removeGroupMember(
    groupId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    logger.info(`Removing user ${userId} from group: ${groupId}`);

    // Verify group exists
    await this.getGroupById(groupId, organizationId);

    const member = await GroupMember.findOne({
      where: {
        groupId,
        userId,
      },
    });

    if (!member) {
      throw new NotFoundError(ERROR_MESSAGES.GROUP_MEMBER_NOT_FOUND);
    }

    await member.destroy();

    // Decrement member count on group
    await Group.decrement('memberCount', {
      where: { id: groupId },
    });

    logger.info(`Group member removed from group: ${groupId}`);
  }

  /**
   * Get child groups
   */
  async getChildGroups(
    groupId: string,
    organizationId: string,
    limit = 20,
    offset = 0
  ): Promise<{ groups: Group[]; total: number }> {
    logger.debug(`Getting child groups for: ${groupId}`);

    // Verify parent group exists
    await this.getGroupById(groupId, organizationId);

    const { count, rows } = await Group.findAndCountAll({
      where: {
        organizationId,
        parentId: groupId,
      },
      limit,
      offset,
      order: [['hierarchyLevel', 'ASC'], ['name', 'ASC']],
    });

    logger.debug(`Found ${count} child groups`);
    return { groups: rows, total: count };
  }
}

export const groupService = new GroupService();
export default groupService;
