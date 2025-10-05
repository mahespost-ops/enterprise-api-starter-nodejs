/**
 * Members Integration Tests
 * Phase 2 Batch 4 - TDD RED Phase
 *
 * Tests for organization member management endpoints (12 endpoints)
 *
 * Endpoints tested:
 * 1. GET /api/v1/orgs/{orgId}/members - List organization members
 * 2. POST /api/v1/orgs/{orgId}/members - Invite member
 * 3. GET /api/v1/orgs/{orgId}/members/{memberId} - Get member details
 * 4. PUT /api/v1/orgs/{orgId}/members/{memberId} - Update member
 * 5. DELETE /api/v1/orgs/{orgId}/members/{memberId} - Remove member
 * 6. GET /api/v1/orgs/{orgId}/members/{memberId}/organizations - Get member's organizations
 * 7. GET /api/v1/orgs/{orgId}/members/{memberId}/permissions - Get member's permissions
 * 8. POST /api/v1/orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate - Start org-scoped impersonation
 * 9. DELETE /api/v1/orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate - End org-scoped impersonation
 * 10. GET /api/v1/orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate - Get impersonation status
 */

import request from 'supertest';
import { type Application } from 'express';
import appPromise from '../../app';
import sequelize from '../../config/database';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../helpers/test-constants';
import { User } from '../../models/User.model';
import { Organization } from '../../models/Organization.model';
import { Environment } from '../../models/Environment.model';
import { OrganizationMember } from '../../models/OrganizationMember.model';
import { HTTP_STATUS } from '../../constants/http-status.constants';

