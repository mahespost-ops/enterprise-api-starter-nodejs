/**
 * Admin Devices Integration Tests
 *
 * Tests for admin device management endpoints
 * - GET /admin/devices - List all devices
 * - GET /admin/devices/{deviceId} - Get device details
 * - PUT /admin/devices/{deviceId} - Update device
 * - DELETE /admin/devices/{deviceId} - Revoke device
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
import { Organization } from '../../../models/Organization.model';
import { OrganizationMember } from '../../../models/OrganizationMember.model';
import { UserSession } from '../../../models/UserSession.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Devices Endpoints', () => {
  let adminUser: User;
  let regularUser: User;
  let testOrg: Organization;
  let adminToken: string;
  let testDevice1: Device;
  let testDevice2: Device;

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
      lastSeenIp: '192.168.1.100',
      lastCountry: 'US',
      lastRegion: 'California',
      lastCity: 'San Francisco',
    });

    testDevice2 = await Device.create({
      id: TEST_UUIDS.DEVICE_2,
      userId: regularUser.id,
      fingerprintHash: 'hash2',
      deviceName: 'User iPhone',
      deviceType: 'mobile',
      os: 'iOS',
      browser: 'Safari',
      trustStatus: 'pending',
      firstSeenIp: '192.168.1.101',
      lastSeenIp: '192.168.1.101',
      lastCountry: 'US',
      lastRegion: 'New York',
      lastCity: 'New York',
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, ['admin:devices:read', 'admin:devices:manage']);

    // Generate admin token
    adminToken = generateTestJWT({
      sub: adminUser.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();
    await OrganizationMember.destroy({ where: {}, force: true });
    // Clean up test organizations only (exclude system org)
    const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';
    await Organization.destroy({ where: { id: { [require('sequelize').Op.ne]: SYSTEM_ORG_ID } }, force: true });
    await UserSession.destroy({ where: {}, force: true });
    await Device.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('GET /api/v1/admin/devices', () => {
    it('should return paginated list of devices', async () => {
      const res = await request(app)
        .get('/api/v1/admin/devices')
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
      // Verify no fingerprintHash exposed
      expect(res.body.data[0]).not.toHaveProperty('fingerprintHash');
    });

    it('should filter by userId', async () => {
      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[userId]': regularUser.id });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(testDevice2.id);
    });

    it('should filter by trustStatus', async () => {
      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[trustStatus]': 'trusted' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(testDevice1.id);
    });

    it('should filter by deviceType', async () => {
      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[deviceType]': 'mobile' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(testDevice2.id);
    });

    it('should filter by isRevoked', async () => {
      await testDevice2.update({ revokedAt: new Date() });

      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[isRevoked]': 'true' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(testDevice2.id);
    });

    it('should filter by createdAt date range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[createdAt][lte]': tomorrow.toISOString() });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should sort by name ascending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: 'name' });

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Admin MacBook Pro');
    });

    it('should sort by lastUsedAt descending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: '-lastUsedAt' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should search by deviceName', async () => {
      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'MacBook' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(testDevice1.id);
    });

    it('should support field selection', async () => {
      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ fields: 'id,name' });

      expect(res.status).toBe(200);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/v1/admin/devices');

      expect(res.status).toBe(401);
    });

    it('should return 403 without admin:devices:read permission', async () => {
      await clearAllPermissions();
      // Grant only manage permission (not read)
      await grantPermissions(adminUser.id, ['admin:devices:manage']);

      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error by using invalid filter
      const res = await request(app)
        .get('/api/v1/admin/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[createdAt][gte]': 'invalid-date' });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/admin/devices/:deviceId', () => {
    it('should return device details', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/devices/${testDevice1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testDevice1.id);
      expect(res.body.name).toBe('Admin MacBook Pro');
      expect(res.body.deviceType).toBe('desktop');
      expect(res.body.trustStatus).toBe('trusted');
      expect(res.body).not.toHaveProperty('fingerprintHash');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get(`/api/v1/admin/devices/${testDevice1.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 without admin:devices:read permission', async () => {
      await clearAllPermissions();
      // Grant only manage permission (not read)
      await grantPermissions(adminUser.id, ['admin:devices:manage']);

      const res = await request(app)
        .get(`/api/v1/admin/devices/${testDevice1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent device', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/devices/${TEST_UUIDS.DEVICE_3}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should handle database errors gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/admin/devices/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
    });
  });

  describe('PUT /api/v1/admin/devices/:deviceId', () => {
    it('should update device name', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/devices/${testDevice1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated MacBook' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated MacBook');
    });

    it('should update trustStatus', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/devices/${testDevice2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trustStatus: 'trusted' });

      expect(res.status).toBe(200);
      expect(res.body.trustStatus).toBe('trusted');
    });

    it('should update multiple fields', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/devices/${testDevice1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Name',
          trustStatus: 'revoked',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Name');
      expect(res.body.trustStatus).toBe('revoked');
    });

    it('should return 422 for invalid name (too long)', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/devices/${testDevice1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'a'.repeat(101) });

      expect(res.status).toBe(422);
    });

    it('should return 422 for invalid trustStatus', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/devices/${testDevice1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trustStatus: 'invalid-status' });

      expect(res.status).toBe(422);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/devices/${testDevice1.id}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(401);
    });

    it('should return 403 without admin:devices:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:devices:read']);

      const res = await request(app)
        .put(`/api/v1/admin/devices/${testDevice1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent device', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/devices/${TEST_UUIDS.DEVICE_3}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(404);
    });

    it('should handle database errors gracefully', async () => {
      const res = await request(app)
        .put('/api/v1/admin/devices/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(422);
    });
  });

  describe('DELETE /api/v1/admin/devices/:deviceId', () => {
    it('should revoke device (soft delete)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/devices/${testDevice1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify device is revoked
      const device = await Device.findByPk(testDevice1.id);
      expect(device).not.toBeNull();
      expect(device!.revokedAt).not.toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).delete(`/api/v1/admin/devices/${testDevice1.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 without admin:devices:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:devices:read']);

      const res = await request(app)
        .delete(`/api/v1/admin/devices/${testDevice1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent device', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/devices/${TEST_UUIDS.DEVICE_3}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
