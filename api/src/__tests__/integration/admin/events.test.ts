/**
 * Admin Events Integration Tests
 *
 * Tests for admin event management endpoints:
 * - GET /admin/events - List all events (cursor pagination)
 * - GET /admin/events/{eventId} - Get event details
 *
 * Note: Events use CURSOR pagination (high-volume endpoint, 10M+ records)
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
import { Event } from '../../../models/Event.model';
import { Organization } from '../../../models/Organization.model';
import { Environment } from '../../../models/Environment.model';
import { OrganizationMember } from '../../../models/OrganizationMember.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Events Endpoints', () => {
  let adminUser: User;
  let regularUser: User;
  let testOrg: Organization;
  let testEnv: Environment;
  let adminToken: string;
  let testEvent1: Event;

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

    // Create test environment
    testEnv = await Environment.create({
      id: TEST_UUIDS.ENV_LIVE,
      organizationId: testOrg.id,
      name: 'Live',
      type: 'live',
      isActive: true,
      isDefault: true,
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
      lastEnvId: testEnv.id,
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

    // Create test events
    testEvent1 = await Event.create({
      id: TEST_UUIDS.EVENT_1,
      environmentId: testEnv.id,
      verb: 'auth.login',
      actorType: 'User',
      actor: {
        type: 'User',
        id: adminUser.id,
        name: 'Admin User',
        email: adminUser.email,
      },
      object: {
        type: 'Device',
        id: TEST_UUIDS.DEVICE_1,
        name: 'MacBook Pro',
      },
      target: null,
      audit: {
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome',
        requestMethod: 'POST',
        requestPath: '/api/v1/auth/login',
      },
      description: 'Admin User logged in from MacBook Pro',
      timestamp: new Date('2025-10-03T14:30:00Z'),
      organizationId: testOrg.id,
      organizationName: testOrg.name,
      environmentName: testEnv.name,
      isWebhookEvent: true,
    });

    await Event.create({
      id: TEST_UUIDS.EVENT_2,
      environmentId: testEnv.id,
      verb: 'device.update',
      actorType: 'User',
      actor: {
        type: 'User',
        id: regularUser.id,
        name: 'Regular User',
        email: regularUser.email,
      },
      object: {
        type: 'Device',
        id: TEST_UUIDS.DEVICE_2,
        name: 'iPhone',
      },
      target: null,
      audit: {
        ipAddress: '10.0.0.50',
        userAgent: 'Safari',
        requestMethod: 'PUT',
        requestPath: '/api/v1/devices/' + TEST_UUIDS.DEVICE_2,
      },
      description: 'Regular User updated device iPhone',
      timestamp: new Date('2025-10-02T10:00:00Z'),
      organizationId: testOrg.id,
      organizationName: testOrg.name,
      environmentName: testEnv.name,
      isWebhookEvent: false,
    });

    await Event.create({
      id: TEST_UUIDS.EVENT_3,
      environmentId: testEnv.id,
      verb: 'user.created',
      actorType: 'System',
      actor: {
        type: 'System',
        id: 'system',
        name: 'System',
      },
      object: {
        type: 'User',
        id: regularUser.id,
        name: 'Regular User',
        email: regularUser.email,
      },
      target: null,
      audit: {
        ipAddress: '10.0.0.1',
        userAgent: 'Internal',
        requestMethod: 'POST',
        requestPath: '/api/v1/auth/register',
      },
      description: 'User Regular User was created',
      timestamp: new Date('2025-10-01T08:00:00Z'),
      organizationId: testOrg.id,
      organizationName: testOrg.name,
      environmentName: testEnv.name,
      isWebhookEvent: true,
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, ['admin:events:read']);

    // Generate admin token
    adminToken = generateTestJWT({
      sub: adminUser.id,
      orgId: testOrg.id,
      envId: testEnv.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();

    // Clean up test data
    await Event.destroy({ where: {}, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    // Clean up test environments only (exclude system env)
    const SYSTEM_ENV_ID = '00000000-0000-0000-0000-000000000100';
    await Environment.destroy({ where: { id: { [Op.ne]: SYSTEM_ENV_ID } }, force: true });
    // Clean up test organizations only (exclude system org)
    const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';
    await Organization.destroy({ where: { id: { [Op.ne]: SYSTEM_ORG_ID } }, force: true });
    await User.destroy({ where: {}, force: true });
  });

  // ===========================
  // GET /admin/events - List all events
  // ===========================
  describe('GET /admin/events', () => {
    it('should return paginated events with cursor', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toHaveProperty('limit', 2);
      expect(res.body.pagination).toHaveProperty('hasMore');
      expect(res.body.pagination).toHaveProperty('nextCursor');

      // Events should be sorted by timestamp DESC (newest first)
      expect(new Date(res.body.data[0].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(res.body.data[1].timestamp).getTime()
      );
    });

    it('should filter events by verb', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[verb]': 'auth.login' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].verb).toBe('auth.login');
    });

    it('should filter events by multiple verbs (in operator)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[verb][in]': 'auth.login,user.created' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((e: Event) => ['auth.login', 'user.created'].includes(e.verb))).toBe(true);
    });

    it('should filter events by actorType', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[actorType]': 'System' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].actorType).toBe('System');
    });

    it('should filter events by organizationId', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[organizationId]': testOrg.id });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((e: Event) => e.organizationId === testOrg.id)).toBe(true);
    });

    it('should filter events by environmentId', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[environmentId]': testEnv.id });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((e: Event) => e.environmentId === testEnv.id)).toBe(true);
    });

    it('should filter events by isWebhookEvent', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[isWebhookEvent]': 'true' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((e: Event) => e.isWebhookEvent === true)).toBe(true);
    });

    it('should filter events by timestamp range', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          'filter[timestamp][gte]': '2025-10-02T00:00:00Z',
          'filter[timestamp][lte]': '2025-10-03T23:59:59Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((e: Event) => {
        const ts = new Date(e.timestamp);
        return ts >= new Date('2025-10-02T00:00:00Z') && ts <= new Date('2025-10-03T23:59:59Z');
      })).toBe(true);
    });

    it('should sort events by timestamp descending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: '-timestamp' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(1);

      // Verify descending order
      for (let i = 0; i < res.body.data.length - 1; i++) {
        expect(new Date(res.body.data[i].timestamp).getTime()).toBeGreaterThanOrEqual(
          new Date(res.body.data[i + 1].timestamp).getTime()
        );
      }
    });

    it('should search events by description', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'logged in' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toContain('logged in');
    });

    it('should support field selection', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ fields: 'id,verb,timestamp' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Should only have requested fields (plus denormalized fields always included)
      const event = res.body.data[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('verb');
      expect(event).toHaveProperty('timestamp');

      // Should not have non-requested fields
      expect(event).not.toHaveProperty('actor');
      expect(event).not.toHaveProperty('object');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/admin/events');

      expect(res.status).toBe(401);
    });

    it('should return 403 if user lacks admin:events:read permission', async () => {
      const regularToken = generateTestJWT({
        sub: regularUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
      });

      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('should handle database errors gracefully', async () => {
      // Force a database error by providing invalid filter value
      const res = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[timestamp][gte]': 'invalid-date' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ===========================
  // GET /admin/events/{eventId} - Get event details
  // ===========================
  describe('GET /admin/events/:eventId', () => {
    it('should return event details', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/events/${testEvent1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testEvent1.id);
      expect(res.body.verb).toBe('auth.login');
      expect(res.body.actorType).toBe('User');
      expect(res.body.actor).toHaveProperty('id', adminUser.id);
      expect(res.body.object).toHaveProperty('type', 'Device');
      expect(res.body.audit).toHaveProperty('ipAddress', '192.168.1.100');
      expect(res.body).toHaveProperty('organizationName', testOrg.name);
      expect(res.body).toHaveProperty('environmentName', testEnv.name);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get(`/api/v1/admin/events/${testEvent1.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 if user lacks admin:events:read permission', async () => {
      const regularToken = generateTestJWT({
        sub: regularUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
      });

      const res = await request(app)
        .get(`/api/v1/admin/events/${testEvent1.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 if event not found', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/events/${TEST_UUIDS.EVENT_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should handle database errors gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/admin/events/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
