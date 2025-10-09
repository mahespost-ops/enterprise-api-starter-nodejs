/**
 * Organization Service
 * Business logic for organization-related operations
 */

import { Organization } from '../models/Organization.model';
import { OrganizationMember } from '../models/OrganizationMember.model';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import logger from '../config/logger';

interface UpdateOrganizationDto {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
}

class OrganizationService {
  /**
   * Get organization by ID
   * @param orgId - Organization UUID
   * @param userId - User UUID (for membership check)
   * @returns Organization object
   * @throws NotFoundError if organization not found
   * @throws ForbiddenError if user is not a member
   */
  async getOrganization(orgId: string, userId: string): Promise<Organization> {
    logger.debug(`Getting organization: ${orgId} for user: ${userId}`);

    const org = await Organization.findByPk(orgId);

    if (!org) {
      logger.warn(`Organization not found: ${orgId}`);
      throw new NotFoundError(ERROR_MESSAGES.ORGANIZATION_NOT_FOUND);
    }

    // Check if user is a member of the organization
    const membership = await OrganizationMember.findOne({
      where: {
        organizationId: orgId,
        userId: userId,
      },
    });

    if (!membership) {
      logger.warn(`User ${userId} is not a member of organization ${orgId}`);
      throw new ForbiddenError(ERROR_MESSAGES.NOT_ORGANIZATION_MEMBER);
    }

    logger.debug(`Organization retrieved: ${orgId}`);
    return org;
  }

  /**
   * Update organization details
   * @param orgId - Organization UUID
   * @param userId - User UUID (for membership check)
   * @param updateData - Organization update data
   * @returns Updated organization
   * @throws NotFoundError if organization not found
   * @throws ForbiddenError if user is not a member
   */
  async updateOrganization(orgId: string, userId: string, updateData: UpdateOrganizationDto): Promise<Organization> {
    logger.info(`Updating organization: ${orgId} by user: ${userId}`);

    // First verify the organization exists and user is a member
    const org = await this.getOrganization(orgId, userId);

    // Update only allowed fields
    if (updateData.name !== undefined) {
      org.name = updateData.name;
    }

    if (updateData.description !== undefined) {
      org.description = updateData.description;
    }

    if (updateData.logoUrl !== undefined) {
      org.logoUrl = updateData.logoUrl;
    }

    if (updateData.website !== undefined) {
      org.website = updateData.website;
    }

    if (updateData.metadata !== undefined) {
      org.metadata = updateData.metadata;
    }

    if (updateData.isActive !== undefined) {
      org.isActive = updateData.isActive;
    }

    await org.save();

    logger.info(`Organization updated: ${orgId}`);
    return org;
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
