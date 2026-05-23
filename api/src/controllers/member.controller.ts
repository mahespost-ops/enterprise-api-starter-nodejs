/**
 * Member Controller
 * Handles HTTP request/response for organization member operations
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import memberService from '../services/member.service';
import impersonationService from '../services/impersonation.service';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import logger from '../config/logger';

/**
 * @desc    List organization members
 * @route   GET /api/v1/orgs/:orgId/members
 * @access  Private (requires members:read permission)
 */
export const listMembers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
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
  const orgId = req.params.orgId as string;
  const memberId = req.params.memberId as string;

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
  const orgId = req.params.orgId as string;
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
  const orgId = req.params.orgId as string;
  const memberId = req.params.memberId as string;

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
  const orgId = req.params.orgId as string;
  const memberId = req.params.memberId as string;

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
    const orgId = req.params.orgId as string;
    const memberId = req.params.memberId as string;

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
    const orgId = req.params.orgId as string;
    const memberId = req.params.memberId as string;

    logger.debug(`Getting permissions for member: ${memberId}`);

    const result = await memberService.getMemberPermissions(memberId, orgId);

    res.status(HTTP_STATUS.OK).json(result);
  }
);

/**
 * @desc    Start org-scoped impersonation
 * @route   POST /api/v1/orgs/:orgId/members/:memberId/impersonate
 * @access  Private (requires members:impersonate permission)
 */
export const startImpersonation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const orgId = req.params.orgId as string;
    const memberId = req.params.memberId as string;
    const { reason, expiresInMinutes, environmentId } = req.body;
    const originalUserId = req.user!.sub;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    logger.debug(`Starting impersonation for member: ${memberId} by user: ${originalUserId}`);

    // Verify member exists and get their userId
    const member = await memberService.getMemberById(memberId, orgId);
    const impersonatedUserId = member.userId;

    // Use provided environmentId or default to user's current environment
    const targetEnvId = environmentId || req.user!.envId;

    // Start organization impersonation
    const result = await impersonationService.startOrganizationImpersonation({
      originalUserId,
      impersonatedUserId,
      impersonationType: 'organization',
      reason,
      expiresInMinutes,
      environmentId: targetEnvId,
      ipAddress,
      userAgent,
    });

    res.status(HTTP_STATUS.CREATED).json(result);
  }
);

/**
 * @desc    End org-scoped impersonation
 * @route   DELETE /api/v1/orgs/:orgId/members/:memberId/impersonate
 * @access  Private (currently impersonating)
 */
export const endImpersonation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const orgId = req.params.orgId as string;
    const memberId = req.params.memberId as string;
    const impersonation = req.user?.impersonation;

    logger.debug(`Ending impersonation for member: ${memberId}`);

    // Verify currently impersonating
    if (!impersonation) {
      throw new ForbiddenError(ERROR_MESSAGES.NOT_CURRENTLY_IMPERSONATING);
    }

    // SECURITY: Verify member exists
    const member = await memberService.getMemberById(memberId, orgId);

    // SECURITY: Verify we're actually impersonating THIS member (not someone else)
    if (member.userId !== impersonation.effectiveUserId) {
      throw new NotFoundError(ERROR_MESSAGES.IMPERSONATION_SESSION_NOT_FOUND);
    }

    // Get session ID from impersonation chain
    const sessionId = impersonation.impersonationChain[0]?.sessionId;
    if (!sessionId) {
      throw new NotFoundError(ERROR_MESSAGES.IMPERSONATION_SESSION_NOT_FOUND);
    }

    // End the impersonation session
    const result = await impersonationService.endImpersonation(
      sessionId,
      impersonation.originalUserId
    );

    res.status(HTTP_STATUS.OK).json(result);
  }
);

/**
 * @desc    Get impersonation status
 * @route   GET /api/v1/orgs/:orgId/members/:memberId/impersonate
 * @access  Private (requires members:impersonate permission)
 */
export const getImpersonationStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const orgId = req.params.orgId as string;
    const memberId = req.params.memberId as string;
    const isImpersonating = req.user?.impersonation !== undefined;

    logger.debug(`Getting impersonation status for member: ${memberId}`);

    // SECURITY: Verify member exists before revealing impersonation status
    const member = await memberService.getMemberById(memberId, orgId);

    // SECURITY: Verify we're actually impersonating THIS member (not someone else)
    if (isImpersonating) {
      const effectiveUserId = req.user!.impersonation!.effectiveUserId;
      if (member.userId !== effectiveUserId) {
        // Currently impersonating, but not this member
        res.status(HTTP_STATUS.OK).json({
          isImpersonating: false,
          originalUserId: null,
          effectiveUserId: null,
          impersonationType: null,
        });
        return;
      }
    }

    res.status(HTTP_STATUS.OK).json({
      isImpersonating,
      originalUserId: isImpersonating ? req.user!.impersonation!.originalUserId : null,
      effectiveUserId: isImpersonating ? req.user!.impersonation!.effectiveUserId : null,
      impersonationType: isImpersonating
        ? req.user!.impersonation!.impersonationChain[0]?.impersonationType
        : null,
    });
  }
);
