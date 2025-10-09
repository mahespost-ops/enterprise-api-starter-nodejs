/**
 * Admin Groups Integration Tests
 *
 * Tests for admin group management endpoints
 * - GET /admin/groups - List all groups
 * - GET /admin/groups/{groupId} - Get group details
 * - PUT /admin/groups/{groupId} - Update group
 * - DELETE /admin/groups/{groupId} - Delete group
 */

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: (): string => 'test-uuid-' + Math.random().toString(36).substring(7),
}));
import request from 'supertest';
import { Application } from 'express';
import appPromise from '../../../app';
import { User } from '../../../models/User.model';
import { Organization } from '../../../models/Organization.model';
import { OrganizationMember } from '../../../models/OrganizationMember.model';
import { Group } from '../../../models/Group.model';
import { Device } from '../../../models/Device.model';
import { UserSession } from '../../../models/UserSession.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Groups Endpoints', () => {
  let adminUser: User;
  let testOrg: Organization;
  let testGroup: Group;
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
    // Create test organization
    testOrg = await Organization.create({
      id: TEST_UUIDS.ORG_TEST,
      name: 'Test Organization',
      slug: createTestIdentifier('org'),
      isActive: true,
    });

    // Create admin user
    adminUser = await User.create({
      id: TEST_UUIDS.USER_ADMIN,
      email: createTestIdentifier('admin') + '@test.com',
      emailVerified: true,
      givenName: 'Admin',
      familyName: 'User',
      isActive: true,
      lastOrgId: testOrg.id,
    });

    // Create organization membership
    await OrganizationMember.create({
      organizationId: testOrg.id,
      userId: adminUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Create test group
    testGroup = await Group.create({
      id: TEST_UUIDS.GROUP_1,
      organizationId: testOrg.id,
      name: 'Engineering',
      description: 'Engineering team',
      parentId: null,
      hierarchyLevel: 0,
      memberCount: 5,
      isActive: true,
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, ['admin:groups:read', 'admin:groups:manage']);

    // Generate admin token
    adminToken = generateTestJWT({
      sub: adminUser.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();
    await Group.destroy({ where: {}, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    // Clean up test organizations only (exclude system org)
    const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';
    await Organization.destroy({ where: { id: { [require('sequelize').Op.ne]: SYSTEM_ORG_ID } }, force: true });
    await UserSession.destroy({ where: {}, force: true });
    await Device.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  // ============================================================================
  // GET /admin/groups - List all groups
  // ============================================================================

  describe('GET /admin/groups', () => {
    it('should return paginated groups', async () => {
      const res = await request(app)
        .get('/api/v1/admin/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination).toMatchObject({
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      });
    });

    it('should filter by organizationId', async () => {
      const res = await request(app)
        .get('/api/v1/admin/groups')
        .query({ 'filter[organizationId]': testOrg.id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].organizationId).toBe(testOrg.id);
    });

    it('should filter by parentId (null)', async () => {
      // Create child group
      await Group.create({
        organizationId: testOrg.id,
        name: 'Backend Team',
        parentId: testGroup.id,
        hierarchyLevel: 1,
        isActive: true,
      });

      const res = await request(app)
        .get('/api/v1/admin/groups')
        .query({ 'filter[parentId]': 'null' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].parentId).toBeNull();
    });

    it('should filter by hierarchyLevel', async () => {
      const res = await request(app)
        .get('/api/v1/admin/groups')
        .query({ 'filter[hierarchyLevel]': 0 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].hierarchyLevel).toBe(0);
    });

    it('should filter by isActive', async () => {
      await Group.create({
        organizationId: testOrg.id,
        name: 'Inactive Group',
        isActive: false,
      });

      const res = await request(app)
        .get('/api/v1/admin/groups')
        .query({ 'filter[isActive]': 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isActive).toBe(true);
    });

    it('should sort by name ascending', async () => {
      await Group.create({
        organizationId: testOrg.id,
        name: 'Alpha Team',
        isActive: true,
      });

      const res = await request(app)
        .get('/api/v1/admin/groups')
        .query({ sort: 'name' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data[0].name).toBe('Alpha Team');
      expect(res.body.data[1].name).toBe('Engineering');
    });

    it('should sort by memberCount descending', async () => {
      await Group.create({
        organizationId: testOrg.id,
        name: 'Small Team',
        memberCount: 2,
        isActive: true,
      });

      const res = await request(app)
        .get('/api/v1/admin/groups')
        .query({ sort: '-memberCount' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data[0].memberCount).toBe(5);
      expect(res.body.data[1].memberCount).toBe(2);
    });

    it('should search by name', async () => {
      await Group.create({
        organizationId: testOrg.id,
        name: 'Marketing',
        isActive: true,
      });

      const res = await request(app)
        .get('/api/v1/admin/groups')
        .query({ search: 'engineer' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Engineering');
    });

    it('should search by description', async () => {
      await Group.create({
        organizationId: testOrg.id,
        name: 'Sales',
        description: 'Sales team handles customer acquisition',
        isActive: true,
      });

      const res = await request(app)
        .get('/api/v1/admin/groups')
        .query({ search: 'customer' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Sales');
    });

    it('should select specific fields', async () => {
      const res = await request(app)
        .get('/api/v1/admin/groups')
        .query({ fields: 'id,name,organizationId' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('organizationId');
      expect(res.body.data[0]).not.toHaveProperty('description');
    });

    it('should return 401 without auth token', async () => {
      await request(app).get('/api/v1/admin/groups').expect(401);
    });

    it('should return 403 without admin:groups:read permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['some:other:permission']);

      await request(app)
        .get('/api/v1/admin/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 500 on database error', async () => {
      // Mock Group.findWithFilters to throw error
      jest.spyOn(Group, 'findWithFilters').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/api/v1/admin/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // GET /admin/groups/{groupId} - Get group details
  // ============================================================================

  describe('GET /admin/groups/:groupId', () => {
    it('should return group by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: testGroup.id,
        organizationId: testOrg.id,
        name: 'Engineering',
        description: 'Engineering team',
        parentId: null,
        hierarchyLevel: 0,
        memberCount: 5,
        isActive: true,
      });
    });

    it('should return 401 without auth token', async () => {
      await request(app).get(`/api/v1/admin/groups/${testGroup.id}`).expect(401);
    });

    it('should return 403 without admin:groups:read permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['some:other:permission']);

      await request(app)
        .get(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent group', async () => {
      await request(app)
        .get(`/api/v1/admin/groups/${TEST_UUIDS.GROUP_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 500 on database error', async () => {
      // Mock Group.findByPk to throw error
      jest.spyOn(Group, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // PUT /admin/groups/{groupId} - Update group
  // ============================================================================

  describe('PUT /admin/groups/:groupId', () => {
    it('should update group name', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Engineering Department' })
        .expect(200);

      expect(res.body.name).toBe('Engineering Department');

      const updated = await Group.findByPk(testGroup.id);
      expect(updated!.name).toBe('Engineering Department');
    });

    it('should update group description', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(res.body.description).toBe('Updated description');
    });

    it('should update group isActive', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.isActive).toBe(false);
    });

    it('should update multiple fields', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Name',
          description: 'New Description',
          isActive: false,
        })
        .expect(200);

      expect(res.body).toMatchObject({
        name: 'New Name',
        description: 'New Description',
        isActive: false,
      });
    });

    it('should return 422 for invalid name (too long)', async () => {
      await request(app)
        .put(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'a'.repeat(101) })
        .expect(422);
    });

    it('should return 422 for invalid description (too long)', async () => {
      await request(app)
        .put(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'a'.repeat(501) })
        .expect(422);
    });

    it('should return 422 for invalid isActive type', async () => {
      await request(app)
        .put(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: 'not-a-boolean' })
        .expect(422);
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .put(`/api/v1/admin/groups/${testGroup.id}`)
        .send({ name: 'New Name' })
        .expect(401);
    });

    it('should return 403 without admin:groups:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:groups:read']);

      await request(app)
        .put(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(403);
    });

    it('should return 404 for non-existent group', async () => {
      await request(app)
        .put(`/api/v1/admin/groups/${TEST_UUIDS.GROUP_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('should return 500 on database error', async () => {
      // Mock Group.findByPk to throw error
      jest.spyOn(Group, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .put(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // DELETE /admin/groups/{groupId} - Delete group (soft delete)
  // ============================================================================

  describe('DELETE /admin/groups/:groupId', () => {
    it('should soft delete group', async () => {
      await request(app)
        .delete(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify soft delete
      const group = await Group.findByPk(testGroup.id);
      expect(group).toBeNull(); // Paranoid mode hides deleted records

      // Force read to verify soft delete
      const deletedGroup = await Group.findByPk(testGroup.id, { paranoid: false });
      expect(deletedGroup).not.toBeNull();
      expect(deletedGroup!.deletedAt).not.toBeNull();
    });

    it('should return 401 without auth token', async () => {
      await request(app).delete(`/api/v1/admin/groups/${testGroup.id}`).expect(401);
    });

    it('should return 403 without admin:groups:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:groups:read']);

      await request(app)
        .delete(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent group', async () => {
      await request(app)
        .delete(`/api/v1/admin/groups/${TEST_UUIDS.GROUP_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 500 on database error', async () => {
      // Mock Group.findByPk to throw error
      jest.spyOn(Group, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .delete(`/api/v1/admin/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });
});
