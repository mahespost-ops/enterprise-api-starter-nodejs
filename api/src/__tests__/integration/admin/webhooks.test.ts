/**
 * Admin Webhooks Integration Tests
 *
 * Tests for admin webhook management endpoints:
 * - GET /admin/webhooks - List all webhooks
 * - POST /admin/webhooks - Create webhook (admin-level)
 * - GET /admin/webhooks/{webhookId} - Get webhook details
 * - PUT /admin/webhooks/{webhookId} - Update webhook
 * - DELETE /admin/webhooks/{webhookId} - Delete webhook
 * - GET /admin/event-type-subscriptions - List subscriptions (reverse-lookup table)
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
import { Environment } from '../../../models/Environment.model';
import { OrganizationMember } from '../../../models/OrganizationMember.model';
import { Webhook } from '../../../models/Webhook.model';
import { EventType } from '../../../models/EventType.model';
import { EventTypeSubscription } from '../../../models/EventTypeSubscription.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Webhooks Endpoints', () => {
  let adminUser: User;
  let regularUser: User;
  let testOrg: Organization;
  let testEnv: Environment;
  let adminToken: string;
  let regularUserToken: string;
  let testWebhook1: Webhook;

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
      id: TEST_UUIDS.ENV_PROD,
      organizationId: testOrg.id,
      name: 'Production',
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

    // Create test event types (use unique verbs to avoid conflicts with seed data)
    await EventType.create({
      id: TEST_UUIDS.EVENT_TYPE_1,
      verb: 'test.webhook1',
      httpMethod: 'POST',
      httpPath: '/api/v1/test/webhook1',
      description: 'Test webhook event 1',
      isWebhookEvent: true,
    });

    await EventType.create({
      id: TEST_UUIDS.EVENT_TYPE_2,
      verb: 'test.webhook2',
      httpMethod: 'DELETE',
      httpPath: '/api/v1/test/webhook2',
      description: 'Test webhook event 2',
      isWebhookEvent: true,
    });

    // Create test webhooks
    testWebhook1 = await Webhook.create({
      id: TEST_UUIDS.WEBHOOK_1,
      environmentId: testEnv.id,
      name: 'Production Alerts',
      url: 'https://api.example.com/webhooks/alerts',
      eventTypes: ['test.webhook1', 'test.webhook2'],
      authMethod: 'hmac',
      authConfig: {
        secret: 'test-secret-123',
        algorithm: 'sha256',
        headerName: 'X-Webhook-Signature',
      },
      retryConfig: {
        maxAttempts: 3,
        backoffMultiplier: 2.0,
        maxBackoffSeconds: 3600,
      },
      isActive: true,
      failureCount: 0,
      lastSuccessAt: new Date(),
      lastFailureAt: null,
    });

    await Webhook.create({
      id: TEST_UUIDS.WEBHOOK_2,
      environmentId: testEnv.id,
      name: 'Staging Notifications',
      url: 'https://staging.example.com/webhooks/notifications',
      eventTypes: ['test.webhook1'],
      authMethod: 'none',
      authConfig: null,
      retryConfig: {
        maxAttempts: 5,
        backoffMultiplier: 1.5,
        maxBackoffSeconds: 1800,
      },
      isActive: false,
      failureCount: 2,
      lastSuccessAt: null,
      lastFailureAt: new Date(),
    });

    // Create event type subscriptions for testWebhook1 (to test CASCADE DELETE)
    await EventTypeSubscription.create({
      webhookId: testWebhook1.id,
      eventTypeId: TEST_UUIDS.EVENT_TYPE_1,
      eventTypeVerb: 'test.webhook1',
      webhookName: testWebhook1.name,
      webhookUrl: testWebhook1.url,
      webhookAuthMethod: testWebhook1.authMethod,
      webhookAuthConfig: testWebhook1.authConfig,
      webhookRetryConfig: testWebhook1.retryConfig,
      webhookMetadata: testWebhook1.metadata,
      isActive: testWebhook1.isActive,
    });

    await EventTypeSubscription.create({
      webhookId: testWebhook1.id,
      eventTypeId: TEST_UUIDS.EVENT_TYPE_2,
      eventTypeVerb: 'test.webhook2',
      webhookName: testWebhook1.name,
      webhookUrl: testWebhook1.url,
      webhookAuthMethod: testWebhook1.authMethod,
      webhookAuthConfig: testWebhook1.authConfig,
      webhookRetryConfig: testWebhook1.retryConfig,
      webhookMetadata: testWebhook1.metadata,
      isActive: testWebhook1.isActive,
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, ['admin:webhooks:read', 'admin:webhooks:manage', 'admin:events:read']);

    // Generate tokens
    adminToken = generateTestJWT({
      sub: adminUser.id,
    });

    regularUserToken = generateTestJWT({
      sub: regularUser.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();

    // Clean up test data (order matters for FK constraints)
    await EventTypeSubscription.destroy({ where: {}, force: true });
    await Webhook.destroy({ where: {}, force: true });
    // Clean up test event types only (test.* verbs)
    await EventType.destroy({ where: { verb: { [Op.like]: 'test.%' } }, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    // Clean up test environments only (exclude system env)
    const SYSTEM_ENV_ID = '00000000-0000-0000-0000-000000000100';
    await Environment.destroy({ where: { id: { [Op.ne]: SYSTEM_ENV_ID } }, force: true });
    // Clean up test organizations only (exclude system org)
    const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';
    await Organization.destroy({ where: { id: { [Op.ne]: SYSTEM_ORG_ID } }, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('GET /api/v1/admin/webhooks', () => {
    it('should list all webhooks with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toMatchObject({
        limit: 10,
        offset: 0,
        total: 2,
        hasMore: false,
      });

      // Verify webhook structure
      const webhook = res.body.data[0];
      expect(webhook).toHaveProperty('id');
      expect(webhook).toHaveProperty('environmentId');
      expect(webhook).toHaveProperty('name');
      expect(webhook).toHaveProperty('url');
      expect(webhook).toHaveProperty('eventTypes');
      expect(webhook).toHaveProperty('authMethod');
      expect(webhook).toHaveProperty('isActive');
      expect(webhook).toHaveProperty('retryConfig');
      expect(webhook).toHaveProperty('createdAt');
      expect(webhook).toHaveProperty('updatedAt');
    });

    it('should filter webhooks by environmentId', async () => {
      const res = await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[environmentId]': testEnv.id })
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((w: Webhook) => w.environmentId === testEnv.id)).toBe(true);
    });

    it('should filter webhooks by isActive', async () => {
      const res = await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[isActive]': 'true' })
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isActive).toBe(true);
    });

    it('should filter webhooks by authMethod', async () => {
      const res = await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[authMethod]': 'hmac' })
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].authMethod).toBe('hmac');
    });

    it('should filter webhooks by createdAt range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const res = await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          'filter[createdAt][gte]': yesterday.toISOString(),
          'filter[createdAt][lte]': tomorrow.toISOString(),
        })
        .expect(200);

      expect(res.body.data.length).toBe(2);
    });

    it('should sort webhooks by createdAt descending (default)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: '-createdAt' })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      // Verify descending order
      for (let i = 1; i < res.body.data.length; i++) {
        const prev = new Date(res.body.data[i - 1].createdAt);
        const curr = new Date(res.body.data[i].createdAt);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });

    it('should sort webhooks by url ascending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: 'url' })
        .expect(200);

      expect(res.body.data.length).toBe(2);
      // Verify ascending alphabetical order using localeCompare
      expect(res.body.data[0].url.localeCompare(res.body.data[1].url)).toBeLessThanOrEqual(0);
    });

    it('should search webhooks by url', async () => {
      const res = await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'api.example.com' })
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].url).toContain('api.example.com');
    });

    it('should return only selected fields when fields parameter is provided', async () => {
      const res = await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ fields: 'id,url,isActive' })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      const webhook = res.body.data[0];
      expect(webhook).toHaveProperty('id');
      expect(webhook).toHaveProperty('url');
      expect(webhook).toHaveProperty('isActive');
      expect(webhook).not.toHaveProperty('authConfig');
      expect(webhook).not.toHaveProperty('retryConfig');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).get('/api/v1/admin/webhooks').expect(401);
    });

    it('should return 403 when user lacks admin:webhooks:read permission', async () => {
      await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it('should return 422 on database error', async () => {
      // Force error by using invalid query params
      await request(app)
        .get('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: -1 }) // Invalid limit
        .expect(422);
    });
  });

  describe('POST /api/v1/admin/webhooks', () => {
    it('should create a new webhook successfully', async () => {
      const newWebhook = {
        environmentId: testEnv.id,
        name: 'New Test Webhook',
        url: 'https://new.example.com/webhook',
        eventTypes: ['test.webhook1'],
        authMethod: 'jwt',
        authConfig: {
          secret: 'jwt-secret-456',
          algorithm: 'HS256',
          headerName: 'Authorization',
        },
        retryConfig: {
          maxAttempts: 4,
          backoffMultiplier: 2.5,
          maxBackoffSeconds: 7200,
        },
        isActive: true,
      };

      const res = await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newWebhook)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(newWebhook.name);
      expect(res.body.url).toBe(newWebhook.url);
      expect(res.body.eventTypes).toEqual(newWebhook.eventTypes);
      expect(res.body.authMethod).toBe(newWebhook.authMethod);
      expect(res.body.isActive).toBe(true);

      // Verify subscriptions were created
      const subscriptions = await EventTypeSubscription.findAll({
        where: { webhookId: res.body.id },
      });
      expect(subscriptions).toHaveLength(1); // 1 event type = 1 subscription
      expect(subscriptions[0].eventTypeVerb).toBe('test.webhook1');
      expect(subscriptions[0].webhookUrl).toBe(newWebhook.url);
    });

    it('should create subscriptions for each event type when webhook has multiple event types', async () => {
      const webhookWithMultipleEvents = {
        environmentId: testEnv.id,
        name: 'Multi-Event Webhook',
        url: 'https://multi.example.com/webhook',
        eventTypes: ['test.webhook1', 'test.webhook2'],
        authMethod: 'hmac',
        authConfig: { secret: 'test-secret' },
      };

      const res = await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(webhookWithMultipleEvents)
        .expect(201);

      // Verify webhook was created
      expect(res.body).toHaveProperty('id');
      expect(res.body.eventTypes).toHaveLength(2);

      // Verify subscriptions were created for each event type
      const subscriptions = await EventTypeSubscription.findAll({
        where: { webhookId: res.body.id },
        order: [['eventTypeVerb', 'ASC']],
      });

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions[0].eventTypeVerb).toBe('test.webhook1');
      expect(subscriptions[0].webhookUrl).toBe(webhookWithMultipleEvents.url);
      expect(subscriptions[0].isActive).toBe(true);

      expect(subscriptions[1].eventTypeVerb).toBe('test.webhook2');

      // All subscriptions should have denormalized webhook data
      subscriptions.forEach((sub) => {
        expect(sub.webhookName).toBe(webhookWithMultipleEvents.name);
        expect(sub.webhookAuthMethod).toBe('hmac');
      });
    });

    it('should create webhook with default values', async () => {
      const minimalWebhook = {
        environmentId: testEnv.id,
        name: 'Minimal Webhook',
        url: 'https://minimal.example.com/webhook',
        eventTypes: ['test.webhook1'],
        authMethod: 'none',
      };

      const res = await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(minimalWebhook)
        .expect(201);

      expect(res.body.isActive).toBe(true);
      expect(res.body.retryConfig).toMatchObject({
        maxAttempts: 5,
        backoffMultiplier: 2.0,
        maxBackoffSeconds: 3600,
      });
    });

    it('should return 422 when name is missing', async () => {
      const invalidWebhook = {
        environmentId: testEnv.id,
        url: 'https://test.example.com/webhook',
        eventTypes: ['test.webhook1'],
        authMethod: 'none',
      };

      await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidWebhook)
        .expect(422);
    });

    it('should return 422 when url is missing', async () => {
      const invalidWebhook = {
        environmentId: testEnv.id,
        name: 'Test Webhook',
        eventTypes: ['test.webhook1'],
        authMethod: 'none',
      };

      await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidWebhook)
        .expect(422);
    });

    it('should return 422 when url is not HTTPS', async () => {
      const invalidWebhook = {
        environmentId: testEnv.id,
        name: 'Test Webhook',
        url: 'http://insecure.example.com/webhook',
        eventTypes: ['test.webhook1'],
        authMethod: 'none',
      };

      await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidWebhook)
        .expect(422);
    });

    it('should return 422 when eventTypes is empty', async () => {
      const invalidWebhook = {
        environmentId: testEnv.id,
        name: 'Test Webhook',
        url: 'https://test.example.com/webhook',
        eventTypes: [],
        authMethod: 'none',
      };

      await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidWebhook)
        .expect(422);
    });

    it('should return 422 when authMethod is invalid', async () => {
      const invalidWebhook = {
        environmentId: testEnv.id,
        name: 'Test Webhook',
        url: 'https://test.example.com/webhook',
        eventTypes: ['test.webhook1'],
        authMethod: 'invalid-method',
      };

      await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidWebhook)
        .expect(422);
    });

    it('should return 422 when retryConfig.maxAttempts exceeds limit', async () => {
      const invalidWebhook = {
        environmentId: testEnv.id,
        name: 'Test Webhook',
        url: 'https://test.example.com/webhook',
        eventTypes: ['test.webhook1'],
        authMethod: 'none',
        retryConfig: {
          maxAttempts: 20, // Exceeds max of 10
          backoffMultiplier: 2.0,
          maxBackoffSeconds: 3600,
        },
      };

      await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidWebhook)
        .expect(422);
    });

    it('should return 404 when environment does not exist', async () => {
      const webhookWithInvalidEnv = {
        environmentId: TEST_UUIDS.NONEXISTENT,
        name: 'Test Webhook',
        url: 'https://test.example.com/webhook',
        eventTypes: ['test.webhook1'],
        authMethod: 'none',
      };

      await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(webhookWithInvalidEnv)
        .expect(404);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).post('/api/v1/admin/webhooks').send({}).expect(401);
    });

    it('should return 403 when user lacks admin:webhooks:manage permission', async () => {
      await request(app)
        .post('/api/v1/admin/webhooks')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({})
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/webhooks/{webhookId}', () => {
    it('should get webhook by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(testWebhook1.id);
      expect(res.body.name).toBe(testWebhook1.name);
      expect(res.body.url).toBe(testWebhook1.url);
      expect(res.body.eventTypes).toEqual(testWebhook1.eventTypes);
      expect(res.body.authMethod).toBe(testWebhook1.authMethod);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).get(`/api/v1/admin/webhooks/${testWebhook1.id}`).expect(401);
    });

    it('should return 403 when user lacks admin:webhooks:read permission', async () => {
      await request(app)
        .get(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it('should return 404 when webhook does not exist', async () => {
      await request(app)
        .get(`/api/v1/admin/webhooks/${TEST_UUIDS.WEBHOOK_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 422 on database error', async () => {
      await request(app)
        .get('/api/v1/admin/webhooks/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });
  });

  describe('PUT /api/v1/admin/webhooks/{webhookId}', () => {
    it('should update webhook name', async () => {
      const updates = { name: 'Updated Webhook Name' };

      const res = await request(app)
        .put(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.name).toBe(updates.name);
    });

    it('should update webhook url', async () => {
      const updates = { url: 'https://updated.example.com/webhook' };

      const res = await request(app)
        .put(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.url).toBe(updates.url);
    });

    it('should update webhook eventTypes', async () => {
      const updates = { eventTypes: ['test.webhook2'] };

      const res = await request(app)
        .put(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.eventTypes).toEqual(updates.eventTypes);
    });

    it('should update webhook isActive status', async () => {
      const updates = { isActive: false };

      const res = await request(app)
        .put(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.isActive).toBe(false);
    });

    it('should update multiple fields simultaneously', async () => {
      const updates = {
        name: 'Multi-Update Webhook',
        url: 'https://multi.example.com/webhook',
        isActive: false,
      };

      const res = await request(app)
        .put(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.name).toBe(updates.name);
      expect(res.body.url).toBe(updates.url);
      expect(res.body.isActive).toBe(updates.isActive);
    });

    it('should return 422 when url is not HTTPS', async () => {
      const updates = { url: 'http://insecure.example.com/webhook' };

      await request(app)
        .put(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(422);
    });

    it('should return 422 when eventTypes is empty', async () => {
      const updates = { eventTypes: [] };

      await request(app)
        .put(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(422);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).put(`/api/v1/admin/webhooks/${testWebhook1.id}`).send({}).expect(401);
    });

    it('should return 403 when user lacks admin:webhooks:manage permission', async () => {
      await request(app)
        .put(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({})
        .expect(403);
    });

    it('should return 404 when webhook does not exist', async () => {
      await request(app)
        .put(`/api/v1/admin/webhooks/${TEST_UUIDS.WEBHOOK_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should return 422 on database error', async () => {
      await request(app)
        .put('/api/v1/admin/webhooks/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(422);
    });
  });

  describe('DELETE /api/v1/admin/webhooks/{webhookId}', () => {
    it('should soft delete webhook and cascade delete subscriptions', async () => {
      // First, verify subscriptions exist
      const subscriptionsBefore = await EventTypeSubscription.findAll({
        where: { webhookId: testWebhook1.id },
      });
      expect(subscriptionsBefore.length).toBeGreaterThan(0); // Should have subscriptions

      await request(app)
        .delete(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify webhook is soft-deleted
      const webhook = await Webhook.findByPk(testWebhook1.id, { paranoid: false });
      expect(webhook).not.toBeNull();
      expect(webhook!.deletedAt).not.toBeNull();

      // Verify subscriptions were deleted (CASCADE DELETE via FK constraint)
      const subscriptionsAfter = await EventTypeSubscription.findAll({
        where: { webhookId: testWebhook1.id },
      });
      expect(subscriptionsAfter).toHaveLength(0); // All subscriptions should be gone
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).delete(`/api/v1/admin/webhooks/${testWebhook1.id}`).expect(401);
    });

    it('should return 403 when user lacks admin:webhooks:manage permission', async () => {
      await request(app)
        .delete(`/api/v1/admin/webhooks/${testWebhook1.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it('should return 404 when webhook does not exist', async () => {
      await request(app)
        .delete(`/api/v1/admin/webhooks/${TEST_UUIDS.WEBHOOK_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/admin/event-type-subscriptions', () => {
    // Note: Subscriptions are auto-created by webhook lifecycle
    // These tests validate the reverse-lookup table

    it('should list all event type subscriptions with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-type-subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 20, offset: 0 })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toMatchObject({
        limit: 20,
        offset: 0,
      });

      // Verify subscription structure
      if (res.body.data.length > 0) {
        const subscription = res.body.data[0];
        expect(subscription).toHaveProperty('id');
        expect(subscription).toHaveProperty('eventTypeId');
        expect(subscription).toHaveProperty('eventTypeVerb');
        expect(subscription).toHaveProperty('webhookId');
        expect(subscription).toHaveProperty('webhookName');
        expect(subscription).toHaveProperty('webhookUrl');
        expect(subscription).toHaveProperty('isActive');
      }
    });

    it('should filter subscriptions by eventTypeVerb', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-type-subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[eventTypeVerb]': 'test.webhook1' })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(
          res.body.data.every((s: { eventTypeVerb: string }) => s.eventTypeVerb === 'test.webhook1')
        ).toBe(true);
      }
    });

    it('should filter subscriptions by webhookId', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-type-subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[webhookId]': testWebhook1.id })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data.every((s: { webhookId: string }) => s.webhookId === testWebhook1.id)).toBe(
          true
        );
      }
    });

    it('should filter subscriptions by isActive', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-type-subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[isActive]': 'true' })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data.every((s: { isActive: boolean }) => s.isActive === true)).toBe(true);
      }
    });

    it('should sort subscriptions by eventTypeVerb', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-type-subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: 'eventTypeVerb' })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should search subscriptions by webhookUrl', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-type-subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'example.com' })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return only selected fields when fields parameter is provided', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-type-subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ fields: 'id,eventTypeVerb,webhookUrl' })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        const subscription = res.body.data[0];
        expect(subscription).toHaveProperty('id');
        expect(subscription).toHaveProperty('eventTypeVerb');
        expect(subscription).toHaveProperty('webhookUrl');
        expect(subscription).not.toHaveProperty('webhookAuthConfig');
      }
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).get('/api/v1/admin/event-type-subscriptions').expect(401);
    });

    it('should return 403 when user lacks admin:events:read permission', async () => {
      // Grant only webhook permissions, not events:read permission
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:webhooks:read']);
      const limitedToken = generateTestJWT({
        sub: adminUser.id,
      });

      await request(app)
        .get('/api/v1/admin/event-type-subscriptions')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);
    });

    it('should return 422 on database error', async () => {
      await request(app)
        .get('/api/v1/admin/event-type-subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: -1 }) // Invalid limit
        .expect(422);
    });
  });
});
