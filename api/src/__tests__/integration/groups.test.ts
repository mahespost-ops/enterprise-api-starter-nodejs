/**
 * Groups Integration Tests
 *
 * Tests for group management endpoints (9 endpoints)
 * Following TDD approach - tests written first, implementation follows
 *
 * Endpoints tested:
 * 1. GET /orgs/{orgId}/groups - List groups
 * 2. POST /orgs/{orgId}/groups - Create group
 * 3. GET /orgs/{orgId}/groups/{groupId} - Get group details
 * 4. PUT /orgs/{orgId}/groups/{groupId} - Update group
 * 5. DELETE /orgs/{orgId}/groups/{groupId} - Delete group
 * 6. GET /orgs/{orgId}/groups/{groupId}/members - List group members
 * 7. POST /orgs/{orgId}/groups/{groupId}/members - Add member to group
 * 8. DELETE /orgs/{orgId}/groups/{groupId}/members/{userId} - Remove member from group
 * 9. GET /orgs/{orgId}/groups/{groupId}/children - Get child groups
 */

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: (): string => 'test-uuid-' + Math.random().toString(36).substring(7),
}));
import request from 'supertest';
import { Op } from 'sequelize';
import { type Application } from 'express';
import appPromise from '../../app';
import sequelize from '../../config/database';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../helpers/test-constants';
import { User } from '../../models/User.model';
import { Organization } from '../../models/Organization.model';
import { Environment } from '../../models/Environment.model';
import { OrganizationMember } from '../../models/OrganizationMember.model';
import { Group } from '../../models/Group.model';
import { GroupMember } from '../../models/GroupMember.model';

