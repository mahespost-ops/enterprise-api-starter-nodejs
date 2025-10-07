/**
 * Admin Organization Service
 * Business logic for admin organization management operations
 *
 * Separation of concerns:
 * - Admin-specific organization operations separated from tenant-scoped organization service
 * - All database queries delegated to model static methods (no Op imports)
 */

import { Organization } from '../models/Organization.model';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import {
  ORGANIZATION_SORTABLE_FIELDS,
  ORGANIZATION_SEARCHABLE_FIELDS,
} from '../constants/organization.constants';
import logger from '../config/logger';

/**
 * DTO for updating organization (admin)
 */
export interface UpdateOrganizationDto {
  name?: string;
  slug?: string;
  isActive?: boolean;
  defaultEnvId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Filter options for listing organizations
 */
export interface ListOrganizationsFilters {
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
export interface ListOrganizationsOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListOrganizationsFilters;
}

class AdminOrganizationService {
  /**
   * List all organizations with filters, pagination, sorting, and search
   * Delegates all database logic to Organization model static method
   * @param options - Query options
   * @returns Paginated organization list
   */
  async listOrganizations(
    options: ListOrganizationsOptions
  ): Promise<{ organizations: Organization[]; total: number }> {
    logger.debug('Admin: Listing organizations', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: organizations, count: total } = await Organization.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: ORGANIZATION_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: ORGANIZATION_SORTABLE_FIELDS as unknown as string[],
      fields,
    });

    logger.debug('Admin: Organizations retrieved', { count: organizations.length, total });

    return { organizations, total };
  }

  /**
   * Get organization by ID
   * @param orgId - Organization ID
   * @returns Organization
   * @throws NotFoundError if organization not found
   */
  async getOrganizationById(orgId: string): Promise<Organization> {
    logger.debug('Admin: Getting organization', { orgId });

    const organization = await Organization.findByPk(orgId);

    if (!organization) {
      throw new NotFoundError(ERROR_MESSAGES.ORGANIZATION_NOT_FOUND);
    }

    return organization;
  }

  /**
   * Update organization
   * @param orgId - Organization ID
   * @param data - Update data
   * @returns Updated organization
   * @throws NotFoundError if organization not found
   * @throws ConflictError if slug already exists
   */
  async updateOrganization(orgId: string, data: UpdateOrganizationDto): Promise<Organization> {
    logger.debug('Admin: Updating organization', { orgId, data });

    const organization = await this.getOrganizationById(orgId);

    // Check for slug uniqueness if slug is being updated
    if (data.slug && data.slug !== organization.slug) {
      const existingOrg = await Organization.findOne({ where: { slug: data.slug } });
      if (existingOrg) {
        throw new ConflictError(ERROR_MESSAGES.ORGANIZATION_SLUG_EXISTS);
      }
    }

    // Update fields
    if (data.name !== undefined) organization.name = data.name;
    if (data.slug !== undefined) organization.slug = data.slug;
    if (data.isActive !== undefined) organization.isActive = data.isActive;
    if (data.defaultEnvId !== undefined) organization.defaultEnvId = data.defaultEnvId;
    if (data.metadata !== undefined) organization.metadata = data.metadata;

    await organization.save();

    logger.info('Admin: Organization updated', { orgId });

    return organization;
  }

  /**
   * Delete organization (soft delete)
   * @param orgId - Organization ID
   * @throws NotFoundError if organization not found
   */
  async deleteOrganization(orgId: string): Promise<void> {
    logger.debug('Admin: Deleting organization', { orgId });

    const organization = await this.getOrganizationById(orgId);

    await organization.destroy();

    logger.info('Admin: Organization deleted', { orgId });
  }
}

export default new AdminOrganizationService();
