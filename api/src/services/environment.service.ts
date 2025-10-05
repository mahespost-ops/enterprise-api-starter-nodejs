/**
 * Environment Service
 * Business logic for environment-related operations
 */

import { Environment, EnvironmentType } from '../models/Environment.model';
import { Organization } from '../models/Organization.model';
import { OrganizationMember } from '../models/OrganizationMember.model';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import logger from '../config/logger';

interface CreateEnvironmentDto {
  name: string;
  type: EnvironmentType;
  description?: string | null;
  isDefault?: boolean;
  metadata?: Record<string, unknown> | null;
}

interface UpdateEnvironmentDto {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
}

interface ListEnvironmentsOptions {
  limit?: number;
  offset?: number;
  type?: EnvironmentType;
  isDefault?: boolean;
  search?: string;
  fields?: string[];
}

class EnvironmentService {
  /**
   * Verify user has access to organization
   * @param orgId - Organization UUID
   * @param userId - User UUID
   * @throws NotFoundError if organization not found
   * @throws ForbiddenError if user is not a member
   */
  private async verifyOrganizationAccess(orgId: string, userId: string): Promise<Organization> {
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

    return org;
  }

  /**
   * List environments for an organization
   * @param orgId - Organization UUID
   * @param userId - User UUID (for access check)
   * @param options - Filter and pagination options
   * @returns Environments with pagination metadata
   */
  async listEnvironments(
    orgId: string,
    userId: string,
    options: ListEnvironmentsOptions
  ): Promise<{ data: Environment[]; pagination: { limit: number; offset: number; total: number; hasMore: boolean } }> {
    logger.debug(`Listing environments for organization: ${orgId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    const { limit = 20, offset = 0, type, isDefault, search, fields } = options;

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    if (type) {
      where.type = type;
    }

    if (isDefault !== undefined) {
      where.isDefault = isDefault;
    }

    if (search) {
      where.name = { $iLike: `%${search}%` };
    }

    // Query with pagination
    const { rows: environments, count: total } = await Environment.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: fields && fields.length > 0 ? ['id', ...fields] : undefined,
    });

    logger.debug(`Retrieved ${environments.length} environments (total: ${total})`);

    return {
      data: environments,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get environment by ID
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param userId - User UUID (for access check)
   * @returns Environment object
   * @throws NotFoundError if environment not found
   */
  async getEnvironment(orgId: string, envId: string, userId: string): Promise<Environment> {
    logger.debug(`Getting environment: ${envId} in organization: ${orgId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    const environment = await Environment.findByPk(envId);

    if (!environment || environment.organizationId !== orgId) {
      logger.warn(`Environment not found: ${envId} in organization: ${orgId}`);
      throw new NotFoundError(ERROR_MESSAGES.ENVIRONMENT_NOT_FOUND_IN_ORG);
    }

    logger.debug(`Environment retrieved: ${envId}`);
    return environment;
  }

  /**
   * Create new environment
   * @param orgId - Organization UUID
   * @param userId - User UUID (for access check)
   * @param createData - Environment creation data
   * @returns Created environment
   */
  async createEnvironment(orgId: string, userId: string, createData: CreateEnvironmentDto): Promise<Environment> {
    logger.info(`Creating environment for organization: ${orgId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    // Create environment
    const environment = await Environment.create({
      organizationId: orgId,
      name: createData.name,
      type: createData.type,
      description: createData.description || null,
      isDefault: createData.isDefault || false,
      metadata: createData.metadata || null,
      isActive: true,
    });

    logger.info(`Environment created: ${environment.id}`);
    return environment;
  }

  /**
   * Update environment
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param userId - User UUID (for access check)
   * @param updateData - Environment update data
   * @returns Updated environment
   */
  async updateEnvironment(
    orgId: string,
    envId: string,
    userId: string,
    updateData: UpdateEnvironmentDto
  ): Promise<Environment> {
    logger.info(`Updating environment: ${envId}`);

    // Verify the environment exists and user has access
    const environment = await this.getEnvironment(orgId, envId, userId);

    // Update only allowed fields
    if (updateData.name !== undefined) {
      environment.name = updateData.name;
    }

    if (updateData.description !== undefined) {
      environment.description = updateData.description;
    }

    if (updateData.isDefault !== undefined) {
      environment.isDefault = updateData.isDefault;
    }

    if (updateData.metadata !== undefined) {
      environment.metadata = updateData.metadata;
    }

    if (updateData.isActive !== undefined) {
      environment.isActive = updateData.isActive;
    }

    await environment.save();

    logger.info(`Environment updated: ${envId}`);
    return environment;
  }

  /**
   * Delete environment (soft delete)
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param userId - User UUID (for access check)
   * @throws BadRequestError if trying to delete default or last environment
   */
  async deleteEnvironment(orgId: string, envId: string, userId: string): Promise<void> {
    logger.info(`Deleting environment: ${envId}`);

    // Verify the environment exists and user has access
    const environment = await this.getEnvironment(orgId, envId, userId);

    // Prevent deletion of default environment
    if (environment.isDefault) {
      logger.warn(`Attempted to delete default environment: ${envId}`);
      throw new BadRequestError(ERROR_MESSAGES.CANNOT_DELETE_DEFAULT_ENV);
    }

    // Check if this is the last remaining environment
    const envCount = await Environment.count({
      where: {
        organizationId: orgId,
      },
    });

    if (envCount <= 1) {
      logger.warn(`Attempted to delete last remaining environment: ${envId}`);
      throw new BadRequestError(ERROR_MESSAGES.CANNOT_DELETE_LAST_ENV);
    }

    // Soft delete
    await environment.destroy();

    logger.info(`Environment deleted: ${envId}`);
  }
}

export const environmentService = new EnvironmentService();
export default environmentService;
