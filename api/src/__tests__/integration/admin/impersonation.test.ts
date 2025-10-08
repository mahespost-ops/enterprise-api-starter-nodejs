/**
 * Admin Impersonation Integration Tests
 *
 * Tests for admin impersonation management endpoints:
 * - POST /admin/users/{userId}/impersonate - Start system-wide impersonation
 * - DELETE /admin/impersonation/end - End impersonation (pop or terminate)
 * - GET /admin/impersonation/active - Get active impersonation sessions
 * - GET /admin/impersonation-sessions - List all impersonation sessions (history)
 * - DELETE /admin/impersonation-sessions/{sessionId} - Force-end session
 */

import request from 'supertest';
import { Application } from 'express';
import appPromise from '../../../app';
import { User } from '../../../models/User.model';
import { Organization } from '../../../models/Organization.model';
import { OrganizationMember } from '../../../models/OrganizationMember.model';
import { Environment } from '../../../models/Environment.model';
import { UserImpersonationSession } from '../../../models/UserImpersonationSession.model';
import { generateTestJWT, grantPermissions, clearAllPermissions, clearUserPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Impersonation Endpoints', () => {
  let adminUser: User;
  let targetUser: User;
  let testOrg: Organization;
  let testEnv: Environment;
  let adminToken: string;

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

    // Create target user to impersonate
    targetUser = await User.create({
      id: TEST_UUIDS.USER_REGULAR,
      email: createTestIdentifier('target') + '@test.com',
      emailVerified: true,
      givenName: 'Target',
      familyName: 'User',
      isActive: true,
      lastOrgId: testOrg.id,
      lastEnvId: testEnv.id,
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
      userId: targetUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, [
      'admin:users:read',
      'admin:users:impersonate',
      'admin:impersonation:read',
      'admin:impersonation:manage',
    ]);

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
    await UserImpersonationSession.destroy({ where: {}, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    await Environment.destroy({ where: {}, force: true });
    await Organization.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  // ============================================================================
  // POST /admin/users/{userId}/impersonate - Start system-wide impersonation
  // ============================================================================

  describe('POST /admin/users/:userId/impersonate', () => {
    it('should start system impersonation successfully (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${targetUser.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Customer support investigation',
          expiresInMinutes: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('sessionId');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('expiresAt');
      expect(res.body.impersonatedUser).toMatchObject({
        id: targetUser.id,
        email: targetUser.email,
        fullName: `${targetUser.givenName} ${targetUser.familyName}`,
      });
    });

    it('should use default duration when expiresInMinutes not provided (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${targetUser.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Customer support investigation',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('sessionId');
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should reject missing reason (422)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${targetUser.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expiresInMinutes: 30,
        });

      expect(res.status).toBe(422);
    });

    it('should reject invalid duration (422)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${targetUser.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Testing',
          expiresInMinutes: 500, // Exceeds max of 480 minutes
        });

      expect(res.status).toBe(422);
    });

    it('should reject duration too short (422)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${targetUser.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Testing',
          expiresInMinutes: 2, // Below min of 5 minutes
        });

      expect(res.status).toBe(422);
    });

    it('should reject self-impersonation (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${adminUser.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Cannot impersonate self',
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-existent user (404)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${TEST_UUIDS.NONEXISTENT}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Testing non-existent user',
        });

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated request (401)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${targetUser.id}/impersonate`)
        .send({
          reason: 'Testing',
        });

      expect(res.status).toBe(401);
    });

    it('should reject unauthorized user (403)', async () => {
      // Clear admin permissions
      await clearUserPermissions(adminUser.id);

      const res = await request(app)
        .post(`/api/v1/admin/users/${targetUser.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Testing without permission',
        });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // DELETE /admin/impersonation/end - End impersonation
  // ============================================================================

  describe('DELETE /admin/impersonation/end', () => {
    let impersonationToken: string;
    let sessionId: string;

    beforeEach(async () => {
      // Create active impersonation session
      const session = await UserImpersonationSession.create({
        originalUserId: adminUser.id,
        impersonatedUserId: targetUser.id,
        environmentId: testEnv.id,
        impersonationType: 'system',
        reason: 'Testing end impersonation',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        isActive: true,
      });

      sessionId = session.id;

      // Generate impersonation token
      impersonationToken = generateTestJWT({
        sub: targetUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        impersonation: {
          originalUserId: adminUser.id,
          effectiveUserId: targetUser.id,
          impersonationChain: [
            {
              sessionId: session.id,
              userId: targetUser.id,
              startedAt: session.startedAt.toISOString(),
              impersonationType: 'system',
              permissions: null,
            },
          ],
        },
      });
    });

    it('should end impersonation session successfully (200)', async () => {
      const res = await request(app)
        .delete('/api/v1/admin/impersonation/end')
        .set('Authorization', `Bearer ${impersonationToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.originalUser).toMatchObject({
        id: adminUser.id,
        email: adminUser.email,
      });

      // Verify session is inactive
      const session = await UserImpersonationSession.findByPk(sessionId);
      expect(session?.isActive).toBe(false);
      expect(session?.endedAt).toBeTruthy();
    });

    it('should reject when not impersonating (400)', async () => {
      // Use regular admin token (not impersonating)
      const res = await request(app)
        .delete('/api/v1/admin/impersonation/end')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request (401)', async () => {
      const res = await request(app).delete('/api/v1/admin/impersonation/end');

      expect(res.status).toBe(401);
    });
  });

  // ============================================================================
  // GET /admin/impersonation/active - Get active impersonation sessions
  // ============================================================================

  describe('GET /admin/impersonation/active', () => {
    beforeEach(async () => {
      // Create multiple active impersonation sessions
      await UserImpersonationSession.create({
        originalUserId: adminUser.id,
        impersonatedUserId: targetUser.id,
        environmentId: testEnv.id,
        impersonationType: 'system',
        reason: 'Active session 1',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true,
      });

      await UserImpersonationSession.create({
        originalUserId: adminUser.id,
        impersonatedUserId: targetUser.id,
        environmentId: testEnv.id,
        impersonationType: 'organization',
        reason: 'Active session 2',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true,
      });

      // Create inactive session (should not appear)
      await UserImpersonationSession.create({
        originalUserId: adminUser.id,
        impersonatedUserId: targetUser.id,
        environmentId: testEnv.id,
        impersonationType: 'system',
        reason: 'Ended session',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        endedAt: new Date(),
        isActive: false,
      });
    });

    it('should return active impersonation sessions (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/impersonation/active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('sessionId');
      expect(res.body.data[0]).toHaveProperty('originalUser');
      expect(res.body.data[0]).toHaveProperty('impersonatedUser');
      expect(res.body.data[0]).toHaveProperty('impersonationType');
      expect(res.body.data[0]).toHaveProperty('startedAt');
      expect(res.body.data[0]).toHaveProperty('expiresAt');
      expect(res.body.data[0].isActive).toBe(true);
    });

    it('should return empty array when no active sessions (200)', async () => {
      // End all sessions
      await UserImpersonationSession.update(
        { isActive: false, endedAt: new Date() },
        { where: { isActive: true }, validate: false }
      );

      const res = await request(app)
        .get('/api/v1/admin/impersonation/active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should reject unauthenticated request (401)', async () => {
      const res = await request(app).get('/api/v1/admin/impersonation/active');

      expect(res.status).toBe(401);
    });

    it('should reject unauthorized user (403)', async () => {
      await clearUserPermissions(adminUser.id);

      const res = await request(app)
        .get('/api/v1/admin/impersonation/active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // GET /admin/impersonation-sessions - List all impersonation sessions
  // ============================================================================

  describe('GET /admin/impersonation-sessions', () => {
    beforeEach(async () => {
      // Create test sessions with different attributes
      await UserImpersonationSession.create({
        originalUserId: adminUser.id,
        impersonatedUserId: targetUser.id,
        environmentId: testEnv.id,
        impersonationType: 'system',
        reason: 'Customer support',
        startedAt: new Date('2025-01-01T10:00:00Z'),
        expiresAt: new Date('2025-01-01T11:00:00Z'),
        isActive: true,
      });

      await UserImpersonationSession.create({
        originalUserId: adminUser.id,
        impersonatedUserId: targetUser.id,
        environmentId: testEnv.id,
        impersonationType: 'organization',
        reason: 'Manager assistance',
        startedAt: new Date('2025-01-01T12:00:00Z'),
        expiresAt: new Date('2025-01-01T13:00:00Z'),
        endedAt: new Date('2025-01-01T12:30:00Z'),
        isActive: false,
      });

      await UserImpersonationSession.create({
        originalUserId: adminUser.id,
        impersonatedUserId: targetUser.id,
        environmentId: testEnv.id,
        impersonationType: 'system',
        reason: 'Audit',
        startedAt: new Date('2025-01-02T10:00:00Z'),
        expiresAt: new Date('2025-01-02T11:00:00Z'),
        isActive: true,
      });
    });

    it('should list all impersonation sessions with pagination (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .query({ limit: 20, offset: 0 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination).toMatchObject({
        limit: 20,
        offset: 0,
        total: 3,
      });
    });

    it('should filter by impersonation type (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .query({ 'filter[impersonationType]': 'system' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(res.body.data.every((s: any) => s.impersonationType === 'system')).toBe(true);
    });

    it('should filter by isActive (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .query({ 'filter[isActive]': 'true' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(res.body.data.every((s: any) => s.isActive === true)).toBe(true);
    });

    it('should filter by originalUserId (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .query({ 'filter[originalUserId]': adminUser.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('should filter by impersonatedUserId (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .query({ 'filter[impersonatedUserId]': targetUser.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('should filter by date range (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .query({
          'filter[startedAt][gte]': '2025-01-02T00:00:00Z',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should sort by startedAt descending (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .query({ sort: '-startedAt' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dates = res.body.data.map((s: any) => new Date(s.startedAt).getTime());
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
      expect(dates[1]).toBeGreaterThanOrEqual(dates[2]);
    });

    it('should search in reason field (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .query({ search: 'Customer support' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should support field selection (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .query({ fields: 'sessionId,impersonationType,reason' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0]).toHaveProperty('sessionId');
      expect(res.body.data[0]).toHaveProperty('impersonationType');
      expect(res.body.data[0]).toHaveProperty('reason');
    });

    it('should reject unauthenticated request (401)', async () => {
      const res = await request(app).get('/api/v1/admin/impersonation-sessions');

      expect(res.status).toBe(401);
    });

    it('should reject unauthorized user (403)', async () => {
      await clearUserPermissions(adminUser.id);

      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should handle database error gracefully (500)', async () => {
      // Mock database failure
      jest.spyOn(UserImpersonationSession, 'findAndCountAll').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/v1/admin/impersonation-sessions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);

      // Restore mock
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // DELETE /admin/impersonation-sessions/{sessionId} - Force-end session
  // ============================================================================

  describe('DELETE /admin/impersonation-sessions/:sessionId', () => {
    let activeSession: UserImpersonationSession;

    beforeEach(async () => {
      activeSession = await UserImpersonationSession.create({
        originalUserId: adminUser.id,
        impersonatedUserId: targetUser.id,
        environmentId: testEnv.id,
        impersonationType: 'system',
        reason: 'Testing force-end',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true,
      });
    });

    it('should force-end impersonation session successfully (204)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/impersonation-sessions/${activeSession.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify session is inactive
      const session = await UserImpersonationSession.findByPk(activeSession.id);
      expect(session?.isActive).toBe(false);
      expect(session?.endedAt).toBeTruthy();
    });

    it('should reject unauthenticated request (401)', async () => {
      const res = await request(app).delete(`/api/v1/admin/impersonation-sessions/${activeSession.id}`);

      expect(res.status).toBe(401);
    });

    it('should reject unauthorized user (403)', async () => {
      await clearUserPermissions(adminUser.id);

      const res = await request(app)
        .delete(`/api/v1/admin/impersonation-sessions/${activeSession.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject non-existent session (404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/impersonation-sessions/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