describe('Members API', () => {
  let app: Application;
  let testOrg: Organization;
  let testEnv: Environment;
  let adminUser: User;
  let testUser: User;
  let testMember: OrganizationMember;
  let adminToken: string;

  beforeAll(async () => {
    app = await appPromise;
  });

  beforeEach(async () => {
    // Clear permissions from previous tests
    await clearAllPermissions();

    // Create test organization
    testOrg = await Organization.create({
      name: 'Test Organization',
      slug: createTestIdentifier('org'),
      isActive: true,
    });

    // Create test environment
    testEnv = await Environment.create({
      organizationId: testOrg.id,
      name: 'Live',
      type: 'live',
      isDefault: true,
      isActive: true,
    });

    // Create admin user
    adminUser = await User.create({
      email: createTestIdentifier('admin', 'email'),
      givenName: 'Admin',
      familyName: 'User',
      emailVerified: true,
      isActive: true,
      lastOrgId: testOrg.id,
      lastEnvId: testEnv.id,
    });

    // Create admin member
    await OrganizationMember.create({
      organizationId: testOrg.id,
      userId: adminUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Create test user (to be managed as member)
    testUser = await User.create({
      email: createTestIdentifier('testuser', 'email'),
      givenName: 'Test',
      familyName: 'User',
      emailVerified: true,
      isActive: true,
      lastOrgId: testOrg.id,
      lastEnvId: testEnv.id,
    });

    // Create test member
    testMember = await OrganizationMember.create({
      organizationId: testOrg.id,
      userId: testUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Grant permissions to admin user
    await grantPermissions(adminUser.id, [
      'members:read',
      'members:write',
      'members:invite',
      'members:delete',
      'members:impersonate',
    ]);

    // Generate admin token
    adminToken = generateTestJWT({
      sub: adminUser.id,
      orgId: testOrg.id,
      envId: testEnv.id,
      user: {
        email: adminUser.email,
        fullName: adminUser.fullName,
      },
    });
  });

  afterEach(async () => {
    await OrganizationMember.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Environment.destroy({ where: {}, force: true });
    await Organization.destroy({ where: {}, force: true });
    await clearAllPermissions();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ============================================================================
  // 1. GET /orgs/{orgId}/members - List organization members
  // ============================================================================
  describe('GET /api/v1/orgs/:orgId/members', () => {
    it('should list organization members (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('userId');
      expect(res.body.data[0]).toHaveProperty('organizationId');
      expect(res.body.data[0]).toHaveProperty('status');
      // Should NOT expose internal fields
      expect(res.body.data[0]).not.toHaveProperty('invitationToken');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking members:read permission', async () => {
      // Revoke permissions for test user
      await clearAllPermissions();
      await grantPermissions(testUser.id, []); // No permissions

      const noPermsToken = generateTestJWT({
        sub: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        user: {
          email: testUser.email,
          fullName: testUser.fullName,
        },
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    it('should filter by status query parameter', async () => {
      // Create invited member
      const invitedUser = await User.create({
        email: createTestIdentifier('invited', 'email'),
        displayName: 'Invited User',
        isActive: false,
      });

      await OrganizationMember.create({
        organizationId: testOrg.id,
        userId: invitedUser.id,
        status: 'invited',
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members?filter[status]=invited`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.every((m: any) => m.status === 'invited')).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members?limit=1&offset=0`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.limit).toBe(1);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(OrganizationMember, 'findAll').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 2. POST /orgs/{orgId}/members - Invite member
  // ============================================================================
  describe('POST /api/v1/orgs/:orgId/members', () => {
    it('should invite new member via email (201)', async () => {
      const newEmail = createTestIdentifier('newmember', 'email');

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: newEmail,
          displayName: 'New Member',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('invited');
      expect(res.body).not.toHaveProperty('invitationToken');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/members`)
        .send({
          email: createTestIdentifier('newmember', 'email'),
          displayName: 'New Member',
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking members:invite permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['members:read'],
      });

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${noPermsToken}`)
        .send({
          email: createTestIdentifier('newmember', 'email'),
          displayName: 'New Member',
        });

      expect(res.status).toBe(403);
    });

    it('should return 422 when email is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'New Member',
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('email');
    });

    it('should return 409 when user already a member', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: testUser.email,
          displayName: 'Existing User',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already a member');
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(OrganizationMember, 'create').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: createTestIdentifier('newmember', 'email'),
          displayName: 'New Member',
        });

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 3. GET /orgs/{orgId}/members/{memberId} - Get member details
  // ============================================================================
  describe('GET /api/v1/orgs/:orgId/members/:memberId', () => {
    it('should get member details (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testMember.id);
      expect(res.body.userId).toBe(testUser.id);
      expect(res.body.organizationId).toBe(testOrg.id);
      expect(res.body).not.toHaveProperty('invitationToken');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking members:read permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: [],
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when member not found', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 422 when memberId is invalid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/invalid-uuid`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(OrganizationMember, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 4. PUT /orgs/{orgId}/members/{memberId} - Update member
  // ============================================================================
  describe('PUT /api/v1/orgs/:orgId/members/:memberId', () => {
    it('should update member status (200)', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'suspended',
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testMember.id);
      expect(res.body.status).toBe('suspended');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .send({ status: 'suspended' });

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking members:write permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['members:read'],
      });

      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${noPermsToken}`)
        .send({ status: 'suspended' });

      expect(res.status).toBe(403);
    });

    it('should return 404 when member not found', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/members/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' });

      expect(res.status).toBe(404);
    });

    it('should return 422 when status is invalid', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' });

      expect(res.status).toBe(422);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(OrganizationMember.prototype, 'save').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' });

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 5. DELETE /orgs/{orgId}/members/{memberId} - Remove member
  // ============================================================================
  describe('DELETE /api/v1/orgs/:orgId/members/:memberId', () => {
    it('should remove member from organization (204)', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify member is deleted
      const deletedMember = await OrganizationMember.findByPk(testMember.id);
      expect(deletedMember).toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking members:delete permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['members:read'],
      });

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when member not found', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/members/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 422 when memberId is invalid UUID', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/members/invalid-uuid`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(OrganizationMember.prototype, 'destroy').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 6. GET /orgs/{orgId}/members/{memberId}/organizations - Get member's organizations
  // ============================================================================
  describe('GET /api/v1/orgs/:orgId/members/:memberId/organizations', () => {
    it('should get member\'s organizations (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}/organizations`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}/organizations`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking members:read permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: [],
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}/organizations`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when member not found', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${TEST_UUIDS.NONEXISTENT}/organizations`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return empty array when member has no organizations', async () => {
      // Create member without organizations
      const orphanUser = await User.create({
        email: createTestIdentifier('orphan', 'email'),
        displayName: 'Orphan User',
        isActive: true,
      });

      const orphanMember = await OrganizationMember.create({
        organizationId: testOrg.id,
        userId: orphanUser.id,
        status: 'invited',
      });

      // Delete their organization membership
      await OrganizationMember.destroy({ where: { userId: orphanUser.id } });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${orphanMember.id}/organizations`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(OrganizationMember, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}/organizations`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 7. GET /orgs/{orgId}/members/{memberId}/permissions - Get member's permissions
  // ============================================================================
  describe('GET /api/v1/orgs/:orgId/members/:memberId/permissions', () => {
    it('should get member\'s effective permissions (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.permissions).toBeInstanceOf(Array);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}/permissions`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking members:read permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: [],
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}/permissions`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when member not found', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${TEST_UUIDS.NONEXISTENT}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return empty permissions for member without roles', async () => {
      // Create member without role assignments
      const noRolesUser = await User.create({
        email: createTestIdentifier('noroles', 'email'),
        displayName: 'No Roles User',
        isActive: true,
      });

      const noRolesMember = await OrganizationMember.create({
        organizationId: testOrg.id,
        userId: noRolesUser.id,
        status: 'active',
        joinedAt: new Date(),
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${noRolesMember.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.permissions).toEqual([]);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(OrganizationMember, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/members/${testMember.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 8. POST /orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate - Start impersonation
  // ============================================================================
  describe('POST /api/v1/orgs/:orgId/envs/:envId/members/:memberId/impersonate', () => {
    it('should start org-scoped impersonation (200)', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Support troubleshooting',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('impersonationChain');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .send({ reason: 'Support troubleshooting' });

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking members:impersonate permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['members:read'],
      });

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${noPermsToken}`)
        .send({ reason: 'Support troubleshooting' });

      expect(res.status).toBe(403);
    });

    it('should return 404 when member not found', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${TEST_UUIDS.NONEXISTENT}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Support troubleshooting' });

      expect(res.status).toBe(404);
    });

    it('should return 422 when reason is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('reason');
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(OrganizationMember, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Support troubleshooting' });

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 9. DELETE /orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate - End impersonation
  // ============================================================================
  describe('DELETE /api/v1/orgs/:orgId/envs/:envId/members/:memberId/impersonate', () => {
    it('should end org-scoped impersonation (200)', async () => {
      // Start impersonation first
      const impersonationToken = generateTestJWT({
        userId: TEST_UUIDS.USER_ADMIN,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['members:read'],
        effectiveUserId: testUser.id,
        impersonationChain: [
          {
            impersonatorUserId: TEST_UUIDS.USER_ADMIN,
            impersonatedUserId: testUser.id,
            startedAt: new Date().toISOString(),
            reason: 'Support troubleshooting',
          },
        ],
      });

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${impersonationToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.impersonationChain).toBeUndefined();
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when not currently impersonating', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not currently impersonating');
    });

    it('should return 404 when member not found', async () => {
      const impersonationToken = generateTestJWT({
        userId: TEST_UUIDS.USER_ADMIN,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['members:read'],
        effectiveUserId: testUser.id,
        impersonationChain: [
          {
            impersonatorUserId: TEST_UUIDS.USER_ADMIN,
            impersonatedUserId: testUser.id,
            startedAt: new Date().toISOString(),
            reason: 'Support troubleshooting',
          },
        ],
      });

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${TEST_UUIDS.NONEXISTENT}/impersonate`)
        .set('Authorization', `Bearer ${impersonationToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 422 when memberId is invalid UUID', async () => {
      const impersonationToken = generateTestJWT({
        userId: TEST_UUIDS.USER_ADMIN,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['members:read'],
        effectiveUserId: testUser.id,
        impersonationChain: [
          {
            impersonatorUserId: TEST_UUIDS.USER_ADMIN,
            impersonatedUserId: testUser.id,
            startedAt: new Date().toISOString(),
            reason: 'Support troubleshooting',
          },
        ],
      });

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/invalid-uuid/impersonate`)
        .set('Authorization', `Bearer ${impersonationToken}`);

      expect(res.status).toBe(422);
    });

    it('should return 500 on server error', async () => {
      const impersonationToken = generateTestJWT({
        userId: TEST_UUIDS.USER_ADMIN,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['members:read'],
        effectiveUserId: testUser.id,
        impersonationChain: [
          {
            impersonatorUserId: TEST_UUIDS.USER_ADMIN,
            impersonatedUserId: testUser.id,
            startedAt: new Date().toISOString(),
            reason: 'Support troubleshooting',
          },
        ],
      });

      jest.spyOn(OrganizationMember, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${impersonationToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 10. GET /orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate - Get impersonation status
  // ============================================================================
  describe('GET /api/v1/orgs/:orgId/envs/:envId/members/:memberId/impersonate', () => {
    it('should get current impersonation status (200)', async () => {
      const impersonationToken = generateTestJWT({
        userId: TEST_UUIDS.USER_ADMIN,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['members:read'],
        effectiveUserId: testUser.id,
        impersonationChain: [
          {
            impersonatorUserId: TEST_UUIDS.USER_ADMIN,
            impersonatedUserId: testUser.id,
            startedAt: new Date().toISOString(),
            reason: 'Support troubleshooting',
          },
        ],
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${impersonationToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isImpersonating).toBe(true);
      expect(res.body).toHaveProperty('impersonationChain');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`);

      expect(res.status).toBe(401);
    });

    it('should return 403 when lacking members:impersonate permission', async () => {
      const noPermsToken = generateTestJWT({
        userId: testUser.id,
        orgId: testOrg.id,
        envId: testEnv.id,
        permissions: ['members:read'],
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${noPermsToken}`);

      expect(res.status).toBe(403);
    });

    it('should return not impersonating when no impersonation active', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isImpersonating).toBe(false);
      expect(res.body.impersonationChain).toBeUndefined();
    });

    it('should return 404 when member not found', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${TEST_UUIDS.NONEXISTENT}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(OrganizationMember, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv.id}/members/${testMember.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      jest.restoreAllMocks();
    });
  });
});
