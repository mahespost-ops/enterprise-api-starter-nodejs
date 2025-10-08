/**
 * Admin Role Assignment Service
 * Business logic for admin role assignment management operations
 *
 * Separation of concerns:
 * - Admin-specific operations separated from tenant-scoped operations
 * - All database queries delegated to model static methods (NO Op/sequelize imports)
 */

import { EnvironmentRoleAssignment, RoleAssignmentFilters } from '../models/EnvironmentRoleAssignment.model';
import { Role } from '../models/Role.model';
import { Environment } from '../models/Environment.model';
import { OrganizationMember } from '../models/OrganizationMember.model';
import { Group } from '../models/Group.model';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import {
  ROLE_ASSIGNMENT_SORTABLE_FIELDS,
  ROLE_ASSIGNMENT_SEARCHABLE_FIELDS,
} from '../constants/role-assignment.constants';
import logger from '../config/logger';

/**
 * DTO for creating role assignment
 */
export interface CreateRoleAssignmentDto {
  roleId: string;
  environmentId: string;
  membershipId?: string;
  groupId?: string;
  assignedBy?: string;
}

/**
 * Pagination and query options for list
 */
export interface ListRoleAssignmentsOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: RoleAssignmentFilters;
}

class AdminRoleAssignmentService {
  /**
   * List all role assignments with filters, pagination, sorting, and search
   * Delegates all database logic to EnvironmentRoleAssignment model static method
   * @param options - Query options
   * @returns Paginated role assignment list
   */
  async listRoleAssignments(
    options: ListRoleAssignmentsOptions,
  ): Promise<{ assignments: EnvironmentRoleAssignment[]; total: number }> {
    logger.debug('Admin: Listing role assignments', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: assignments, count: total } = await EnvironmentRoleAssignment.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: ROLE_ASSIGNMENT_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: Object.values(ROLE_ASSIGNMENT_SORTABLE_FIELDS) as string[],
      fields,
    });

    logger.debug('Admin: Role assignments retrieved', { count: assignments.length, total });

    return { assignments, total };
  }

  /**
   * Create role assignment
   * Validates that role, environment, and member/group exist
   * Checks for duplicate assignments
   * @param data - Role assignment creation data
   * @returns Created assignment
   */
  async createRoleAssignment(data: CreateRoleAssignmentDto): Promise<EnvironmentRoleAssignment> {
    logger.info('Admin: Creating role assignment', { data });

    const { roleId, environmentId, membershipId, groupId, assignedBy } = data;

    // Validate role exists
    const role = await Role.findByPk(roleId);
    if (!role) {
      throw new NotFoundError(ERROR_MESSAGES.ROLE_NOT_FOUND);
    }

    // Validate environment exists
    const environment = await Environment.findByPk(environmentId);
    if (!environment) {
      throw new NotFoundError(ERROR_MESSAGES.ENVIRONMENT_NOT_FOUND);
    }

    // Validate member or group exists
    if (membershipId) {
      const member = await OrganizationMember.findByPk(membershipId);
      if (!member) {
        throw new NotFoundError(ERROR_MESSAGES.MEMBER_NOT_FOUND);
      }

      // Check for duplicate assignment
      const existing = await EnvironmentRoleAssignment.findOne({
        where: {
          environmentId,
          roleId,
          membershipId,
        },
      });

      if (existing) {
        throw new ConflictError(ERROR_MESSAGES.ROLE_ASSIGNMENT_EXISTS);
      }
    }

    if (groupId) {
      const group = await Group.findByPk(groupId);
      if (!group) {
        throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
      }

      // Check for duplicate assignment
      const existing = await EnvironmentRoleAssignment.findOne({
        where: {
          environmentId,
          roleId,
          groupId,
        },
      });

      if (existing) {
        throw new ConflictError(ERROR_MESSAGES.ROLE_ASSIGNMENT_EXISTS);
      }
    }

    // Create assignment
    const assignment = await EnvironmentRoleAssignment.create({
      roleId,
      environmentId,
      membershipId: membershipId || null,
      groupId: groupId || null,
      assignedBy: assignedBy || null,
    });

    logger.info('Admin: Role assignment created', { assignmentId: assignment.id });

    return assignment;
  }

  /**
   * Delete role assignment
   * Soft deletes the assignment
   * @param assignmentId - Assignment ID
   */
  async deleteRoleAssignment(assignmentId: string): Promise<void> {
    logger.info('Admin: Deleting role assignment', { assignmentId });

    const assignment = await EnvironmentRoleAssignment.findByPk(assignmentId);

    if (!assignment) {
      throw new NotFoundError(ERROR_MESSAGES.ROLE_ASSIGNMENT_NOT_FOUND);
    }

    // Soft delete (paranoid mode)
    await assignment.destroy();

    logger.info('Admin: Role assignment deleted', { assignmentId });
  }
}

export const adminRoleAssignmentService = new AdminRoleAssignmentService();
export default adminRoleAssignmentService;
