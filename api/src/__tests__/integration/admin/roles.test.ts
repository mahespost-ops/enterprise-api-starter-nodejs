/**
 * Admin Roles & Permissions Integration Tests
 *
 * Tests for admin role and permission management endpoints
 * - GET /admin/roles - List all roles
 * - POST /admin/roles - Create role
 * - GET /admin/roles/{roleId} - Get role details
 * - PUT /admin/roles/{roleId} - Update role
 * - DELETE /admin/roles/{roleId} - Delete role
 * - GET /admin/roles/{roleId}/permissions - List role permissions
 * - POST /admin/roles/{roleId}/permissions - Add permission to role
 * - DELETE /admin/roles/{roleId}/permissions/{permissionId} - Remove permission
 * - GET /admin/permissions - List all permissions
 */

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: (): string => 'test-uuid-' + Math.random().toString(36).substring(7),
}));
import request from 'supertest';
import { Application } from 'express';
import { Op } from 'sequelize';
import appPromise from '../../../app';
import { User } from '../../../models/User.model';
import { Organization } from '../../../models/Organization.model';
import { OrganizationMember } from '../../../models/OrganizationMember.model';
import { Role } from '../../../models/Role.model';
import { Permission } from '../../../models/Permission.model';
import { RolePermission } from '../../../models/RolePermission.model';
import { Device } from '../../../models/Device.model';
import { UserSession } from '../../../models/UserSession.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Roles & Permissions Endpoints', () => {
  let adminUser: User;
  let testOrg: Organization;
  let testRole: Role;
  let systemRole: Role;
  let testPermission: Permission;
  let secondPermission: Permission;
  let adminToken: string;

  beforeAll(async () => {
    app = await appPromise;
  });

  afterAll(async () => {
    // Close database connection to prevent Jest hanging
    const { sequelize } = await import('../../../models');
    await sequelize.close();
  });

  beforeEach(async () => {
    // Create admin user FIRST (no lastOrgId foreign key dependency)
    adminUser = await User.create({
      id: TEST_UUIDS.USER_ADMIN,
      email: createTestIdentifier('admin') + '@test.com',
      emailVerified: true,
      givenName: 'Admin',
      familyName: 'User',
      isActive: true,
    });

    // Create test organization
    testOrg = await Organization.create({
      id: TEST_UUIDS.ORG_TEST,
      name: 'Test Organization',
      slug: createTestIdentifier('org'),
      isActive: true,
    });

    // Create organization membership
    await OrganizationMember.create({
      organizationId: testOrg.id,
      userId: adminUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Create test permissions
    testPermission = await Permission.create({
      id: TEST_UUIDS.PERMISSION_DEVICES_READ,
      key: 'devices:read',
      name: 'Read Devices',
      description: 'View device information',
      resource: 'devices',
      action: 'read',
      isSystem: true,
    });

    secondPermission = await Permission.create({
      id: TEST_UUIDS.PERMISSION_DEVICES_MANAGE,
      key: 'devices:manage',
      name: 'Manage Devices',
      description: 'Full device management',
      resource: 'devices',
      action: 'manage',
      isSystem: true,
    });

    // Create test role (custom, not system)
    testRole = await Role.create({
      id: TEST_UUIDS.ROLE_CUSTOM,
      name: 'Device Administrator',
      description: 'Full access to device management',
      isSystem: false,
      permissionCount: 0,
    });

    // Create system role (cannot be modified/deleted)
    systemRole = await Role.create({
      id: TEST_UUIDS.ROLE_SYSTEM,
      name: 'System Admin',
      description: 'System-defined administrator role',
      isSystem: true,
      permissionCount: 0,
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, [
      'admin:roles:read',
      'admin:roles:manage',
      'admin:permissions:read',
    ]);

    // Generate admin token
    adminToken = generateTestJWT({
      sub: adminUser.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();
    await RolePermission.destroy({ where: {}, force: true });
    await Role.destroy({ where: {}, force: true });
    await Permission.destroy({ where: {}, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    // Clean up test organizations only (exclude system org)
    const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';
    await Organization.destroy({ where: { id: { [Op.ne]: SYSTEM_ORG_ID } }, force: true });
    await UserSession.destroy({ where: {}, force: true });
    await Device.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  // ============================================================================
  // GET /admin/roles - List Roles
  // ============================================================================

  describe('GET /admin/roles', () => {
    it('should return paginated list of roles', async () => {
      const res = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toEqual({
        limit: 10,
        offset: 0,
        total: expect.any(Number),
        hasMore: expect.any(Boolean),
      });
    });

    it('should filter roles by isSystem flag', async () => {
      const res = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[isSystem]': false })
        .expect(200);

      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: testRole.id,
            isSystem: false,
          }),
        ])
      );
      expect(res.body.data.every((role: Role) => role.isSystem === false)).toBe(true);
    });

    it('should filter roles by createdAt date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const res = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[createdAt][gte]': yesterday.toISOString() })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should sort roles by name ascending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: 'name' })
        .expect(200);

      const names = res.body.data.map((role: Role) => role.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should sort roles by permissionCount descending', async () => {
      // Add permissions to testRole
      await RolePermission.create({
        roleId: testRole.id,
        permissionId: testPermission.id,
      });
      await testRole.update({ permissionCount: 1 });

      const res = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: '-permissionCount' })
        .expect(200);

      const counts = res.body.data.map((role: Role) => role.permissionCount);
      for (let i = 0; i < counts.length - 1; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i + 1]);
      }
    });

    it('should search roles by name', async () => {
      const res = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'Device' })
        .expect(200);

      expect(res.body.data.some((role: Role) => role.name.includes('Device'))).toBe(true);
    });

    it('should search roles by description', async () => {
      const res = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'administrator' })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return only selected fields when fields parameter is provided', async () => {
      const res = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ fields: 'id,name,permissionCount' })
        .expect(200);

      const role = res.body.data[0];
      expect(Object.keys(role).sort()).toEqual(['id', 'name', 'permissionCount'].sort());
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app).get('/api/v1/admin/roles').expect(401);
    });

    it('should return 403 when user lacks admin:roles:read permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });

      const regularToken = generateTestJWT({
        sub: regularUser.id,
      });

      await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Role.findWithFilters to throw error
      jest.spyOn(Role, 'findWithFilters').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // POST /admin/roles - Create Role
  // ============================================================================

  describe('POST /admin/roles', () => {
    it('should create a new role with valid data', async () => {
      const roleData = {
        name: 'Content Manager',
        description: 'Manages content and publications',
      };

      const res = await request(app)
        .post('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleData)
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        name: roleData.name,
        description: roleData.description,
        isSystem: false,
        permissionCount: 0,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should create role with null description', async () => {
      const roleData = {
        name: 'Basic User',
        description: null,
      };

      const res = await request(app)
        .post('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleData)
        .expect(201);

      expect(res.body.description).toBeNull();
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app)
        .post('/api/v1/admin/roles')
        .send({ name: 'Test Role' })
        .expect(401);
    });

    it('should return 403 when user lacks admin:roles:manage permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });
      const regularToken = generateTestJWT({ sub: regularUser.id });

      await request(app)
        .post('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: 'Test Role' })
        .expect(403);
    });

    it('should return 409 when role name already exists', async () => {
      const res = await request(app)
        .post('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Device Administrator' }) // Same as testRole
        .expect(409);

      expect(res.body.message).toContain('already exists');
    });

    it('should return 422 when name is missing', async () => {
      await request(app)
        .post('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'No name provided' })
        .expect(422);
    });

    it('should return 422 when name exceeds max length', async () => {
      await request(app)
        .post('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'A'.repeat(51) }) // Max 50
        .expect(422);
    });

    it('should return 422 when description exceeds max length', async () => {
      await request(app)
        .post('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Valid Name',
          description: 'A'.repeat(501), // Max 500
        })
        .expect(422);
    });
  });

  // ============================================================================
  // GET /admin/roles/{roleId} - Get Role Details
  // ============================================================================

  describe('GET /admin/roles/:roleId', () => {
    it('should return role details when found', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: testRole.id,
        name: testRole.name,
        description: testRole.description,
        isSystem: testRole.isSystem,
        permissionCount: testRole.permissionCount,
      });
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app).get(`/api/v1/admin/roles/${testRole.id}`).expect(401);
    });

    it('should return 403 when user lacks admin:roles:read permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });

      const regularToken = generateTestJWT({
        sub: regularUser.id,
      });

      await request(app)
        .get(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should return 404 when role not found', async () => {
      await request(app)
        .get(`/api/v1/admin/roles/${TEST_UUIDS.ROLE_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Role.findByPk to throw error
      jest.spyOn(Role, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // PUT /admin/roles/{roleId} - Update Role
  // ============================================================================

  describe('PUT /admin/roles/:roleId', () => {
    it('should update role name', async () => {
      const updateData = { name: 'Senior Device Admin' };

      const res = await request(app)
        .put(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.name).toBe(updateData.name);
    });

    it('should update role description', async () => {
      const updateData = { description: 'Updated description' };

      const res = await request(app)
        .put(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.description).toBe(updateData.description);
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        name: 'New Name',
        description: 'New description',
      };

      const res = await request(app)
        .put(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toMatchObject(updateData);
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app)
        .put(`/api/v1/admin/roles/${testRole.id}`)
        .send({ name: 'New Name' })
        .expect(401);
    });

    it('should return 403 when user lacks admin:roles:manage permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });
      const regularToken = generateTestJWT({ sub: regularUser.id });

      await request(app)
        .put(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: 'New Name' })
        .expect(403);
    });

    it('should return 404 when role not found', async () => {
      await request(app)
        .put(`/api/v1/admin/roles/${TEST_UUIDS.ROLE_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('should return 409 when trying to update system role', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/roles/${systemRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Modified System Role' })
        .expect(409);

      expect(res.body.message).toContain('System-defined roles');
    });

    it('should return 409 when name already exists', async () => {
      await request(app)
        .put(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'System Admin' }) // Same as systemRole
        .expect(409);
    });

    it('should return 422 when name exceeds max length', async () => {
      await request(app)
        .put(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'A'.repeat(51) })
        .expect(422);
    });

    it('should return 422 when description exceeds max length', async () => {
      await request(app)
        .put(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'A'.repeat(501) })
        .expect(422);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Role.findByPk to throw error
      jest.spyOn(Role, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .put(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // DELETE /admin/roles/{roleId} - Delete Role
  // ============================================================================

  describe('DELETE /admin/roles/:roleId', () => {
    it('should soft delete role successfully', async () => {
      await request(app)
        .delete(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify soft delete
      const deletedRole = await Role.findByPk(testRole.id, { paranoid: false });
      expect(deletedRole).not.toBeNull();
      expect(deletedRole!.deletedAt).not.toBeNull();
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app).delete(`/api/v1/admin/roles/${testRole.id}`).expect(401);
    });

    it('should return 403 when user lacks admin:roles:manage permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });
      const regularToken = generateTestJWT({ sub: regularUser.id });

      await request(app)
        .delete(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should return 404 when role not found', async () => {
      await request(app)
        .delete(`/api/v1/admin/roles/${TEST_UUIDS.ROLE_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 409 when trying to delete system role', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/roles/${systemRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(res.body.message).toContain('System-defined roles');
    });

    it('should handle database errors gracefully', async () => {
      // Mock Role.findByPk to throw error
      jest.spyOn(Role, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .delete(`/api/v1/admin/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // GET /admin/roles/{roleId}/permissions - List Role Permissions
  // ============================================================================

  describe('GET /admin/roles/:roleId/permissions', () => {
    beforeEach(async () => {
      // Add permissions to testRole
      await RolePermission.create({
        roleId: testRole.id,
        permissionId: testPermission.id,
      });
      await testRole.update({ permissionCount: 1 });
    });

    it('should return list of role permissions', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('permissions');
      expect(Array.isArray(res.body.permissions)).toBe(true);
      expect(res.body.permissions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: testPermission.id,
            key: testPermission.key,
            name: testPermission.name,
          }),
        ])
      );
    });

    it('should return empty array when role has no permissions', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/roles/${systemRole.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.permissions).toEqual([]);
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app)
        .get(`/api/v1/admin/roles/${testRole.id}/permissions`)
        .expect(401);
    });

    it('should return 403 when user lacks admin:roles:read permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });
      const regularToken = generateTestJWT({ sub: regularUser.id });

      await request(app)
        .get(`/api/v1/admin/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should return 404 when role not found', async () => {
      await request(app)
        .get(`/api/v1/admin/roles/${TEST_UUIDS.ROLE_NONEXISTENT}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Role.findByPk to throw error
      jest.spyOn(Role, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get(`/api/v1/admin/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // POST /admin/roles/{roleId}/permissions - Add Permission to Role
  // ============================================================================

  describe('POST /admin/roles/:roleId/permissions', () => {
    it('should add permission to role successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionId: testPermission.id })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        roleId: testRole.id,
        permissionId: testPermission.id,
        createdAt: expect.any(String),
      });

      // Verify permission count incremented
      const updatedRole = await Role.findByPk(testRole.id);
      expect(updatedRole!.permissionCount).toBe(1);
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app)
        .post(`/api/v1/admin/roles/${testRole.id}/permissions`)
        .send({ permissionId: testPermission.id })
        .expect(401);
    });

    it('should return 403 when user lacks admin:roles:manage permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });
      const regularToken = generateTestJWT({ sub: regularUser.id });

      await request(app)
        .post(`/api/v1/admin/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ permissionId: testPermission.id })
        .expect(403);
    });

    it('should return 404 when role not found', async () => {
      await request(app)
        .post(`/api/v1/admin/roles/${TEST_UUIDS.ROLE_NONEXISTENT}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionId: testPermission.id })
        .expect(404);
    });

    it('should return 404 when permission not found', async () => {
      await request(app)
        .post(`/api/v1/admin/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionId: TEST_UUIDS.PERMISSION_NONEXISTENT })
        .expect(404);
    });

    it('should return 409 when trying to modify system role', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/roles/${systemRole.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionId: testPermission.id })
        .expect(409);

      expect(res.body.message).toContain('System-defined roles');
    });

    it('should return 409 when permission already assigned to role', async () => {
      // Add permission first
      await RolePermission.create({
        roleId: testRole.id,
        permissionId: testPermission.id,
      });

      const res = await request(app)
        .post(`/api/v1/admin/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionId: testPermission.id })
        .expect(409);

      expect(res.body.message).toContain('already assigned');
    });

    it('should return 422 when permissionId is missing', async () => {
      await request(app)
        .post(`/api/v1/admin/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(422);
    });
  });

  // ============================================================================
  // DELETE /admin/roles/{roleId}/permissions/{permissionId} - Remove Permission
  // ============================================================================

  describe('DELETE /admin/roles/:roleId/permissions/:permissionId', () => {
    beforeEach(async () => {
      // Add permission to testRole
      await RolePermission.create({
        roleId: testRole.id,
        permissionId: testPermission.id,
      });
      await testRole.update({ permissionCount: 1 });
    });

    it('should remove permission from role successfully', async () => {
      await request(app)
        .delete(`/api/v1/admin/roles/${testRole.id}/permissions/${testPermission.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify permission removed
      const rolePermission = await RolePermission.findOne({
        where: { roleId: testRole.id, permissionId: testPermission.id },
      });
      expect(rolePermission).toBeNull();

      // Verify permission count decremented
      const updatedRole = await Role.findByPk(testRole.id);
      expect(updatedRole!.permissionCount).toBe(0);
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app)
        .delete(`/api/v1/admin/roles/${testRole.id}/permissions/${testPermission.id}`)
        .expect(401);
    });

    it('should return 403 when user lacks admin:roles:manage permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });
      const regularToken = generateTestJWT({ sub: regularUser.id });

      await request(app)
        .delete(`/api/v1/admin/roles/${testRole.id}/permissions/${testPermission.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should return 404 when role not found', async () => {
      await request(app)
        .delete(
          `/api/v1/admin/roles/${TEST_UUIDS.ROLE_NONEXISTENT}/permissions/${testPermission.id}`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 when permission not assigned to role', async () => {
      await request(app)
        .delete(`/api/v1/admin/roles/${testRole.id}/permissions/${secondPermission.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 409 when trying to modify system role', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/roles/${systemRole.id}/permissions/${testPermission.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(res.body.message).toContain('System-defined roles');
    });

    it('should handle database errors gracefully', async () => {
      // Mock Role.findByPk to throw error
      jest.spyOn(Role, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .delete(`/api/v1/admin/roles/${testRole.id}/permissions/${testPermission.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // GET /admin/permissions - List All Permissions
  // ============================================================================

  describe('GET /admin/permissions', () => {
    it('should return list of all permissions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('permissions');
      expect(Array.isArray(res.body.permissions)).toBe(true);
      expect(res.body.permissions.length).toBeGreaterThan(0);
    });

    it('should filter permissions by resource', async () => {
      const res = await request(app)
        .get('/api/v1/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ resource: 'devices' })
        .expect(200);

      expect(res.body.permissions.every((p: Permission) => p.resource === 'devices')).toBe(true);
    });

    it('should filter permissions by action', async () => {
      const res = await request(app)
        .get('/api/v1/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'manage' })
        .expect(200);

      expect(res.body.permissions.every((p: Permission) => p.action === 'manage')).toBe(true);
    });

    it('should filter permissions by resource and action', async () => {
      const res = await request(app)
        .get('/api/v1/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ resource: 'devices', action: 'read' })
        .expect(200);

      expect(res.body.permissions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            resource: 'devices',
            action: 'read',
          }),
        ])
      );
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app).get('/api/v1/admin/permissions').expect(401);
    });

    it('should return 403 when user lacks admin:permissions:read permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });
      const regularToken = generateTestJWT({ sub: regularUser.id });

      await request(app)
        .get('/api/v1/admin/permissions')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Permission.findAll to throw error
      jest.spyOn(Permission, 'findAll').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/api/v1/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });
});
