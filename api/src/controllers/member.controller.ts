/**
 * Member Controller
 * Handles HTTP request/response for organization member operations
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import memberService from '../services/member.service';
import logger from '../config/logger';

/**
 * @desc    List organization members
 * @route   GET /api/v1/orgs/:orgId/members
 * @access  Private (requires members:read permission)
 */
export const listMembers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId } = req.params;
  const { limit = 20, offset = 0, 'filter[status]': status } = req.query;

  logger.debug(`Listing members for organization: ${orgId}`);

  const filters = {
    status: status as string | undefined,
  };

  const { members, total } = await memberService.listMembers(
    orgId,
    filters,
    Number(limit),
    Number(offset)
  );

  res.status(HTTP_STATUS.OK).json({
    data: members.map((member) => ({
      id: member.id,
      userId: member.userId,
      organizationId: member.organizationId,
      status: member.status,
      invitedBy: member.invitedBy,
      joinedAt: member.joinedAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      // Security: Never expose invitationToken or invitationExpiresAt
    })),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
    },
  });
});

/**
 * @desc    Get member details
 * @route   GET /api/v1/orgs/:orgId/members/:memberId
 * @access  Private (requires members:read permission)
 */
export const getMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, memberId } = req.params;

  logger.debug(`Getting member: ${memberId}`);

  const member = await memberService.getMemberById(memberId, orgId);

  res.status(HTTP_STATUS.OK).json({
    id: member.id,
    userId: member.userId,
    organizationId: member.organizationId,
    status: member.status,
    invitedBy: member.invitedBy,
    joinedAt: member.joinedAt,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  });
});

/**
 * @desc    Invite member to organization
 * @route   POST /api/v1/orgs/:orgId/members
 * @access  Private (requires members:invite permission)
 */
export const inviteMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId } = req.params;
  const userId = req.user!.sub;

  logger.debug(`Inviting member to organization: ${orgId}`);

  const member = await memberService.inviteMember(orgId, req.body, userId);

  res.status(HTTP_STATUS.CREATED).json({
    id: member.id,
    userId: member.userId,
    organizationId: member.organizationId,
    status: member.status,
    invitedBy: member.invitedBy,
    joinedAt: member.joinedAt,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  });
});

/**
 * @desc    Update member
 * @route   PUT /api/v1/orgs/:orgId/members/:memberId
 * @access  Private (requires members:write permission)
 */
export const updateMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, memberId } = req.params;

  logger.debug(`Updating member: ${memberId}`);

  const member = await memberService.updateMember(memberId, orgId, req.body);

  res.status(HTTP_STATUS.OK).json({
    id: member.id,
    userId: member.userId,
    organizationId: member.organizationId,
    status: member.status,
    invitedBy: member.invitedBy,
    joinedAt: member.joinedAt,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  });
});

/**
 * @desc    Remove member from organization
 * @route   DELETE /api/v1/orgs/:orgId/members/:memberId
 * @access  Private (requires members:delete permission)
 */
export const removeMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orgId, memberId } = req.params;

  logger.debug(`Removing member: ${memberId}`);

  await memberService.removeMember(memberId, orgId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});

/**
 * @desc    Get member's organizations
 * @route   GET /api/v1/orgs/:orgId/members/:memberId/organizations
 * @access  Private (requires members:read permission)
 */
export const getMemberOrganizations = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, memberId } = req.params;

    logger.debug(`Getting organizations for member: ${memberId}`);

    const organizations = await memberService.getMemberOrganizations(memberId, orgId);

    res.status(HTTP_STATUS.OK).json({
      data: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        isActive: org.isActive,
      })),
    });
  }
);

/**
 * @desc    Get member's permissions
 * @route   GET /api/v1/orgs/:orgId/members/:memberId/permissions
 * @access  Private (requires members:read permission)
 */
export const getMemberPermissions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, memberId } = req.params;

    logger.debug(`Getting permissions for member: ${memberId}`);

    const result = await memberService.getMemberPermissions(memberId, orgId);

    res.status(HTTP_STATUS.OK).json(result);
  }
);

/**
 * @desc    Start org-scoped impersonation
 * @route   POST /api/v1/orgs/:orgId/envs/:envId/members/:memberId/impersonate
 * @access  Private (requires members:impersonate permission)
 */
export const startImpersonation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { memberId } = req.params;

    logger.debug(`Starting impersonation for member: ${memberId}`);

    // TODO: Implement impersonation logic
    // For now, return placeholder response
    res.status(HTTP_STATUS.OK).json({
      token: 'placeholder-impersonation-token',
      impersonationChain: [],
    });
  }
);

/**
 * @desc    End org-scoped impersonation
 * @route   DELETE /api/v1/orgs/:orgId/envs/:envId/members/:memberId/impersonate
 * @access  Private (currently impersonating)
 */
export const endImpersonation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { memberId } = req.params;

    logger.debug(`Ending impersonation for member: ${memberId}`);

    // TODO: Implement end impersonation logic
    res.status(HTTP_STATUS.OK).json({
      token: 'placeholder-restored-token',
    });
  }
);

/**
 * @desc    Get impersonation status
 * @route   GET /api/v1/orgs/:orgId/envs/:envId/members/:memberId/impersonate
 * @access  Private (requires members:impersonate permission)
 */
export const getImpersonationStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { memberId } = req.params;
    const isImpersonating = req.user?.impersonation !== undefined;

    logger.debug(`Getting impersonation status for member: ${memberId}`);

    res.status(HTTP_STATUS.OK).json({
      isImpersonating,
      impersonationChain: req.user?.impersonation?.impersonationChain || undefined,
    });
  }
);
