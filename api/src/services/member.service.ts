/**
 * Member Service
 * Business logic for organization member management
 */

import { OrganizationMember } from '../models/OrganizationMember.model';
import { User } from '../models/User.model';
import { Organization } from '../models/Organization.model';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import logger from '../config/logger';
import { Op } from 'sequelize';

interface ListMembersFilters {
  status?: string;
  createdAtGte?: Date;
  createdAtLte?: Date;
  joinedAtGte?: Date;
  joinedAtLte?: Date;
}

interface InviteMemberDto {
  email: string;
  displayName: string;
}

interface UpdateMemberDto {
  status: 'invited' | 'active' | 'suspended';
}

class MemberService {
  /**
   * List organization members with optional filtering
   */
  async listMembers(
    organizationId: string,
    filters: ListMembersFilters = {},
    limit = 20,
    offset = 0
  ): Promise<{ members: OrganizationMember[]; total: number }> {
    logger.debug(`Listing members for organization: ${organizationId}`);

    const where: any = { organizationId };

    if (filters.status) {
      where.status = filters.status;
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

    if (filters.joinedAtGte || filters.joinedAtLte) {
      where.joinedAt = {};
      if (filters.joinedAtGte) {
        where.joinedAt[Op.gte] = filters.joinedAtGte;
      }
      if (filters.joinedAtLte) {
        where.joinedAt[Op.lte] = filters.joinedAtLte;
      }
    }

    const { count, rows } = await OrganizationMember.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'givenName', 'familyName'],
        },
      ],
    });

    logger.debug(`Found ${count} members`);
    return { members: rows, total: count };
  }

  /**
   * Get member by ID
   */
  async getMemberById(memberId: string, organizationId: string): Promise<OrganizationMember> {
    logger.debug(`Finding member: ${memberId} in org: ${organizationId}`);

    const member = await OrganizationMember.findOne({
      where: {
        id: memberId,
        organizationId,
      },
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'givenName', 'familyName'],
        },
      ],
    });

    if (!member) {
      throw new NotFoundError(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }

    return member;
  }

  /**
   * Invite member to organization
   * Creates user if they don't exist, then creates member with 'invited' status
   */
  async inviteMember(
    organizationId: string,
    inviteData: InviteMemberDto,
    invitedBy: string
  ): Promise<OrganizationMember> {
    logger.info(`Inviting member ${inviteData.email} to org: ${organizationId}`);

    // Check if user already exists
    let user = await User.findOne({ where: { email: inviteData.email } });

    if (!user) {
      // Create new user
      const [givenName, ...familyNameParts] = inviteData.displayName.split(' ');
      user = await User.create({
        email: inviteData.email,
        givenName: givenName || inviteData.displayName,
        familyName: familyNameParts.join(' ') || '',
        emailVerified: false,
        isActive: false, // User not active until they accept invitation
      });
      logger.info(`Created new user: ${user.id}`);
    }

    // Check if user is already a member
    const existingMember = await OrganizationMember.findOne({
      where: {
        userId: user.id,
        organizationId,
      },
    });

    if (existingMember) {
      throw new ConflictError('User is already a member of this organization');
    }

    // Create member with invited status
    const member = await OrganizationMember.create({
      userId: user.id,
      organizationId,
      status: 'invited',
      invitedBy,
      // invitationToken and invitationExpiresAt should be generated here
      // TODO: Implement invitation token generation
    });

    logger.info(`Member created: ${member.id}`);
    return member;
  }

  /**
   * Update member
   */
  async updateMember(
    memberId: string,
    organizationId: string,
    updateData: UpdateMemberDto
  ): Promise<OrganizationMember> {
    logger.info(`Updating member: ${memberId}`);

    const member = await this.getMemberById(memberId, organizationId);

    // Update fields
    if (updateData.status) {
      member.status = updateData.status;

      // If activating, set joinedAt if not already set
      if (updateData.status === 'active' && !member.joinedAt) {
        member.joinedAt = new Date();
      }
    }

    await member.save();

    logger.info(`Member updated: ${member.id}`);
    return member;
  }

  /**
   * Remove member from organization
   */
  async removeMember(memberId: string, organizationId: string): Promise<void> {
    logger.info(`Removing member: ${memberId} from org: ${organizationId}`);

    const member = await this.getMemberById(memberId, organizationId);
    await member.destroy();

    logger.info(`Member removed: ${memberId}`);
  }

  /**
   * Get organizations for a member
   */
  async getMemberOrganizations(memberId: string, organizationId: string): Promise<Organization[]> {
    logger.debug(`Finding organizations for member: ${memberId}`);

    // First verify member exists in this org
    const member = await this.getMemberById(memberId, organizationId);

    // Find all organizations this user is a member of
    const memberships = await OrganizationMember.findAll({
      where: {
        userId: member.userId,
        status: 'active',
      },
    });

    // Fetch organizations separately (associations not yet configured)
    const orgIds = memberships.map((m) => m.organizationId);
    const organizations = await Organization.findAll({
      where: {
        id: orgIds,
      },
      attributes: ['id', 'name', 'slug', 'isActive'],
    });

    return organizations;
  }

  /**
   * Get member's permissions (placeholder - actual RBAC to be implemented)
   */
  async getMemberPermissions(
    memberId: string,
    organizationId: string
  ): Promise<{ permissions: string[] }> {
    logger.debug(`Getting permissions for member: ${memberId}`);

    // Verify member exists
    await this.getMemberById(memberId, organizationId);

    // TODO: Implement actual RBAC permission resolution
    // For now, return empty array
    return { permissions: [] };
  }
}

export const memberService = new MemberService();
export default memberService;
