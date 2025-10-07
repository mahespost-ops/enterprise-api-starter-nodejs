/**
 * Integration Tests: Events Endpoints
 * Phase 2 Batch 5 - TDD RED Phase
 *
 * Tests for:
 * - GET /api/v1/orgs/{orgId}/envs/{envId}/events - List events (cursor pagination)
 * - GET /api/v1/orgs/{orgId}/envs/{envId}/events/{eventId} - Get event details
 */

import request from 'supertest';
import { type Application } from 'express';
import appPromise from '../../app';
import { User } from '../../models/User.model';
import { Organization } from '../../models/Organization.model';
import { Environment } from '../../models/Environment.model';
import { OrganizationMember } from '../../models/OrganizationMember.model';
import { Event } from '../../models/Event.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../helpers/auth.helpers';
import { TEST_UUIDS } from '../helpers/test-constants';
import { HTTP_STATUS } from '../../constants/http-status.constants';

describe('Events API Integration Tests', () => {
  let app: Application;
  let testUser: User;
  let testOrg: Organization;
  let testEnv: Environment;
  let testEvent1: Event;
  let testEvent2: Event;
  let testEvent3: Event;
  let authToken: string;

  beforeAll(async () => {
    // Resolve app promise
    app = await appPromise;
  });

  beforeEach(async () => {
    // Generate unique identifiers for this test run
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const testEmail = `event-test-${uniqueId}@example.com`;
    const testSlug = `test-org-event-${uniqueId}`;

    // Create test user
    testUser = await User.create({
      email: testEmail,
      givenName: 'Event',
      familyName: 'Test User',
      emailVerified: true,
      isActive: true,
      lastOrgId: null,
      lastEnvId: null,
    });

    // Create test organization
    testOrg = await Organization.create({
      name: 'Test Organization',
      slug: testSlug,
      description: 'Test organization for event tests',
      defaultEnvId: null,
      isActive: true,
    });

    // Create test environment
    testEnv = await Environment.create({
      organizationId: testOrg.id,
      name: 'Live',
      description: 'Production environment',
      type: 'live',
      isDefault: true,
      isActive: true,
    });

    // Update organization default environment
    await testOrg.update({ defaultEnvId: testEnv.id });

    // Create organization membership
    await OrganizationMember.create({
      userId: testUser.id,
      organizationId: testOrg.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Update user's last org/env
    await testUser.update({
      lastOrgId: testOrg.id,
      lastEnvId: testEnv.id,
    });

    // Create test events with different timestamps (newest first)
    testEvent1 = await Event.create({
      environmentId: testEnv.id,
      organizationId: testOrg.id,
      organizationName: testOrg.name,
      environmentName: testEnv.name,
      verb: 'auth.login',
      actorType: 'User',
      actor: {
        type: 'User',
        id: testUser.id,
        name: testUser.fullName,
        email: testUser.email,
        impersonationContext: null,
      },
      object: {
        type: 'Session',
        id: TEST_UUIDS.SESSION_ACTIVE,
      },
      target: null,
      audit: {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        requestMethod: 'POST',
        requestPath: '/api/v1/auth/verify-token',
        responseStatus: 200,
      },
      description: 'User logged in successfully',
      timestamp: new Date('2025-10-04T12:00:00Z'),
      isWebhookEvent: true,
    });

    testEvent2 = await Event.create({
      environmentId: testEnv.id,
      organizationId: testOrg.id,
      organizationName: testOrg.name,
      environmentName: testEnv.name,
      verb: 'device.update',
      actorType: 'User',
      actor: {
        type: 'User',
        id: testUser.id,
        name: testUser.fullName,
        email: testUser.email,
      },
      object: {
        type: 'Device',
        id: TEST_UUIDS.DEVICE_TRUSTED,
        name: 'Chrome on MacBook',
      },
      target: null,
      audit: {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        requestMethod: 'PUT',
        requestPath: `/api/v1/users/me/devices/${TEST_UUIDS.DEVICE_TRUSTED}`,
      },
      description: 'User updated device name',
      timestamp: new Date('2025-10-04T11:00:00Z'),
      isWebhookEvent: false,
    });

    testEvent3 = await Event.create({
      environmentId: testEnv.id,
      organizationId: testOrg.id,
      organizationName: testOrg.name,
      environmentName: testEnv.name,
      verb: 'system.cleanup',
      actorType: 'System',
      actor: {
        type: 'System',
        id: 'system',
        name: 'System',
      },
      object: {
        type: 'Task',
        id: 'cleanup-job-001',
      },
      target: null,
      audit: null,
      description: 'System cleanup task executed',
      timestamp: new Date('2025-10-04T10:00:00Z'),
      isWebhookEvent: false,
    });

    // Grant permissions to test user
    await grantPermissions(testUser.id, ['events:read']);

    // Generate auth token
    authToken = generateTestJWT({
      sub: testUser.id,
      orgId: testOrg.id,
      envId: testEnv.id,
      user: {
        email: testUser.email,
        fullName: testUser.fullName,
      },
    });
  });

  afterEach(async () => {
    // Clean up in reverse order of foreign key dependencies
    await clearAllPermissions();
    await Event.destroy({ where: {}, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    await Environment.destroy({ where: {}, force: true });
    await Organization.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  afterAll(async () => {
    const { sequelize } = await import('../../models');
    await sequelize.close();
  });

  /**
   * GET /api/v1/orgs/{orgId}/envs/{envId}/events
   */
  describe('GET /api/v1/orgs/:orgId/envs/:envId/events - List events', () => {
    it('should list events with cursor pagination (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 2 });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      // Verify events are sorted by timestamp DESC (newest first)
      expect(res.body.data[0].id).toBe(testEvent1.id);
      expect(res.body.data[1].id).toBe(testEvent2.id);

      // Verify cursor pagination structure
      expect(res.body.pagination).toMatchObject({
        limit: 2,
        hasMore: true,
      });
      expect(res.body.pagination).toHaveProperty('nextCursor');
      expect(typeof res.body.pagination.nextCursor).toBe('string');

      // Verify event structure
      const event = res.body.data[0];
      expect(event).toMatchObject({
        id: testEvent1.id,
        environmentId: testEnv.id,
        verb: 'auth.login',
        actorType: 'User',
        organizationId: testOrg.id,
        organizationName: testOrg.name,
        environmentName: testEnv.name,
        isWebhookEvent: true,
      });
      expect(event).toHaveProperty('actor');
      expect(event).toHaveProperty('object');
      expect(event).toHaveProperty('timestamp');
    });

    it('should navigate to next page using cursor (200)', async () => {
      // Get first page
      const res1 = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 2 });

      expect(res1.status).toBe(HTTP_STATUS.OK);
      expect(res1.body.pagination.hasMore).toBe(true);
      const cursor = res1.body.pagination.nextCursor;

      // Get second page using cursor
      const res2 = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ cursor, limit: 2 });

      expect(res2.status).toBe(HTTP_STATUS.OK);
      expect(res2.body.data.length).toBe(1);
      expect(res2.body.data[0].id).toBe(testEvent3.id);
      expect(res2.body.pagination.hasMore).toBe(false);
      expect(res2.body.pagination.nextCursor).toBeUndefined();
    });

    it('should filter events by verb (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 'filter[verb]': 'auth.login' });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].verb).toBe('auth.login');
    });

    it('should filter events by actorType (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 'filter[actorType]': 'System' });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].actorType).toBe('System');
    });

    it('should filter webhook events only (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 'filter[isWebhookEvent]': 'true' });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isWebhookEvent).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events`);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 403 when user lacks permission', async () => {
      // Revoke permission
      await clearAllPermissions();

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 403 when accessing different org context', async () => {
      const unauthorizedToken = generateTestJWT({
        sub: testUser.id,
        orgId: TEST_UUIDS.ORG_UNAUTHORIZED,
        envId: TEST_UUIDS.ENV_SANDBOX,
        user: {
          email: testUser.email,
          fullName: testUser.fullName,
        },
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events`)
        .set('Authorization', `Bearer ${unauthorizedToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 422 when orgId is invalid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/invalid-uuid/envs/${testEnv.id}/events`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 500 when database error occurs', async () => {
      // Mock Event.findWithCursor to throw error
      const mockFindWithCursor = jest.spyOn(Event, 'findWithCursor').mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body).toHaveProperty('message');

      mockFindWithCursor.mockRestore();
    });
  });

  /**
   * GET /api/v1/orgs/{orgId}/envs/{envId}/events/{eventId}
   */
  describe('GET /api/v1/orgs/:orgId/envs/:envId/events/:eventId - Get event details', () => {
    it('should retrieve event details (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events/${testEvent1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body).toMatchObject({
        id: testEvent1.id,
        environmentId: testEnv.id,
        verb: 'auth.login',
        actorType: 'User',
        organizationId: testOrg.id,
        organizationName: testOrg.name,
        environmentName: testEnv.name,
        isWebhookEvent: true,
      });
      expect(res.body.actor).toMatchObject({
        type: 'User',
        id: testUser.id,
        name: testUser.fullName,
        email: testUser.email,
      });
      expect(res.body).toHaveProperty('object');
      expect(res.body).toHaveProperty('audit');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events/${testEvent1.id}`);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 403 when user lacks permission', async () => {
      // Revoke permission
      await clearAllPermissions();

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events/${testEvent1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 when event does not exist', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 422 when eventId is invalid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events/invalid-uuid`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 500 when database error occurs', async () => {
      // Mock Event.findByPk to throw error
      const mockFindByPk = jest.spyOn(Event, 'findByPk').mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/events/${testEvent1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body).toHaveProperty('message');

      mockFindByPk.mockRestore();
    });
  });
});
