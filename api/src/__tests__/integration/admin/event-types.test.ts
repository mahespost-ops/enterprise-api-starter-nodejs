/**
 * Admin Event Types Integration Tests
 *
 * Tests for admin event type management endpoints:
 * - GET /admin/event-types - List all event types
 * - POST /admin/event-types - Create event type
 * - GET /admin/event-types/{eventTypeId} - Get event type details
 * - PUT /admin/event-types/{eventTypeId} - Update event type
 * - DELETE /admin/event-types/{eventTypeId} - Delete event type
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
import { EventType } from '../../../models/EventType.model';
import { Organization } from '../../../models/Organization.model';
import { OrganizationMember } from '../../../models/OrganizationMember.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Event Types Endpoints', () => {
  let adminUser: User;
  let regularUser: User;
  let testOrg: Organization;
  let adminToken: string;
  let regularUserToken: string;
  let testEventType1: EventType;

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

    // Create test event types (use unique verbs to avoid conflicts with seed data)
    testEventType1 = await EventType.create({
      id: TEST_UUIDS.EVENT_TYPE_1,
      verb: 'test.action1',
      httpMethod: 'POST',
      httpPath: '/api/v1/test/action1',
      description: 'Test action 1 for testing',
      isWebhookEvent: true,
    });

    await EventType.create({
      id: TEST_UUIDS.EVENT_TYPE_2,
      verb: 'test.action2',
      httpMethod: 'PUT',
      httpPath: '/api/v1/test/action2',
      description: 'Test action 2 for testing',
      isWebhookEvent: true,
    });

    await EventType.create({
      id: TEST_UUIDS.EVENT_TYPE_3,
      verb: 'test.action3',
      httpMethod: 'DELETE',
      httpPath: '/api/v1/test/action3',
      description: 'Test action 3 for testing',
      isWebhookEvent: false,
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, ['admin:events:read', 'admin:events:manage']);

    // Generate tokens
    adminToken = generateTestJWT({ sub: adminUser.id });
    regularUserToken = generateTestJWT({ sub: regularUser.id });
  });

  afterEach(async () => {
    await clearAllPermissions();
    await OrganizationMember.destroy({ where: {}, force: true });
    // Clean up test organizations only (exclude system org)
    const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';
    await Organization.destroy({ where: { id: { [Op.ne]: SYSTEM_ORG_ID } }, force: true });
    // Clean up test event types only (test.* verbs)
    await EventType.destroy({ where: { verb: { [Op.like]: 'test.%' } }, force: true });
    await User.destroy({ where: {}, force: true });
  });

  // ============================================================================
  // GET /api/v1/admin/event-types - List all event types
  // ============================================================================

  describe('GET /api/v1/admin/event-types', () => {
    it('should return paginated list of event types', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 10, offset: 0, search: 'test.' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination).toEqual({
        limit: 10,
        offset: 0,
        total: 3,
        hasMore: false,
      });
    });

    it('should filter by verb', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[verb]': 'test.action1' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].verb).toBe('test.action1');
    });

    it('should filter by httpMethod', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[httpMethod]': 'POST', search: 'test.' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].httpMethod).toBe('POST');
    });

    it('should filter by isWebhookEvent', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filter[isWebhookEvent]': 'true', search: 'test.' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((et: EventType) => et.isWebhookEvent === true)).toBe(true);
    });

    it('should filter by createdAt date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          'filter[createdAt][gte]': yesterday,
          'filter[createdAt][lte]': tomorrow,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should sort by verb ascending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: 'verb', search: 'test.' });

      expect(res.status).toBe(200);
      expect(res.body.data[0].verb).toBe('test.action1');
      expect(res.body.data[1].verb).toBe('test.action2');
      expect(res.body.data[2].verb).toBe('test.action3');
    });

    it('should sort by createdAt descending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: '-createdAt', search: 'test.' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('should search across verb, httpPath, description', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'auth' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should support field selection', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ fields: 'id,verb,httpMethod' });

      expect(res.status).toBe(200);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('verb');
      expect(res.body.data[0]).toHaveProperty('httpMethod');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/admin/event-types');

      expect(res.status).toBe(401);
    });

    it('should return 403 when user lacks admin:events:read permission', async () => {
      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
    });

    it('should handle database errors gracefully', async () => {
      // Force a database error by stubbing the model method
      const originalFindWithFilters = EventType.findWithFilters;
      EventType.findWithFilters = jest.fn().mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);

      // Restore the original method
      EventType.findWithFilters = originalFindWithFilters;
    });
  });

  // ============================================================================
  // POST /api/v1/admin/event-types - Create event type
  // ============================================================================

  describe('POST /api/v1/admin/event-types', () => {
    it('should create a new event type', async () => {
      const res = await request(app)
        .post('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          verb: 'test.new_event',
          httpMethod: 'POST',
          httpPath: '/api/v1/test/new',
          description: 'Test event creation',
          isWebhookEvent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.verb).toBe('test.new_event');
      expect(res.body.httpMethod).toBe('POST');
      expect(res.body.httpPath).toBe('/api/v1/test/new');
      expect(res.body.isWebhookEvent).toBe(true);
    });

    it('should create event type with default isWebhookEvent=false', async () => {
      const res = await request(app)
        .post('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          verb: 'test.default_webhook',
          httpMethod: 'POST',
          httpPath: '/api/v1/test/default',
          description: 'Test default webhook event value',
        });

      expect(res.status).toBe(201);
      expect(res.body.isWebhookEvent).toBe(false);
    });

    it('should return 409 when verb already exists', async () => {
      const res = await request(app)
        .post('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          verb: 'test.action1',
          httpMethod: 'POST',
          httpPath: '/api/v1/test/action1',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('should return 422 when verb is missing', async () => {
      const res = await request(app)
        .post('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          httpMethod: 'POST',
          httpPath: '/api/v1/test',
        });

      expect(res.status).toBe(422);
    });

    it('should return 422 when httpMethod is missing', async () => {
      const res = await request(app)
        .post('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          verb: 'test.event',
          httpPath: '/api/v1/test',
        });

      expect(res.status).toBe(422);
    });

    it('should return 422 when httpPath is missing', async () => {
      const res = await request(app)
        .post('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          verb: 'test.event',
          httpMethod: 'POST',
        });

      expect(res.status).toBe(422);
    });

    it('should return 422 when verb exceeds max length', async () => {
      const res = await request(app)
        .post('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          verb: 'a'.repeat(101),
          httpMethod: 'POST',
          httpPath: '/api/v1/test',
        });

      expect(res.status).toBe(422);
    });

    it('should return 422 when httpMethod is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          verb: 'test.event',
          httpMethod: 'INVALID',
          httpPath: '/api/v1/test',
        });

      expect(res.status).toBe(422);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).post('/api/v1/admin/event-types').send({
        verb: 'test.event',
        httpMethod: 'POST',
        httpPath: '/api/v1/test',
      });

      expect(res.status).toBe(401);
    });

    it('should return 403 when user lacks admin:events:manage permission', async () => {
      const res = await request(app)
        .post('/api/v1/admin/event-types')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          verb: 'test.event',
          httpMethod: 'POST',
          httpPath: '/api/v1/test',
        });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // GET /api/v1/admin/event-types/{eventTypeId} - Get event type details
  // ============================================================================

  describe('GET /api/v1/admin/event-types/:eventTypeId', () => {
    it('should return event type details', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testEventType1.id);
      expect(res.body.verb).toBe(testEventType1.verb);
      expect(res.body.httpMethod).toBe(testEventType1.httpMethod);
      expect(res.body.httpPath).toBe(testEventType1.httpPath);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get(`/api/v1/admin/event-types/${testEventType1.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when user lacks admin:events:read permission', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when event type does not exist', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/event-types/${TEST_UUIDS.EVENT_TYPE_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should handle database errors gracefully', async () => {
      const originalFindByPk = EventType.findByPk;
      EventType.findByPk = jest.fn().mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);

      EventType.findByPk = originalFindByPk;
    });
  });

  // ============================================================================
  // PUT /api/v1/admin/event-types/{eventTypeId} - Update event type
  // ============================================================================

  describe('PUT /api/v1/admin/event-types/:eventTypeId', () => {
    it('should update event type httpMethod', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          httpMethod: 'PATCH',
        });

      expect(res.status).toBe(200);
      expect(res.body.httpMethod).toBe('PATCH');
      expect(res.body.verb).toBe(testEventType1.verb); // verb unchanged
    });

    it('should update event type httpPath', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          httpPath: '/api/v2/auth/login',
        });

      expect(res.status).toBe(200);
      expect(res.body.httpPath).toBe('/api/v2/auth/login');
    });

    it('should update event type description', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Updated description');
    });

    it('should update event type isWebhookEvent', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isWebhookEvent: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.isWebhookEvent).toBe(false);
    });

    it('should update multiple fields', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          httpMethod: 'PATCH',
          httpPath: '/api/v2/auth/verify',
          description: 'Updated authentication method',
          isWebhookEvent: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.httpMethod).toBe('PATCH');
      expect(res.body.httpPath).toBe('/api/v2/auth/verify');
      expect(res.body.isWebhookEvent).toBe(false);
    });

    it('should return 422 when httpMethod is invalid', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          httpMethod: 'INVALID',
        });

      expect(res.status).toBe(422);
    });

    it('should return 422 when httpPath is too long', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          httpPath: '/api/v1/' + 'a'.repeat(500),
        });

      expect(res.status).toBe(422);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/event-types/${testEventType1.id}`)
        .send({
          httpMethod: 'PATCH',
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 when user lacks admin:events:manage permission', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          httpMethod: 'PATCH',
        });

      expect(res.status).toBe(403);
    });

    it('should return 404 when event type does not exist', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/event-types/${TEST_UUIDS.EVENT_TYPE_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          httpMethod: 'PATCH',
        });

      expect(res.status).toBe(404);
    });

    it('should handle database errors gracefully', async () => {
      const originalFindByPk = EventType.findByPk;
      EventType.findByPk = jest.fn().mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          httpMethod: 'PATCH',
        });

      expect(res.status).toBe(500);

      EventType.findByPk = originalFindByPk;
    });
  });

  // ============================================================================
  // DELETE /api/v1/admin/event-types/{eventTypeId} - Delete event type
  // ============================================================================

  describe('DELETE /api/v1/admin/event-types/:eventTypeId', () => {
    it('should delete event type', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify event type is deleted
      const deletedEventType = await EventType.findByPk(testEventType1.id);
      expect(deletedEventType).toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).delete(`/api/v1/admin/event-types/${testEventType1.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when user lacks admin:events:manage permission', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when event type does not exist', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/event-types/${TEST_UUIDS.EVENT_TYPE_NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should handle database errors gracefully', async () => {
      const originalFindByPk = EventType.findByPk;
      EventType.findByPk = jest.fn().mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .delete(`/api/v1/admin/event-types/${testEventType1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);

      EventType.findByPk = originalFindByPk;
    });
  });
});
