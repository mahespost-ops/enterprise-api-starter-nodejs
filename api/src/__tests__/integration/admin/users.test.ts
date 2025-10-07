/**
 * Admin Users Integration Tests
 *
 * Tests for admin user management endpoints
 * - GET /admin/users - List all users
 * - GET /admin/users/{userId} - Get user details
 * - PUT /admin/users/{userId} - Update user
 * - DELETE /admin/users/{userId} - Delete user
 */

import request from 'supertest';
import { Application } from 'express';
import appPromise from '../../../app';
import { User } from '../../../models/User.model';
import { Organization } from '../../../models/Organization.model';
import { OrganizationMember } from '../../../models/OrganizationMember.model';
import { Device } from '../../../models/Device.model';
import { UserSession } from '../../../models/UserSession.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Users Endpoints', () => {
  let adminUser: User;
  let regularUser: User;
  let testOrg: Organization;
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

    // Create regular user
    regularUser = await User.create({
      id: TEST_UUIDS.USER_REGULAR,
      email: createTestIdentifier('user') + '@test.com',
      emailVerified: true,
      givenName: 'Regular',
      familyName: 'User',
      isActive: true,
    });

    // Create organization memberships
    await OrganizationMember.create({
      organizationId: testOrg.id,
      userId: adminUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    await OrganizationMember.create({
      organizationId: testOrg.id,
      userId: regularUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, ['admin:users:read', 'admin:users:manage']);

    // Generate admin token
    adminToken = generateTestJWT({
      sub: adminUser.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();
    await OrganizationMember.destroy({ where: {}, force: true });
    await Organization.destroy({ where: {}, force: true });
    await UserSession.destroy({ where: {}, force: true });
    await Device.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('GET /admin/users', () => {
    it('should list all users with pagination (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toMatchObject({
        limit: expect.any(Number),
        offset: expect.any(Number),
        total: expect.any(Number),
        hasMore: expect.any(Boolean),
      });

      // Verify user structure
      const user = res.body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('isActive');
      expect(user).not.toHaveProperty('fingerprintHash'); // Security: never expose hashes
    });

    it('should filter users by isActive (200)', async () => {
      // Create inactive user
      await User.create({
        email: createTestIdentifier('inactive') + '@test.com',
        emailVerified: true,
        givenName: 'Inactive',
        familyName: 'User',
        isActive: false,
      });

      const res = await request(app)
        .get('/api/v1/admin/users?filter[isActive]=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.every((u: { isActive: boolean }) => u.isActive === true)).toBe(true);
    });

    it('should filter users by organizationId (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users?filter[organizationId]=${testOrg.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination with limit and offset (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?limit=1&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.offset).toBe(0);
    });

    it('should support sorting (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?sort=-createdAt')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should support field selection (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?fields=id,email,givenName')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const user = res.body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('givenName');
      // Note: 'name' (fullName) is a virtual field computed from givenName + familyName
    });

    it('should support search (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users?search=${adminUser.email.substring(0, 5)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 422 for invalid filter values', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?filter[isActive]=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .get('/api/v1/admin/users')
        .expect(401);
    });

    it('should return 403 when user lacks admin:users:read permission', async () => {
      const userToken = generateTestJWT({
        sub: regularUser.id,
      });

      await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 500 on database error', async () => {
      // Mock database error
      jest.spyOn(User, 'findAndCountAll').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  describe('GET /admin/users/{userId}', () => {
    it('should get user details (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: regularUser.id,
        email: regularUser.email,
        name: regularUser.fullName,
        isActive: regularUser.isActive,
      });
      expect(res.body).not.toHaveProperty('fingerprintHash');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .get(`/api/v1/admin/users/${regularUser.id}`)
        .expect(401);
    });

    it('should return 403 when user lacks admin:users:read permission', async () => {
      const userToken = generateTestJWT({
        sub: regularUser.id,
      });

      await request(app)
        .get(`/api/v1/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 404 when user does not exist', async () => {
      await request(app)
        .get(`/api/v1/admin/users/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 500 on database error', async () => {
      jest.spyOn(User, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  describe('PUT /admin/users/{userId}', () => {
    it('should update user details (200)', async () => {
      const updates = {
        name: 'Updated Name',
        givenName: 'Updated',
        familyName: 'Name',
        isActive: false,
      };

      const res = await request(app)
        .put(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body).toMatchObject({
        id: regularUser.id,
        name: updates.name,
        givenName: updates.givenName,
        familyName: updates.familyName,
        isActive: updates.isActive,
      });

      // Verify database updated
      const updated = await User.findByPk(regularUser.id);
      expect(updated?.fullName).toBe(updates.name);
      expect(updated?.isActive).toBe(updates.isActive);
    });

    it('should update email (200)', async () => {
      const newEmail = createTestIdentifier('newemail') + '@test.com';

      const res = await request(app)
        .put(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: newEmail })
        .expect(200);

      expect(res.body.email).toBe(newEmail);
    });

    it('should update phone number (200)', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phoneNumber: '+15555551234' })
        .expect(200);

      expect(res.body.phoneNumber).toBe('+15555551234');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .put(`/api/v1/admin/users/${regularUser.id}`)
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should return 403 when user lacks admin:users:manage permission', async () => {
      const userToken = generateTestJWT({
        sub: regularUser.id,
      });

      await request(app)
        .put(`/api/v1/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test' })
        .expect(403);
    });

    it('should return 404 when user does not exist', async () => {
      await request(app)
        .put(`/api/v1/admin/users/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 422 for invalid email format', async () => {
      await request(app)
        .put(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid-email' })
        .expect(422);
    });

    it('should return 422 for invalid phone number format', async () => {
      await request(app)
        .put(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phoneNumber: 'invalid-phone' })
        .expect(422);
    });

    it('should return 422 for invalid isActive value', async () => {
      await request(app)
        .put(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: 'invalid-boolean' })
        .expect(422);
    });

    it('should return 500 on database error', async () => {
      jest.spyOn(User, 'findByPk').mockResolvedValueOnce(regularUser);
      jest.spyOn(regularUser, 'save').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .put(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  describe('DELETE /admin/users/{userId}', () => {
    it('should soft-delete user (204)', async () => {
      await request(app)
        .delete(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify soft-delete (paranoid mode)
      const deleted = await User.findByPk(regularUser.id);
      expect(deleted).toBeNull(); // Not visible in normal queries

      // Verify actually soft-deleted
      const softDeleted = await User.findByPk(regularUser.id, { paranoid: false });
      expect(softDeleted).not.toBeNull();
      expect(softDeleted?.deletedAt).not.toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .delete(`/api/v1/admin/users/${regularUser.id}`)
        .expect(401);
    });

    it('should return 403 when user lacks admin:users:manage permission', async () => {
      const userToken = generateTestJWT({
        sub: regularUser.id,
      });

      await request(app)
        .delete(`/api/v1/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 404 when user does not exist', async () => {
      await request(app)
        .delete(`/api/v1/admin/users/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 500 on database error', async () => {
      jest.spyOn(User, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .delete(`/api/v1/admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });
});
