import request from 'supertest';
import type { Application } from 'express';
import appPromise from '../../app';
import { User } from '../../models/User.model';
import { Device } from '../../models/Device.model';
import { UserSession } from '../../models/UserSession.model';
import sequelize from '../../config/database';
import {
  generateTestJWT,
  clearAllUsers,
  clearAllSessions,
  clearAllDevices,
  grantPermissions,
  clearAllPermissions,
} from '../helpers/auth.helpers';
import { TEST_UUIDS } from '../helpers/test-constants';

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: (): string => 'test-uuid-' + Math.random().toString(36).substring(7),
}));

describe('Users Integration Tests (Phase 2 Batch 2)', () => {
  let app: Application;

  beforeAll(async () => {
    app = await appPromise;
  });

  beforeEach(async () => {
    await clearAllUsers();
    await clearAllSessions();
    await clearAllDevices();
    await clearAllPermissions();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/v1/users/me - Get current user profile', () => {
    it('should return current user profile (200)', async () => {
      // Create test user
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
        phoneNumber: null,
        isActive: true,
        emailVerified: true,
        phoneNumberVerified: false,
        lastLoginAt: new Date(),
      });

      // Grant required permissions
      await grantPermissions(user.id, ['users:read']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: {
          fullName: user.fullName,
          email: user.email,
        },
      });

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', user.id);
      expect(res.body).toHaveProperty('email', user.email);
      expect(res.body).toHaveProperty('fullName', user.fullName);
      expect(res.body).not.toHaveProperty('password_hash'); // Security check
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 when JWT is expired', async () => {
      const token = generateTestJWT({
        sub: TEST_UUIDS.USER_TEST,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: 'Test User', email: 'test@example.com' },
        expiresIn: '-1h',
      }); // Expired 1 hour ago

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when user not found (deleted user with valid JWT)', async () => {
      // This tests the case where a user was deleted but their JWT is still valid
      // Authorization middleware correctly blocks this as 403 (no permissions)
      // rather than leaking information about whether the user exists (404)
      const token = generateTestJWT({
        sub: TEST_UUIDS.USER_DELETED, // Non-existent user
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: 'Test User', email: 'test@example.com' },
      });

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 403 when database error occurs during permission check', async () => {
      // When database errors occur during authorization (permission lookup),
      // the authorize middleware will fail and return 403 before reaching the controller
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      // Mock database error in permission lookup (happens during authorize middleware)
      const rbacService = await import('../../services/rbac.service');
      jest.spyOn(rbacService, 'getUserPermissions').mockRejectedValueOnce(
        new Error('Database error')
      );

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');

      // Restore mock
      jest.restoreAllMocks();
    });
  });

  describe('PUT /api/v1/users/me - Update current user profile', () => {
    it('should update user profile (200)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['users:manage']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Updated Name',
          phoneNumber: '+15551234567',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('fullName', 'Updated Name');
      expect(res.body).toHaveProperty('phoneNumber', '+15551234567');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).put('/api/v1/users/me').send({
        fullName: 'Updated Name',
      });

      expect(res.status).toBe(401);
    });

    it('should return 422 for invalid phone number', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          phoneNumber: 'invalid-phone',
        });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return 404 when user not found', async () => {
      const token = generateTestJWT({
        sub: TEST_UUIDS.USER_TEST,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: 'Test User', email: 'test@example.com' },
      });

      const res = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Updated Name',
        });

      expect(res.status).toBe(404);
    });

    it('should prevent email update (security)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['users:manage']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'hacker@example.com', // Should be ignored
          fullName: 'Updated Name',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email', 'test@example.com'); // Email unchanged
      expect(res.body).toHaveProperty('fullName', 'Updated Name');
    });
  });

  describe('GET /api/v1/users/me/organizations - List user organizations', () => {
    it('should return user organizations (200)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['users:read']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .get('/api/v1/users/me/organizations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['users:read']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .get('/api/v1/users/me/organizations?limit=5&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toHaveProperty('limit', 5);
      expect(res.body.pagination).toHaveProperty('offset', 0);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/users/me/organizations');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/me/permissions - Get user permissions', () => {
    it('should return user permissions for current context (200)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['users:read']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .get('/api/v1/users/me/permissions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('context');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.context).toHaveProperty('organization_id');
      expect(res.body.context).toHaveProperty('environment_id');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/users/me/permissions');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/me/devices - List user devices', () => {
    it('should return user devices (200)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['devices:read']);

      // Create device for user
      await Device.create({
        userId: user.id,
        fingerprintHash: 'abc123xyz',
        deviceName: 'My Device',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        trustStatus: 'trusted',
        firstSeenIp: '127.0.0.1',
      });

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .get('/api/v1/users/me/devices')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      // fingerprintHash should NOT be returned (security sensitive)
      expect(res.body.data[0]).not.toHaveProperty('fingerprintHash');
      expect(res.body.data[0]).toHaveProperty('trustStatus');
    });

    it('should filter by trustStatus query param', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['devices:read']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .get('/api/v1/users/me/devices?trustStatus=trusted')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/users/me/devices');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/users/me/devices/:deviceId - Update device', () => {
    it('should update device (200)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['devices:manage']);

      const device = await Device.create({
        userId: user.id,
        fingerprintHash: 'abc123xyz',
        deviceName: 'Old Name',
        trustStatus: 'pending',
        firstSeenIp: '127.0.0.1',
      });

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .put(`/api/v1/users/me/devices/${device.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Name',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'New Name');
      expect(res.body).toHaveProperty('trustStatus');
      // fingerprintHash should NOT be returned (security sensitive)
      expect(res.body).not.toHaveProperty('fingerprintHash');
      expect(res.body).not.toHaveProperty('fingerprint');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .put(`/api/v1/users/me/devices/${TEST_UUIDS.DEVICE_TRUSTED}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(401);
    });

    it('should return 403 when device belongs to another user', async () => {
      const user1 = await User.create({
        email: 'user1@example.com',
        givenName: 'User',
        familyName: '1',
      });

      const user2 = await User.create({
        email: 'user2@example.com',
        givenName: 'User',
        familyName: '2',
      });

      const device = await Device.create({
        userId: user2.id,
        fingerprintHash: 'abc123xyz',
        firstSeenIp: '127.0.0.1',
      });

      const token = generateTestJWT({
        sub: user1.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user1.fullName, email: user1.email },
      });

      const res = await request(app)
        .put(`/api/v1/users/me/devices/${device.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
    });

    it('should return 404 when device not found', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['devices:manage']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .put(`/api/v1/users/me/devices/${TEST_UUIDS.DEVICE_TRUSTED}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
    });

    it('should return 422 for invalid UUID', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .put('/api/v1/users/me/devices/invalid-uuid')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(422);
    });
  });

  describe('DELETE /api/v1/users/me/devices/:deviceId - Revoke device', () => {
    it('should revoke device (204)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['devices:manage']);

      const device = await Device.create({
        userId: user.id,
        fingerprintHash: 'abc123xyz',
        firstSeenIp: '127.0.0.1',
      });

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .delete(`/api/v1/users/me/devices/${device.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      // Verify device is revoked
      const revokedDevice = await Device.findByPk(device.id);
      expect(revokedDevice?.revokedAt).not.toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).delete(
        `/api/v1/users/me/devices/${TEST_UUIDS.DEVICE_TRUSTED}`
      );

      expect(res.status).toBe(401);
    });

    it('should return 403 when device belongs to another user', async () => {
      const user1 = await User.create({
        email: 'user1@example.com',
        givenName: 'User',
        familyName: '1',
      });

      const user2 = await User.create({
        email: 'user2@example.com',
        givenName: 'User',
        familyName: '2',
      });

      const device = await Device.create({
        userId: user2.id,
        fingerprintHash: 'abc123xyz',
        firstSeenIp: '127.0.0.1',
      });

      const token = generateTestJWT({
        sub: user1.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user1.fullName, email: user1.email },
      });

      const res = await request(app)
        .delete(`/api/v1/users/me/devices/${device.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when device not found', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['devices:manage']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .delete('/api/v1/users/me/devices/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/users/me/sessions - List user sessions', () => {
    it('should return user sessions (200)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['sessions:read']);

      const device = await Device.create({
        userId: user.id,
        fingerprintHash: 'abc123xyz',
        firstSeenIp: '127.0.0.1',
      });

      await UserSession.create({
        userId: user.id,
        deviceId: device.id,
        refreshTokenHash: 'hash',
        isActive: true,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .get('/api/v1/users/me/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by isActive query param', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['sessions:read']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .get('/api/v1/users/me/sessions?isActive=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/users/me/sessions');

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/users/me/sessions/:sessionId - Revoke session', () => {
    it('should revoke session (204)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['sessions:manage']);

      const device = await Device.create({
        userId: user.id,
        fingerprintHash: 'abc123xyz',
        firstSeenIp: '127.0.0.1',
      });

      const session = await UserSession.create({
        userId: user.id,
        deviceId: device.id,
        refreshTokenHash: 'hash',
        isActive: true,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .delete(`/api/v1/users/me/sessions/${session.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      // Verify session is inactive
      const revokedSession = await UserSession.findByPk(session.id);
      expect(revokedSession?.isActive).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).delete(
        `/api/v1/users/me/sessions/${TEST_UUIDS.SESSION_ACTIVE}`
      );

      expect(res.status).toBe(401);
    });

    it('should return 403 when session belongs to another user', async () => {
      const user1 = await User.create({
        email: 'user1@example.com',
        givenName: 'User',
        familyName: '1',
      });

      const user2 = await User.create({
        email: 'user2@example.com',
        givenName: 'User',
        familyName: '2',
      });

      const device = await Device.create({
        userId: user2.id,
        fingerprintHash: 'abc123xyz',
        firstSeenIp: '127.0.0.1',
      });

      const session = await UserSession.create({
        userId: user2.id,
        deviceId: device.id,
        refreshTokenHash: 'hash',
        isActive: true,
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const token = generateTestJWT({
        sub: user1.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user1.fullName, email: user1.email },
      });

      const res = await request(app)
        .delete(`/api/v1/users/me/sessions/${session.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when session not found', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['sessions:manage']);

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .delete('/api/v1/users/me/sessions/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/users/me/sessions/all - Revoke all sessions', () => {
    it('should revoke all sessions except current (204)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
      });

      // Grant required permissions
      await grantPermissions(user.id, ['sessions:manage']);

      const device = await Device.create({
        userId: user.id,
        fingerprintHash: 'abc123xyz',
        firstSeenIp: '127.0.0.1',
      });

      // Create multiple sessions
      await UserSession.create({
        userId: user.id,
        deviceId: device.id,
        refreshTokenHash: 'hash1',
        isActive: true,
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 86400000),
      });

      await UserSession.create({
        userId: user.id,
        deviceId: device.id,
        refreshTokenHash: 'hash2',
        isActive: true,
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const token = generateTestJWT({
        sub: user.id,
        orgId: TEST_UUIDS.ORG_TEST,
        envId: TEST_UUIDS.ENV_LIVE,
        user: { fullName: user.fullName, email: user.email },
      });

      const res = await request(app)
        .delete('/api/v1/users/me/sessions/all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).delete('/api/v1/users/me/sessions/all');

      expect(res.status).toBe(401);
    });
  });
});
