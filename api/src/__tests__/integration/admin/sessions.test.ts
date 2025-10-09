/**
 * Admin Sessions Integration Tests
 *
 * Tests for admin session management endpoints:
 * - GET /admin/sessions - List all sessions
 * - GET /admin/sessions/{sessionId} - Get session details
 * - DELETE /admin/sessions/{sessionId} - Revoke session
 * - DELETE /admin/sessions/user/{userId} - Revoke all sessions for user
 */

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: (): string => 'test-uuid-' + Math.random().toString(36).substring(7),
}));
import request from 'supertest';
import { Application } from 'express';
import appPromise from '../../../app';
import { User } from '../../../models/User.model';
import { Device } from '../../../models/Device.model';
import { UserSession } from '../../../models/UserSession.model';
import { Organization } from '../../../models/Organization.model';
import { OrganizationMember } from '../../../models/OrganizationMember.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Sessions Endpoints', () => {
  let adminUser: User;
  let regularUser: User;
  let testOrg: Organization;
  let adminToken: string;
  let testDevice1: Device;
  let testDevice2: Device;
  let testSession1: UserSession;
  let testSession3: UserSession;

  beforeAll(async () => {
    app = await appPromise;
  });

  afterAll(async () => {
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

    // Create test devices
    testDevice1 = await Device.create({
      id: TEST_UUIDS.DEVICE_1,
      userId: adminUser.id,
      fingerprintHash: 'hash1',
      deviceName: 'Admin MacBook Pro',
      deviceType: 'desktop',
      os: 'macOS',
      browser: 'Chrome',
      trustStatus: 'trusted',
      firstSeenIp: '192.168.1.100',
    });

    testDevice2 = await Device.create({
      id: TEST_UUIDS.DEVICE_2,
      userId: regularUser.id,
      fingerprintHash: 'hash2',
      deviceName: 'User iPhone',
      deviceType: 'mobile',
      os: 'iOS',
      browser: 'Safari',
      trustStatus: 'trusted',
      firstSeenIp: '192.168.1.101',
    });

    // Create test sessions
    const futureExpiry = new Date();
    futureExpiry.setDate(futureExpiry.getDate() + 30);

    testSession1 = await UserSession.create({
      id: TEST_UUIDS.SESSION_1,
      userId: adminUser.id,
      deviceId: testDevice1.id,
      refreshTokenHash: 'hash1',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      requestCount: 10,
      lastActivityType: 'api_request',
      expiresAt: futureExpiry,
      isActive: true,
    });

    await UserSession.create({
      id: TEST_UUIDS.SESSION_2,
      userId: regularUser.id,
      deviceId: testDevice2.id,
      refreshTokenHash: 'hash2',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
      requestCount: 5,
      lastActivityType: 'login',
      expiresAt: futureExpiry,
      isActive: true,
    });

    const pastExpiry = new Date();
    pastExpiry.setDate(pastExpiry.getDate() - 1);

    testSession3 = await UserSession.create({
      id: TEST_UUIDS.SESSION_3,
      userId: regularUser.id,
      deviceId: testDevice2.id,
      refreshTokenHash: 'hash3',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
      requestCount: 1,
      expiresAt: pastExpiry,
      isActive: false,
      revokedAt: new Date(),
      revokedBy: adminUser.id,
      revocationReason: 'Admin revoked',
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, ['admin:sessions:read', 'admin:sessions:manage']);

    // Generate admin token
    adminToken = generateTestJWT({
      sub: adminUser.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();
    await UserSession.destroy({ where: {}, force: true });
    await Device.destroy({ where: {}, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    await Organization.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('GET /api/v1/admin/sessions', () => {
    it('should return paginated list of sessions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 10, offset: 0 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.pagination).toEqual({
        limit: 10,
        offset: 0,
        total: expect.any(Number),
        hasMore: expect.any(Boolean),
      });
      // Verify no refreshTokenHash exposed
      expect(res.body.data[0]).not.toHaveProperty('refreshTokenHash');
    });

    it('should filter by userId', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[userId]': regularUser.id });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((s: { userId: string }) => s.userId === regularUser.id)).toBe(true);
    });

    it('should filter by deviceId', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[deviceId]': testDevice1.id });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(testSession1.id);
    });

    it('should filter by isActive', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[isActive]': 'true' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((s: { isActive: boolean }) => s.isActive === true)).toBe(true);
    });

    it('should filter by isRevoked', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[isRevoked]': 'true' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(testSession3.id);
    });

    it('should filter by createdAt date range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[createdAt][lte]': tomorrow.toISOString() });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    it('should sort by createdAt descending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: '-createdAt' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('should sort by lastAccessedAt ascending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: 'lastAccessedAt' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('should search by userAgent', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'iPhone' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should support field selection', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ fields: 'id,userId' });

      expect(res.status).toBe(200);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('userId');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/v1/admin/sessions');

      expect(res.status).toBe(401);
    });

    it('should return 403 without admin:sessions:read permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:sessions:manage']);

      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should handle database errors gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[createdAt][gte]': 'invalid-date' });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/admin/sessions/:sessionId', () => {
    it('should return session details', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/sessions/${testSession1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testSession1.id);
      expect(res.body.userId).toBe(adminUser.id);
      expect(res.body.deviceId).toBe(testDevice1.id);
      expect(res.body.isActive).toBe(true);
      expect(res.body).not.toHaveProperty('refreshTokenHash');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get(`/api/v1/admin/sessions/${testSession1.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 without admin:sessions:read permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:sessions:manage']);

      const res = await request(app)
        .get(`/api/v1/admin/sessions/${testSession1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/sessions/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should handle database errors gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
    });
  });

  describe('DELETE /api/v1/admin/sessions/:sessionId', () => {
    it('should revoke session', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/sessions/${testSession1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify session is revoked
      const session = await UserSession.findByPk(testSession1.id);
      expect(session).not.toBeNull();
      expect(session!.isActive).toBe(false);
      expect(session!.revokedAt).not.toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).delete(`/api/v1/admin/sessions/${testSession1.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 without admin:sessions:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:sessions:read']);

      const res = await request(app)
        .delete(`/api/v1/admin/sessions/${testSession1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/sessions/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/admin/sessions/user/:userId', () => {
    it('should revoke all sessions for user', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/sessions/user/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('revokedCount');
      expect(res.body.revokedCount).toBe(1); // Only active session

      // Verify sessions are revoked
      const sessions = await UserSession.findAll({
        where: { userId: regularUser.id, isActive: true },
      });
      expect(sessions.length).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).delete(`/api/v1/admin/sessions/user/${regularUser.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 without admin:sessions:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:sessions:read']);

      const res = await request(app)
        .delete(`/api/v1/admin/sessions/user/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/sessions/user/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
