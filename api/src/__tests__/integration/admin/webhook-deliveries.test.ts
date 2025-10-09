/**
 * Admin Webhook Deliveries - Integration Tests (RED Phase)
 * Tests for POST /admin/webhook-deliveries/{deliveryId}/retry
 *
 * This follows TDD best practices:
 * 1. RED: Write failing tests first
 * 2. GREEN: Implement minimum code to pass
 * 3. REFACTOR: Optimize while keeping tests green
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
import { Webhook } from '../../../models/Webhook.model';
import { WebhookDelivery } from '../../../models/WebhookDelivery.model';
import { Environment } from '../../../models/Environment.model';
import { Organization } from '../../../models/Organization.model';
import { Event } from '../../../models/Event.model';
import { HTTP_STATUS } from '../../../constants/http-status.constants';
import { WEBHOOK_DELIVERY_STATUS } from '../../../constants/webhook.constants';
import { TEST_UUIDS } from '../../helpers/test-constants';
import {
  generateTestJWT,
  clearAllPermissions,
  grantPermissions,
} from '../../helpers/auth.helpers';

let app: Application;

describe('Admin Webhook Deliveries - POST /admin/webhook-deliveries/:deliveryId/retry', () => {
  let adminUser: User;
  let adminToken: string;
  let testOrg: Organization;
  let testEnv: Environment;
  let testWebhook: Webhook;
  let testDeliveryFailed: WebhookDelivery;
  let testDeliverySuccess: WebhookDelivery;

  beforeAll(async () => {
    app = await appPromise;

    // Create admin user
    adminUser = await User.create({
      id: TEST_UUIDS.USER_ADMIN,
      email: 'admin@test.com',
      givenName: 'Admin',
      familyName: 'User',
      emailVerified: true,
      isActive: true,
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, ['admin:webhooks:manage', 'admin:webhooks:read']);

    // Generate admin token
    adminToken = generateTestJWT({ sub: adminUser.id });

    // Create test organization
    testOrg = await Organization.create({
      id: TEST_UUIDS.ORG_TEST,
      name: 'Test Organization',
      slug: 'test-org',
      isActive: true,
    });

    // Create test environment
    testEnv = await Environment.create({
      id: TEST_UUIDS.ENV_PROD,
      organizationId: testOrg.id,
      name: 'Production',
      type: 'live',
      isDefault: true,
      isActive: true,
    });

    // Create test webhook
    testWebhook = await Webhook.create({
      id: TEST_UUIDS.WEBHOOK_1,
      environmentId: testEnv.id,
      name: 'Test Webhook',
      url: 'https://api.example.com/webhook',
      eventTypes: ['user.created'],
      authMethod: 'none',
      isActive: true,
    });

    // Create test events (required by FK constraints)
    await Event.create({
      id: TEST_UUIDS.EVENT_1,
      environmentId: testEnv.id,
      organizationId: testOrg.id,
      organizationName: testOrg.name,
      environmentName: testEnv.name,
      verb: 'user.created',
      actorType: 'User',
      actor: { type: 'User', id: adminUser.id },
      object: { type: 'User', id: adminUser.id },
      description: 'User created',
      timestamp: new Date(),
      isWebhookEvent: true,
    });

    await Event.create({
      id: TEST_UUIDS.EVENT_2,
      environmentId: testEnv.id,
      organizationId: testOrg.id,
      organizationName: testOrg.name,
      environmentName: testEnv.name,
      verb: 'user.updated',
      actorType: 'User',
      actor: { type: 'User', id: adminUser.id },
      object: { type: 'User', id: adminUser.id },
      description: 'User updated',
      timestamp: new Date(),
      isWebhookEvent: true,
    });

    // Create failed delivery (can be retried)
    testDeliveryFailed = await WebhookDelivery.create({
      id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
      webhookId: testWebhook.id,
      eventId: TEST_UUIDS.EVENT_1,
      status: WEBHOOK_DELIVERY_STATUS.FAILED,
      attempt: 3,
      httpStatusCode: 500,
      requestPayload: { eventType: 'user.created' },
      responseBody: JSON.stringify({ error: 'Internal Server Error' }),
      scheduledFor: new Date(),
    });

    // Create successful delivery (cannot be retried)
    testDeliverySuccess = await WebhookDelivery.create({
      id: 'dddddddd-dddd-dddd-dddd-dddddddddd02',
      webhookId: testWebhook.id,
      eventId: TEST_UUIDS.EVENT_2,
      status: WEBHOOK_DELIVERY_STATUS.SUCCESS,
      attempt: 1,
      httpStatusCode: 200,
      requestPayload: { eventType: 'user.updated' },
      responseBody: JSON.stringify({ success: true }),
      scheduledFor: new Date(),
    });
  });

  afterAll(async () => {
    // Cleanup
    await WebhookDelivery.destroy({ where: {}, force: true });
    await Webhook.destroy({ where: {}, force: true });
    await Event.destroy({ where: {}, force: true });
    // Clean up test environments only (exclude system env)
    const SYSTEM_ENV_ID = '00000000-0000-0000-0000-000000000100';
    await Environment.destroy({ where: { id: { [Op.ne]: SYSTEM_ENV_ID } }, force: true });
    // Clean up test organizations only (exclude system org)
    const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';
    await Organization.destroy({ where: { id: { [Op.ne]: SYSTEM_ORG_ID } }, force: true });
    await clearAllPermissions();
    await User.destroy({ where: {}, force: true });

    const { sequelize } = await import('../../../models');
    await sequelize.close();
  });

  describe('POST /admin/webhook-deliveries/:deliveryId/retry', () => {
    it('should retry failed delivery and return 202 Accepted', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/webhook-deliveries/${testDeliveryFailed.id}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HTTP_STATUS.ACCEPTED);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('retry');

      // Verify delivery status changed to 'retrying'
      const updated = await WebhookDelivery.findByPk(testDeliveryFailed.id);
      expect(updated!.status).toBe(WEBHOOK_DELIVERY_STATUS.RETRYING);
      expect(updated!.nextRetryAt).toBeDefined();
    });

    it('should return 400 when trying to retry non-failed delivery', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/webhook-deliveries/${testDeliverySuccess.id}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('status');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .post(`/api/v1/admin/webhook-deliveries/${testDeliveryFailed.id}/retry`)
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should return 403 when user lacks admin:webhooks:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:webhooks:read']);
      const limitedToken = generateTestJWT({ sub: adminUser.id });

      await request(app)
        .post(`/api/v1/admin/webhook-deliveries/${testDeliveryFailed.id}/retry`)
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(HTTP_STATUS.FORBIDDEN);

      // Restore permissions
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:webhooks:manage', 'admin:webhooks:read']);
    });

    it('should return 404 when delivery not found', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/webhook-deliveries/${TEST_UUIDS.NONEXISTENT}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 422 when deliveryId is invalid UUID', async () => {
      const res = await request(app)
        .post('/api/v1/admin/webhook-deliveries/invalid-uuid/retry')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

      expect(res.body).toHaveProperty('message');
    });
  });
});
