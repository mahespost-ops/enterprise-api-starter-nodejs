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

import request from 'supertest';
import { app } from '../../app';
import { sequelize } from '../../config/database';
import { generateTestJWT } from '../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../helpers/test-constants';
import { User } from '../../models/User.model';
import { Organization } from '../../models/Organization.model';
import { Environment } from '../../models/Environment.model';
import { OrganizationMember } from '../../models/OrganizationMember.model';
import { Group } from '../../models/Group.model';
import { GroupMember } from '../../models/GroupMember.model';

describe('Groups API', () => {
  let testOrg: Organization;
  let testEnv: Environment;
  let testUser: User;
  let testGroup: Group;
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
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
      slug: 'live',
      isDefault: true,
      isActive: true,
    });

    // Create admin user
    const adminUser = await User.create({
      id: TEST_UUIDS.USER_ADMIN,
      email: createTestIdentifier('admin', 'email'),
      phone: null,
      displayName: 'Admin User',
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
      phone: null,
      displayName: 'Test User',
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

    // Generate tokens
    adminToken = generateTestJWT({
      userId: adminUser.id,
      orgId: testOrg.id,
      envId: testEnv.id,
      permissions: [
        'groups:read',
        'groups:write',
        'groups:create',
        'groups:delete',
        'groups:manage_members',
      ],
    });

    memberToken = generateTestJWT({
      userId: testUser.id,
      orgId: testOrg.id,
      envId: testEnv.id,
      permissions: ['groups:read'],
    });
  });

  afterEach(async () => {
    await GroupMember.destroy({ where: {}, force: true });
    await Group.destroy({ where: {}, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Environment.destroy({ where: {}, force: true });
    await Organization.destroy({ where: {}, force: true });
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
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: [],
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should filter by parent group', async () => {
      const parentGroup = await Group.create({
        organizationId: testOrg.id,
        name: 'Parent Group',
        isActive: true,
      });

      const childGroup = await Group.create({
        organizationId: testOrg.id,
        parentGroupId: parentGroup.id,
        name: 'Child Group',
        isActive: true,
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups?filter[parentGroupId]=${parentGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.some((g: any) => g.id === childGroup.id)).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups?limit=1&offset=0`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.limit).toBe(1);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(Group, 'findAll').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 2. POST /orgs/{orgId}/groups - Create group
  // ============================================================================
  describe('POST /api/v1/orgs/:orgId/groups', () => {
    it('should create new group (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Group',
          description: 'A new test group',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('New Group');
      expect(res.body.description).toBe('A new test group');
      expect(res.body.organizationId).toBe(testOrg.id);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups`)
        .send({ name: 'New Group' });

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking groups:create permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['groups:read'],
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
      expect(res.body.message).toContain('name');
    });

    it('should create child group with parentGroupId', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Child Group',
          parentGroupId: testGroup.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.parentGroupId).toBe(testGroup.id);
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
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: [],
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when group not found', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 422 when groupId is invalid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/invalid-uuid`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(Group, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 4. PUT /orgs/{orgId}/groups/{groupId} - Update group
  // ============================================================================
  describe('PUT /api/v1/orgs/:orgId/groups/:groupId', () => {
    it('should update group details (200)', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Engineering',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testGroup.id);
      expect(res.body.name).toBe('Updated Engineering');
      expect(res.body.description).toBe('Updated description');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking groups:write permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['groups:read'],
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
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['groups:read'],
      });

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when group not found', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 422 when groupId is invalid UUID', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/invalid-uuid`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(Group.prototype, 'destroy').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 6. GET /orgs/{orgId}/groups/{groupId}/members - List group members
  // ============================================================================
  describe('GET /api/v1/orgs/:orgId/groups/:groupId/members', () => {
    beforeEach(async () => {
      // Add test user to group
      await GroupMember.create({
        groupId: testGroup.id,
        userId: testUser.id,
      });
    });

    it('should list group members (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('userId');
      expect(res.body.data[0]).toHaveProperty('groupId');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking groups:read permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: [],
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
      jest.spyOn(Group, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

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
        displayName: 'New User',
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
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['groups:read'],
      });

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${noPermsToken}`)
        .send({ userId: testUser.id });

      expect(res.status).toBe(403);
    });

    it('should return 404 when group not found', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups/${TEST_UUIDS.NONEXISTENT}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testUser.id });

      expect(res.status).toBe(404);
    });

    it('should return 422 when userId is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('userId');
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(GroupMember, 'create').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testUser.id });

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 8. DELETE /orgs/{orgId}/groups/{groupId}/members/{userId} - Remove member from group
  // ============================================================================
  describe('DELETE /api/v1/orgs/:orgId/groups/:groupId/members/:userId', () => {
    beforeEach(async () => {
      // Add test user to group
      await GroupMember.create({
        groupId: testGroup.id,
        userId: testUser.id,
      });
    });

    it('should remove member from group (204)', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify member is removed
      const membership = await GroupMember.findOne({
        where: { groupId: testGroup.id, userId: testUser.id },
      });
      expect(membership).toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/members/${testUser.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking groups:manage_members permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['groups:read'],
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
        displayName: 'Non Member',
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
        parentGroupId: testGroup.id,
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
      expect(res.body.data[0].parentGroupId).toBe(testGroup.id);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/children`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking groups:read permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: [],
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/children`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when group not found', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${TEST_UUIDS.NONEXISTENT}/children`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return empty array when group has no children', async () => {
      // Use child group which has no children of its own
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${childGroup.id}/children`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(Group, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/groups/${testGroup.id}/children`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });
});
