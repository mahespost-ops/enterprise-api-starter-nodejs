/**
 * Group Controller
 * Handles HTTP request/response for group management operations
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import groupService from '../services/group.service';
import logger from '../config/logger';

/**
 * @desc    List groups
 * @route   GET /api/v1/orgs/:orgId/groups
 * @access  Private (requires groups:read permission)
 */
export const listGroups = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  const {
    limit = 20,
    offset = 0,
    'filter[parentGroupId]': parentGroupId,
    'filter[isActive]': isActive,
  } = req.query;

  logger.debug(`Listing groups for organization: ${orgId}`);

  const filters = {
    parentGroupId: parentGroupId as string | undefined,
    isActive: isActive ? isActive === 'true' : undefined,
  };

  const { groups, total } = await groupService.listGroups(
    orgId,
    filters,
    Number(limit),
    Number(offset)
  );

  res.status(HTTP_STATUS.OK).json({
    data: groups.map((group) => ({
      id: group.id,
      organizationId: group.organizationId,
      name: group.name,
      description: group.description,
      parentId: group.parentId,
      hierarchyLevel: group.hierarchyLevel,
      metadata: group.metadata,
      memberCount: group.memberCount,
      isActive: group.isActive,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    })),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
    },
  });
});

/**
 * @desc    Get group details
 * @route   GET /api/v1/orgs/:orgId/groups/:groupId
 * @access  Private (requires groups:read permission)
 */
export const getGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  const groupId = req.params.groupId as string;

  logger.debug(`Getting group: ${groupId}`);

  const group = await groupService.getGroupById(groupId, orgId);

  res.status(HTTP_STATUS.OK).json({
    id: group.id,
    organizationId: group.organizationId,
    name: group.name,
    description: group.description,
    parentId: group.parentId,
    hierarchyLevel: group.hierarchyLevel,
    metadata: group.metadata,
    memberCount: group.memberCount,
    isActive: group.isActive,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  });
});

/**
 * @desc    Create group
 * @route   POST /api/v1/orgs/:orgId/groups
 * @access  Private (requires groups:create permission)
 */
export const createGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;

  logger.debug(`Creating group in organization: ${orgId}`);

  const group = await groupService.createGroup(orgId, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    id: group.id,
    organizationId: group.organizationId,
    name: group.name,
    description: group.description,
    parentId: group.parentId,
    hierarchyLevel: group.hierarchyLevel,
    metadata: group.metadata,
    memberCount: group.memberCount,
    isActive: group.isActive,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  });
});

/**
 * @desc    Update group
 * @route   PUT /api/v1/orgs/:orgId/groups/:groupId
 * @access  Private (requires groups:write permission)
 */
export const updateGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  const groupId = req.params.groupId as string;
  

  logger.debug(`Updating group: ${groupId}`);

  const group = await groupService.updateGroup(groupId, orgId, req.body);

  res.status(HTTP_STATUS.OK).json({
    id: group.id,
    organizationId: group.organizationId,
    name: group.name,
    description: group.description,
    parentId: group.parentId,
    hierarchyLevel: group.hierarchyLevel,
    metadata: group.metadata,
    memberCount: group.memberCount,
    isActive: group.isActive,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  });
});

/**
 * @desc    Delete group
 * @route   DELETE /api/v1/orgs/:orgId/groups/:groupId
 * @access  Private (requires groups:delete permission)
 */
export const deleteGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  const groupId = req.params.groupId as string;

  logger.debug(`Deleting group: ${groupId}`);

  await groupService.deleteGroup(groupId, orgId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});

/**
 * @desc    List group members
 * @route   GET /api/v1/orgs/:orgId/groups/:groupId/members
 * @access  Private (requires groups:read permission)
 */
export const listGroupMembers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  const groupId = req.params.groupId as string;
  const { limit = 20, offset = 0 } = req.query;

  logger.debug(`Listing members for group: ${groupId}`);

  const { members, total } = await groupService.listGroupMembers(
    groupId,
    orgId,
    Number(limit),
    Number(offset)
  );

  res.status(HTTP_STATUS.OK).json({
    data: members.map((member) => ({
      id: member.id,
      groupId: member.groupId,
      userId: member.userId,
      addedBy: member.addedBy,
      createdAt: member.createdAt,
    })),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
    },
  });
});

/**
 * @desc    Add member to group
 * @route   POST /api/v1/orgs/:orgId/groups/:groupId/members
 * @access  Private (requires groups:manage_members permission)
 */
export const addGroupMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  const groupId = req.params.groupId as string;
  //const userId = req.body.userId as string;
  
  const { userId } = req.body;
  const addedBy = req.user!.sub;

  logger.debug(`Adding member to group: ${groupId}`);

  const member = await groupService.addGroupMember(groupId, orgId, userId, addedBy);

  res.status(HTTP_STATUS.CREATED).json({
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    addedBy: member.addedBy,
    createdAt: member.createdAt,
  });
});

/**
 * @desc    Remove member from group
 * @route   DELETE /api/v1/orgs/:orgId/groups/:groupId/members/:userId
 * @access  Private (requires groups:manage_members permission)
 */
export const removeGroupMember = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const orgId = req.params.orgId as string;
    const groupId = req.params.groupId as string;
    const userId = req.params.userId as string;
    

    logger.debug(`Removing member from group: ${groupId}`);

    await groupService.removeGroupMember(groupId, orgId, userId);

    res.status(HTTP_STATUS.NO_CONTENT).send();
  }
);

/**
 * @desc    Get child groups
 * @route   GET /api/v1/orgs/:orgId/groups/:groupId/children
 * @access  Private (requires groups:read permission)
 */
export const getChildGroups = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  const groupId = req.params.groupId as string;
  const { limit = 20, offset = 0 } = req.query;

  logger.debug(`Getting child groups for: ${groupId}`);

  const { groups, total } = await groupService.getChildGroups(
    groupId,
    orgId,
    Number(limit),
    Number(offset)
  );

  res.status(HTTP_STATUS.OK).json({
    data: groups.map((group) => ({
      id: group.id,
      organizationId: group.organizationId,
      name: group.name,
      description: group.description,
      parentId: group.parentId,
      hierarchyLevel: group.hierarchyLevel,
      metadata: group.metadata,
      memberCount: group.memberCount,
      isActive: group.isActive,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    })),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
    },
  });
});
