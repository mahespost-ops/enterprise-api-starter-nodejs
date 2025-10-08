/**
 * Admin Role Service
 * Business logic for admin role and permission management operations
 *
 * Separation of concerns:
 * - Admin-specific role operations separated from tenant-scoped permission checks
 * - All database queries delegated to model static methods (NO Op/sequelize imports)
 */

import { Role } from '../models/Role.model';
import { Permission } from '../models/Permission.model';
import { RolePermission } from '../models/RolePermission.model';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import { ROLE_SORTABLE_FIELDS, ROLE_SEARCHABLE_FIELDS } from '../constants/role.constants';
import logger from '../config/logger';

/**
 * DTO for creating role
 */
export interface CreateRoleDto {
  name: string;
  description?: string | null;
}

/**
 * DTO for updating role (admin)
 */
export interface UpdateRoleDto {
  name?: string;
  description?: string | null;
}

/**
 * Filter options for listing roles
 */
export interface ListRolesFilters {
  isSystem?: boolean;
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
export interface ListRolesOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListRolesFilters;
}

/**
 * Permission filter options
 */
export interface ListPermissionsFilters {
  resource?: string;
  action?: 'read' | 'manage' | 'assign';
}

class AdminRoleService {
  /**
   * List all roles with filters, pagination, sorting, and search
   * Delegates all database logic to Role model static method
   * @param options - Query options
   * @returns Paginated role list
   */
  async listRoles(options: ListRolesOptions): Promise<{ roles: Role[]; total: number }> {
    logger.debug('Admin: Listing roles', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: roles, count: total } = await Role.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: ROLE_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: Object.values(ROLE_SORTABLE_FIELDS) as string[],
      fields,
    });

    logger.debug('Admin: Roles retrieved', { count: roles.length, total });

    return { roles, total };
  }

  /**
   * Create a new role
   * @param data - Role creation data
   * @returns Created role
   * @throws ConflictError if role name already exists
   */
  async createRole(data: CreateRoleDto): Promise<Role> {
    logger.debug('Admin: Creating role', { name: data.name });

    // Check for duplicate name
    const existingRole = await Role.findOne({ where: { name: data.name } });
    if (existingRole) {
      throw new ConflictError(ERROR_MESSAGES.ROLE_NAME_EXISTS);
    }

    const role = await Role.create({
      name: data.name,
      description: data.description ?? null,
      isSystem: false, // Admin-created roles are never system roles
      permissionCount: 0,
    });

    logger.info('Admin: Role created', { roleId: role.id, name: role.name });

    return role;
  }

  /**
   * Get role by ID
   * @param roleId - Role ID
   * @returns Role
   * @throws NotFoundError if role not found
   */
  async getRoleById(roleId: string): Promise<Role> {
    logger.debug('Admin: Getting role', { roleId });

    const role = await Role.findByPk(roleId);

    if (!role) {
      throw new NotFoundError(ERROR_MESSAGES.ROLE_NOT_FOUND);
    }

    return role;
  }

  /**
   * Update role
   * @param roleId - Role ID
   * @param data - Update data
   * @returns Updated role
   * @throws NotFoundError if role not found
   * @throws ConflictError if system role or name already exists
   */
  async updateRole(roleId: string, data: UpdateRoleDto): Promise<Role> {
    logger.debug('Admin: Updating role', { roleId, data });

    const role = await this.getRoleById(roleId);

    // System roles cannot be modified
    if (role.isSystem) {
      throw new ConflictError(ERROR_MESSAGES.CANNOT_MODIFY_SYSTEM_ROLE);
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== role.name) {
      const existingRole = await Role.findOne({ where: { name: data.name } });
      if (existingRole) {
        throw new ConflictError(ERROR_MESSAGES.ROLE_NAME_EXISTS);
      }
    }

    // Update fields
    if (data.name !== undefined) role.name = data.name;
    if (data.description !== undefined) role.description = data.description;

    await role.save();

    logger.info('Admin: Role updated', { roleId });

    return role;
  }

  /**
   * Delete role (soft delete)
   * @param roleId - Role ID
   * @throws NotFoundError if role not found
   * @throws ConflictError if system role
   */
  async deleteRole(roleId: string): Promise<void> {
    logger.debug('Admin: Deleting role', { roleId });

    const role = await this.getRoleById(roleId);

    // System roles cannot be deleted
    if (role.isSystem) {
      throw new ConflictError(ERROR_MESSAGES.CANNOT_DELETE_SYSTEM_ROLE);
    }

    await role.destroy();

    logger.info('Admin: Role deleted', { roleId });
  }

  /**
   * List permissions assigned to a role
   * @param roleId - Role ID
   * @returns List of permissions
   * @throws NotFoundError if role not found
   */
  async listRolePermissions(roleId: string): Promise<Permission[]> {
    logger.debug('Admin: Listing role permissions', { roleId });

    // Verify role exists
    await this.getRoleById(roleId);

    // Get all role permissions with permission details
    const rolePermissions = await RolePermission.findAll({
      where: { roleId },
      include: [
        {
          model: Permission,
          as: 'permission',
        },
      ],
    });

    const permissions = rolePermissions.map((rp) => rp.permission).filter(Boolean) as Permission[];

    logger.debug('Admin: Role permissions retrieved', {
      roleId,
      count: permissions.length,
    });

    return permissions;
  }

  /**
   * Add permission to role
   * @param roleId - Role ID
   * @param permissionId - Permission ID
   * @returns Created role permission association
   * @throws NotFoundError if role or permission not found
   * @throws ConflictError if system role or permission already assigned
   */
  async addRolePermission(roleId: string, permissionId: string): Promise<RolePermission> {
    logger.debug('Admin: Adding permission to role', { roleId, permissionId });

    // Verify role exists and is not a system role
    const role = await this.getRoleById(roleId);
    if (role.isSystem) {
      throw new ConflictError(ERROR_MESSAGES.CANNOT_MODIFY_SYSTEM_ROLE);
    }

    // Verify permission exists
    const permission = await Permission.findByPk(permissionId);
    if (!permission) {
      throw new NotFoundError(ERROR_MESSAGES.PERMISSION_NOT_FOUND);
    }

    // Delegate transaction logic to model layer - errors bubble up naturally
    const rolePermission = await RolePermission.addPermissionToRole(roleId, permissionId);
    logger.info('Admin: Permission added to role', { roleId, permissionId });
    return rolePermission;
  }

  /**
   * Remove permission from role
   * @param roleId - Role ID
   * @param permissionId - Permission ID
   * @throws NotFoundError if role or role permission not found
   * @throws ConflictError if system role
   */
  async removeRolePermission(roleId: string, permissionId: string): Promise<void> {
    logger.debug('Admin: Removing permission from role', { roleId, permissionId });

    // Verify role exists and is not a system role
    const role = await this.getRoleById(roleId);
    if (role.isSystem) {
      throw new ConflictError(ERROR_MESSAGES.CANNOT_MODIFY_SYSTEM_ROLE);
    }

    // Delegate transaction logic to model layer - errors bubble up naturally
    await RolePermission.removePermissionFromRole(roleId, permissionId);
    logger.info('Admin: Permission removed from role', { roleId, permissionId });
  }

  /**
   * List all permissions with optional filters
   * @param filters - Filter options
   * @returns List of permissions
   */
  async listPermissions(filters: ListPermissionsFilters = {}): Promise<Permission[]> {
    logger.debug('Admin: Listing permissions', { filters });

    const where: { resource?: string; action?: string } = {};

    if (filters.resource) {
      where.resource = filters.resource;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    const permissions = await Permission.findAll({ where });

    logger.debug('Admin: Permissions retrieved', { count: permissions.length });

    return permissions;
  }
}

export default new AdminRoleService();
