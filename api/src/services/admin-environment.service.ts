/**
 * Admin Environment Service
 * Business logic for admin environment management operations
 *
 * Separation of concerns:
 * - Admin-specific environment operations separated from tenant-scoped environment service
 * - All database queries delegated to model static methods (no Op/sequelize imports)
 */

import { Environment } from '../models/Environment.model';
import { NotFoundError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import logger from '../config/logger';

/**
 * DTO for updating environment (admin)
 */
export interface UpdateEnvironmentDto {
  name?: string;
  type?: 'live' | 'sandbox';
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
}

/**
 * Filter options for listing environments
 */
export interface ListEnvironmentsFilters {
  organizationId?: string;
  type?: string;
  isActive?: boolean;
  isDefault?: boolean;
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
export interface ListEnvironmentsOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListEnvironmentsFilters;
}

class AdminEnvironmentService {
  /**
   * List all environments with filters, pagination, sorting, and search
   * Delegates all database logic to Environment model static method
   * @param options - Query options
   * @returns Paginated environment list
   */
  async listEnvironments(options: ListEnvironmentsOptions): Promise<{ environments: Environment[]; total: number }> {
    logger.debug('Admin: Listing environments', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: environments, count: total } = await Environment.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      fields,
    });

    logger.debug('Admin: Environments retrieved', { count: environments.length, total });

    return { environments, total };
  }

  /**
   * Get environment by ID
   * @param envId - Environment ID
   * @returns Environment
   * @throws NotFoundError if environment not found
   */
  async getEnvironmentById(envId: string): Promise<Environment> {
    logger.debug('Admin: Getting environment', { envId });

    const environment = await Environment.findByPk(envId);

    if (!environment) {
      throw new NotFoundError(ERROR_MESSAGES.ENVIRONMENT_NOT_FOUND);
    }

    return environment;
  }

  /**
   * Update environment
   * @param envId - Environment ID
   * @param data - Update data
   * @returns Updated environment
   * @throws NotFoundError if environment not found
   */
  async updateEnvironment(envId: string, data: UpdateEnvironmentDto): Promise<Environment> {
    logger.debug('Admin: Updating environment', { envId, data });

    const environment = await this.getEnvironmentById(envId);

    // Update fields
    if (data.name !== undefined) environment.name = data.name;
    if (data.type !== undefined) environment.type = data.type;
    if (data.description !== undefined) environment.description = data.description;
    if (data.isDefault !== undefined) environment.isDefault = data.isDefault;
    if (data.isActive !== undefined) environment.isActive = data.isActive;
    if (data.metadata !== undefined) environment.metadata = data.metadata;

    await environment.save();

    logger.info('Admin: Environment updated', { envId });

    return environment;
  }

  /**
   * Delete environment (soft delete)
   * @param envId - Environment ID
   * @throws NotFoundError if environment not found
   */
  async deleteEnvironment(envId: string): Promise<void> {
    logger.debug('Admin: Deleting environment', { envId });

    const environment = await this.getEnvironmentById(envId);

    await environment.destroy();

    logger.info('Admin: Environment deleted', { envId });
  }
}

export default new AdminEnvironmentService();