describe('Groups API', () => {
  let app: Application;
  let testOrg: Organization;
  let testEnv: Environment;
  let testUser: User;
  let testGroup: Group;
  let adminToken: string;

  beforeAll(async () => {
    app = await appPromise;
  });

  beforeEach(async () => {
    // Create test organization
    testOrg = await Organization.create({
      id: TEST_UUIDS.ORG_TEST,
      name: 'Test Organization',
      slug: createTestIdentifier('org'),
      isActive: true,
    });

    // Create test environment
    testEnv = await Environment.create({
      id: TEST_UUIDS.ENV_LIVE,
      organizationId: testOrg.id,
      name: 'Live',
      type: 'live',
      isDefault: true,
      isActive: true,
    });

    // Create admin user
    const adminUser = await User.create({
      id: TEST_UUIDS.USER_ADMIN,
      email: createTestIdentifier('admin', 'email'),
      phoneNumber: null,
      givenName: 'Admin',
      familyName: 'User',
      lastOrgId: testOrg.id,
      lastEnvId: testEnv.id,
      isActive: true,
    });

    // Create admin member
    await OrganizationMember.create({
      organizationId: testOrg.id,
      userId: adminUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Create test user
    testUser = await User.create({
      id: TEST_UUIDS.USER_TEST,
      email: createTestIdentifier('testuser', 'email'),
      phoneNumber: null,
      givenName: 'Test',
      familyName: 'User',
      lastOrgId: testOrg.id,
      lastEnvId: testEnv.id,
      isActive: true,
    });

    // Create test member
    await OrganizationMember.create({
      organizationId: testOrg.id,
      userId: testUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Create test group
    testGroup = await Group.create({
      id: TEST_UUIDS.GROUP_ENGINEERING,
      organizationId: testOrg.id,
      name: 'Engineering',
      description: 'Engineering team group',
      isActive: true,
    });

    // Grant permissions to admin user
    await grantPermissions(adminUser.id, [
      'groups:read',
      'groups:manage',
    ]);

    // Generate tokens
    adminToken = generateTestJWT({
      sub: adminUser.id,
      orgId: testOrg.id,
      envId: testEnv.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();
    await GroupMember.destroy({ where: {}, force: true });
    await Group.destroy({ where: {}, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    // Clean up test environments only (exclude system env)
    const SYSTEM_ENV_ID = '00000000-0000-0000-0000-000000000100';
    await Environment.destroy({ where: { id: { [Op.ne]: SYSTEM_ENV_ID } }, force: true });
    // Clean up test organizations only (exclude system org)
    const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';
    await Organization.destroy({ where: { id: { [Op.ne]: SYSTEM_ORG_ID } }, force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ============================================================================
  // 1. GET /orgs/{orgId}/groups - List groups
  // ============================================================================
  describe('GET /api/v1/orgs/:orgId/groups', () => {
    it('should list organization groups (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('organizationId');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking groups:read permission', async () => {
      const noPermsToken = generateTestJWT({
        sub: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
      });

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups`)
        .set('Authorization', `Bearer ${noPermsToken}`)
        .send({ name: 'New Group' });

      expect(res.status).toBe(403);
    });

    it('should return 422 when name is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Missing name' });

      expect(res.status).toBe(422);
    });

    it('should create child group with parentGroupId', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Child Group',
          parentId: testGroup.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.parentId).toBe(testGroup.id);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(Group, 'create').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Group' });

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 3. GET /orgs/{orgId}/groups/{groupId} - Get group details
  // ============================================================================
  describe('GET /api/v1/orgs/:orgId/groups/:groupId', () => {
    it('should get group details (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testGroup.id);
      expect(res.body.name).toBe(testGroup.name);
      expect(res.body.organizationId).toBe(testOrg.id);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking groups:read permission', async () => {
      const noPermsToken = generateTestJWT({
        sub: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
      });

      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${noPermsToken}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(403);
    });

    it('should return 404 when group not found', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/groups/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('should return 422 when name is empty', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' });

      expect(res.status).toBe(422);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(Group.prototype, 'save').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 5. DELETE /orgs/{orgId}/groups/{groupId} - Delete group
  // ============================================================================
  describe('DELETE /api/v1/orgs/:orgId/groups/:groupId', () => {
    it('should delete group (204)', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify group is deleted
      const deletedGroup = await Group.findByPk(testGroup.id);
      expect(deletedGroup).toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking groups:delete permission', async () => {
      const noPermsToken = generateTestJWT({
        sub: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when group not found', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${TEST_UUIDS.NONEXISTENT}/members`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return empty array when group has no members', async () => {
      // Create empty group
      const emptyGroup = await Group.create({
        organizationId: testOrg.id,
        name: 'Empty Group',
        isActive: true,
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${emptyGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(Group, 'findOne').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 7. POST /orgs/{orgId}/groups/{groupId}/members - Add member to group
  // ============================================================================
  describe('POST /api/v1/orgs/:orgId/groups/:groupId/members', () => {
    it('should add member to group (201)', async () => {
      const newUser = await User.create({
        email: createTestIdentifier('newuser', 'email'),
        givenName: 'New',
        familyName: 'User',
        isActive: true,
      });

      await OrganizationMember.create({
        organizationId: testOrg.id,
        userId: newUser.id,
        status: 'active',
        joinedAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: newUser.id });

      expect(res.status).toBe(201);
      expect(res.body.groupId).toBe(testGroup.id);
      expect(res.body.userId).toBe(newUser.id);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members`)
        .send({ userId: testUser.id });

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking groups:manage_members permission', async () => {
      const noPermsToken = generateTestJWT({
        sub: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
      });

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members/${testUser.id}`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when group not found', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${TEST_UUIDS.NONEXISTENT}/members/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 when user is not a member of the group', async () => {
      const nonMemberUser = await User.create({
        email: createTestIdentifier('nonmember', 'email'),
        givenName: 'Non',
        familyName: 'Member',
        isActive: true,
      });

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members/${nonMemberUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(GroupMember, 'findOne').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 9. GET /orgs/{orgId}/groups/{groupId}/children - Get child groups
  // ============================================================================
  describe('GET /api/v1/orgs/:orgId/groups/:groupId/children', () => {
    let childGroup: Group;

    beforeEach(async () => {
      // Create child group
      childGroup = await Group.create({
        organizationId: testOrg.id,
        parentId: testGroup.id,
        name: 'Engineering - Backend',
        isActive: true,
      });
    });

    it('should get child groups (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/children`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(childGroup.id);
      expect(res.body.data[0].parentId).toBe(testGroup.id);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/children`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking groups:read permission', async () => {
      const noPermsToken = generateTestJWT({
        sub: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/children`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });
  });
});
