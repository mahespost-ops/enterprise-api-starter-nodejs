/**
 * Admin Members Integration Tests
 *
 * Tests for admin member management endpoints:
 * - GET /admin/organizations/{orgId}/members - List organization members
 * - GET /admin/organizations/{orgId}/members/{memberId} - Get member details
 * - PUT /admin/organizations/{orgId}/members/{memberId} - Update member
 * - DELETE /admin/organizations/{orgId}/members/{memberId} - Remove member
 * - GET /admin/groups/{groupId}/members - List group members
 * - POST /admin/groups/{groupId}/members - Add member to group
 * - DELETE /admin/groups/{groupId}/members/{userId} - Remove member from group
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
import { GroupMember } from '../../../models/GroupMember.model';
import { Device } from '../../../models/Device.model';
import { UserSession } from '../../../models/UserSession.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Members Endpoints', () => {
  let adminUser: User;
  let testOrg: Organization;
  let testOrg2: Organization;
  let testMember1: OrganizationMember;
  let testMember2: OrganizationMember;
  let testGroup: Group;
  let adminToken: string;

  beforeAll(async () => {
    app = await appPromise;
  });

  afterAll(async () => {
    const { sequelize } = await import('../../../models');
    await sequelize.close();
  });

  beforeEach(async () => {
    // Create test organizations
    testOrg = await Organization.create({
      id: TEST_UUIDS.ORG_TEST,
      name: 'Test Organization',
      slug: createTestIdentifier('org'),
      isActive: true,
    });

    testOrg2 = await Organization.create({
      id: TEST_UUIDS.ORG_TEST_2,
      name: 'Test Organization 2',
      slug: createTestIdentifier('org2'),
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

    // Create test users for members
    const member1User = await User.create({
      id: TEST_UUIDS.USER_REGULAR,
      email: createTestIdentifier('member1') + '@test.com',
      emailVerified: true,
      givenName: 'Member',
      familyName: 'One',
      isActive: true,
    });

    const member2User = await User.create({
      id: TEST_UUIDS.USER_REGULAR_2,
      email: createTestIdentifier('member2') + '@test.com',
      emailVerified: true,
      givenName: 'Member',
      familyName: 'Two',
      isActive: true,
    });

    // Create organization memberships
    await OrganizationMember.create({
      organizationId: testOrg.id,
      userId: adminUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    testMember1 = await OrganizationMember.create({
      id: TEST_UUIDS.MEMBER_1,
      organizationId: testOrg.id,
      userId: member1User.id,
      status: 'active',
      joinedAt: new Date(),
    });

    testMember2 = await OrganizationMember.create({
      id: TEST_UUIDS.MEMBER_2,
      organizationId: testOrg.id,
      userId: member2User.id,
      status: 'invited',
      invitedBy: adminUser.id,
    });

    // Create a group for group member tests
    testGroup = await Group.create({
      id: TEST_UUIDS.GROUP_1,
      organizationId: testOrg.id,
      name: 'Test Group',
      description: 'Test group for member tests',
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, [
      'admin:members:read',
      'admin:members:manage',
      'admin:groups:read',
      'admin:groups:manage',
    ]);

    // Generate admin token
    adminToken = generateTestJWT({
      sub: adminUser.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();
    await GroupMember.destroy({ where: {}, force: true });
    await Group.destroy({ where: {}, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    await Organization.destroy({ where: {}, force: true });
    await UserSession.destroy({ where: {}, force: true });
    await Device.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  // ==================== Organization Members ====================

  describe('GET /admin/organizations/:orgId/members', () => {
    it('should list organization members with pagination (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify member structure
      const member = res.body.data[0];
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('userId');
      expect(member).toHaveProperty('status');
      expect(member).toHaveProperty('joinedAt');
      expect(member).toHaveProperty('user');
      expect(member.user).toHaveProperty('email');
    });

    it('should filter members by status (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members?filter[status]=active`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.every((m: { status: string }) => m.status === 'active')).toBe(true);
    });

    it('should filter members by createdAt date range (200)', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .get(
          `/api/v1/admin/organizations/${testOrg.id}/members?filter[createdAt][gte]=${yesterday}&filter[createdAt][lte]=${tomorrow}`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should sort members by field and direction (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members?sort=-createdAt`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should search members by user fields (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members?search=Member`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should select specific fields (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members?fields=id,status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('status');
    });

    it('should return 401 without authentication', async () => {
      await request(app).get(`/api/v1/admin/organizations/${testOrg.id}/members`).expect(401);
    });

    it('should return 403 without admin:members:read permission', async () => {
      const userToken = generateTestJWT({
        sub: TEST_UUIDS.USER_REGULAR,
      });

      await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent organization', async () => {
      await request(app)
        .get(`/api/v1/admin/organizations/${TEST_UUIDS.ORG_NONEXISTENT}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 422 for invalid query parameters', async () => {
      await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members?limit=invalid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });
  });

  describe('GET /admin/organizations/:orgId/members/:memberId', () => {
    it('should get member details (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', testMember1.id);
      expect(res.body).toHaveProperty('userId', testMember1.userId);
      expect(res.body).toHaveProperty('status', 'active');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .expect(401);
    });

    it('should return 403 without admin:members:read permission', async () => {
      const userToken = generateTestJWT({
        sub: TEST_UUIDS.USER_REGULAR,
      });

      await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent member', async () => {
      await request(app)
        .get(`/api/v1/admin/organizations/${testOrg.id}/members/${TEST_UUIDS.MEMBER_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 500 on database error', async () => {
      // Force database error by destroying member and using wrong org
      await request(app)
        .get(`/api/v1/admin/organizations/${testOrg2.id}/members/${testMember1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /admin/organizations/:orgId/members/:memberId', () => {
    it('should update member status (200)', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' })
        .expect(200);

      expect(res.body).toHaveProperty('status', 'suspended');
    });

    it('should activate invited member and set joinedAt (200)', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' })
        .expect(200);

      expect(res.body).toHaveProperty('status', 'active');
      expect(res.body).toHaveProperty('joinedAt');
      expect(res.body.joinedAt).not.toBeNull();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .put(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .send({ status: 'suspended' })
        .expect(401);
    });

    it('should return 403 without admin:members:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:members:read']);

      await request(app)
        .put(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' })
        .expect(403);
    });

    it('should return 404 for non-existent member', async () => {
      await request(app)
        .put(`/api/v1/admin/organizations/${testOrg.id}/members/${TEST_UUIDS.MEMBER_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' })
        .expect(404);
    });

    it('should return 422 for invalid status value', async () => {
      await request(app)
        .put(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' })
        .expect(422);
    });

    it('should return 422 for empty body', async () => {
      await request(app)
        .put(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(422);
    });
  });

  describe('DELETE /admin/organizations/:orgId/members/:memberId', () => {
    it('should remove member from organization (204)', async () => {
      await request(app)
        .delete(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify member is soft-deleted
      const member = await OrganizationMember.findByPk(testMember1.id, { paranoid: false });
      expect(member).not.toBeNull();
      expect(member!.deletedAt).not.toBeNull();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .expect(401);
    });

    it('should return 403 without admin:members:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:members:read']);

      await request(app)
        .delete(`/api/v1/admin/organizations/${testOrg.id}/members/${testMember1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent member', async () => {
      await request(app)
        .delete(`/api/v1/admin/organizations/${testOrg.id}/members/${TEST_UUIDS.MEMBER_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ==================== Group Members ====================

  describe('GET /admin/groups/:groupId/members', () => {
    beforeEach(async () => {
      // Add members to group
      await GroupMember.create({
        groupId: testGroup.id,
        userId: TEST_UUIDS.USER_REGULAR,
        addedBy: adminUser.id,
      });
    });

    it('should list group members with pagination (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify member structure
      const member = res.body.data[0];
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('userId');
      expect(member).toHaveProperty('groupId');
      expect(member).toHaveProperty('user');
    });

    it('should return 401 without authentication', async () => {
      await request(app).get(`/api/v1/admin/groups/${testGroup.id}/members`).expect(401);
    });

    it('should return 403 without admin:groups:read permission', async () => {
      const userToken = generateTestJWT({
        sub: TEST_UUIDS.USER_REGULAR,
      });

      await request(app)
        .get(`/api/v1/admin/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent group', async () => {
      await request(app)
        .get(`/api/v1/admin/groups/${TEST_UUIDS.GROUP_NONEXISTENT}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /admin/groups/:groupId/members', () => {
    it('should add member to group (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: TEST_UUIDS.USER_REGULAR_2 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('userId', TEST_UUIDS.USER_REGULAR_2);
      expect(res.body).toHaveProperty('groupId', testGroup.id);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post(`/api/v1/admin/groups/${testGroup.id}/members`)
        .send({ userId: TEST_UUIDS.USER_REGULAR_2 })
        .expect(401);
    });

    it('should return 403 without admin:groups:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:groups:read']);

      await request(app)
        .post(`/api/v1/admin/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: TEST_UUIDS.USER_REGULAR_2 })
        .expect(403);
    });

    it('should return 404 for non-existent group', async () => {
      await request(app)
        .post(`/api/v1/admin/groups/${TEST_UUIDS.GROUP_NONEXISTENT}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: TEST_UUIDS.USER_REGULAR_2 })
        .expect(404);
    });

    it('should return 409 if member already exists in group', async () => {
      // Add member first
      await GroupMember.create({
        groupId: testGroup.id,
        userId: TEST_UUIDS.USER_REGULAR_2,
        addedBy: adminUser.id,
      });

      await request(app)
        .post(`/api/v1/admin/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: TEST_UUIDS.USER_REGULAR_2 })
        .expect(409);
    });

    it('should return 422 for missing userId', async () => {
      await request(app)
        .post(`/api/v1/admin/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(422);
    });
  });

  describe('DELETE /admin/groups/:groupId/members/:userId', () => {
    beforeEach(async () => {
      // Add member to group
      await GroupMember.create({
        groupId: testGroup.id,
        userId: TEST_UUIDS.USER_REGULAR,
        addedBy: adminUser.id,
      });
    });

    it('should remove member from group (204)', async () => {
      await request(app)
        .delete(`/api/v1/admin/groups/${testGroup.id}/members/${TEST_UUIDS.USER_REGULAR}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify member is removed
      const member = await GroupMember.findByGroupAndUser(testGroup.id, TEST_UUIDS.USER_REGULAR);
      expect(member).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete(`/api/v1/admin/groups/${testGroup.id}/members/${TEST_UUIDS.USER_REGULAR}`)
        .expect(401);
    });

    it('should return 403 without admin:groups:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:groups:read']);

      await request(app)
        .delete(`/api/v1/admin/groups/${testGroup.id}/members/${TEST_UUIDS.USER_REGULAR}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent group', async () => {
      await request(app)
        .delete(`/api/v1/admin/groups/${TEST_UUIDS.GROUP_NONEXISTENT}/members/${TEST_UUIDS.USER_REGULAR}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent member in group', async () => {
      await request(app)
        .delete(`/api/v1/admin/groups/${testGroup.id}/members/${TEST_UUIDS.USER_REGULAR_2}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
