/**
 * Integration Tests: Environments Endpoints
 * Phase 2 Batch 3 - TDD RED Phase
 *
 * Tests for:
 * - GET /api/v1/orgs/{orgId}/envs - List environments
 * - POST /api/v1/orgs/{orgId}/envs - Create environment
 * - GET /api/v1/orgs/{orgId}/envs/{envId} - Get environment details
 * - PUT /api/v1/orgs/{orgId}/envs/{envId} - Update environment
 * - DELETE /api/v1/orgs/{orgId}/envs/{envId} - Delete environment
 */

import request from 'supertest';
import app from '../../app';
import { User } from '../../models/User.model';
import { Organization } from '../../models/Organization.model';
import { Environment } from '../../models/Environment.model';
import { OrganizationMember } from '../../models/OrganizationMember.model';
import { generateTestJWT } from '../helpers/auth.helpers';
import { HTTP_STATUS } from '../../constants/http-status.constants';
import { sequelize } from '../../config/database';

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-1234-1234-1234-123456789012'),
}));

describe('Environments API Integration Tests', () => {
  let testUser: User;
  let testOrg: Organization;
  let testEnv1: Environment;
  let testEnv2: Environment;
  let authToken: string;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.sync();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      email: 'env-test@example.com',
      fullName: 'Environment Test User',
      emailVerified: true,
      isActive: true,
      lastOrgId: null,
      lastEnvId: null,
    });

    // Create test organization
    testOrg = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org',
      description: 'Test organization for environment tests',
      defaultEnvId: null, // Will be set after creating first environment
      isActive: true,
    });

    // Create test environments
    testEnv1 = await Environment.create({
      organizationId: testOrg.id,
      name: 'Live',
      description: 'Production environment',
      type: 'live',
      isDefault: true,
      isActive: true,
    });

    testEnv2 = await Environment.create({
      organizationId: testOrg.id,
      name: 'Test',
      description: 'Testing environment',
      type: 'sandbox',
      isDefault: false,
      isActive: true,
    });

    // Update organization default environment
    await testOrg.update({ defaultEnvId: testEnv1.id });

    // Create organization membership
    await OrganizationMember.create({
      userId: testUser.id,
      organizationId: testOrg.id,
    });

    // Update user's last org/env
    await testUser.update({
      lastOrgId: testOrg.id,
      lastEnvId: testEnv1.id,
    });

    // Generate auth token
    authToken = generateTestJWT({
      userId: testUser.id,
      orgId: testOrg.id,
      envId: testEnv1.id,
      email: testUser.email,
      fullName: testUser.fullName,
    });
  });

  afterEach(async () => {
    // Clean up in reverse order of foreign key dependencies
    await OrganizationMember.destroy({ where: {}, force: true });
    await Environment.destroy({ where: {}, force: true });
    await Organization.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  /**
   * GET /api/v1/orgs/{orgId}/envs
   */
  describe('GET /api/v1/orgs/:orgId/envs - List environments', () => {
    it('should list all environments for an organization (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toMatchObject({
        limit: 20,
        offset: 0,
        total: 2,
        hasMore: false,
      });
    });

    it('should filter environments by type (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs?filter[type]=live`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]).toHaveProperty('type', 'live');
    });

    it('should filter environments by isDefault (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs?filter[isDefault]=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]).toHaveProperty('isDefault', true);
    });

    it('should support field selection (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs?fields=id,name,type`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('type');
      expect(res.body.data[0]).not.toHaveProperty('description');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get(`/api/v1/orgs/${testOrg.id}/envs`);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body).toHaveProperty('error');
    });

    it('should handle server errors gracefully (500)', async () => {
      jest.spyOn(Environment, 'findAndCountAll').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body).toHaveProperty('error');

      jest.restoreAllMocks();
    });
  });

  /**
   * POST /api/v1/orgs/{orgId}/envs
   */
  describe('POST /api/v1/orgs/:orgId/envs - Create environment', () => {
    it('should create new environment successfully (201)', async () => {
      const newEnvData = {
        name: 'Staging',
        type: 'sandbox',
        description: 'Staging environment for testing',
        isDefault: false,
      };

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newEnvData);

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', newEnvData.name);
      expect(res.body).toHaveProperty('type', newEnvData.type);
      expect(res.body).toHaveProperty('description', newEnvData.description);
      expect(res.body).toHaveProperty('isDefault', false);
      expect(res.body).toHaveProperty('organizationId', testOrg.id);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs`)
        .send({ name: 'New Env', type: 'sandbox' });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when user lacks environments:manage permission', async () => {
      // This will be enforced by RBAC middleware
      const limitedUser = await User.create({
        email: 'limited@example.com',
        fullName: 'Limited User',
        emailVerified: true,
        isActive: true,
        lastOrgId: testOrg.id,
        lastEnvId: testEnv1.id,
      });

      await OrganizationMember.create({
        userId: limitedUser.id,
        organizationId: testOrg.id,
      });

      const limitedToken = generateTestJWT({
        userId: limitedUser.id,
        orgId: testOrg.id,
        envId: testEnv1.id,
        email: limitedUser.email,
        fullName: limitedUser.fullName,
      });

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs`)
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({ name: 'New Env', type: 'sandbox' });

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body).toHaveProperty('error');

      await limitedUser.destroy({ force: true });
    });

    it('should return 422 when validation fails (missing required fields)', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Missing name and type' });

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return 422 when type is invalid', async () => {
      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Invalid Env', type: 'invalid-type' });

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle server errors gracefully (500)', async () => {
      jest.spyOn(Environment, 'create').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post(`/api/v1/orgs/${testOrg.id}/envs`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Env', type: 'sandbox' });

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body).toHaveProperty('error');

      jest.restoreAllMocks();
    });
  });

  /**
   * GET /api/v1/orgs/{orgId}/envs/{envId}
   */
  describe('GET /api/v1/orgs/:orgId/envs/:envId - Get environment details', () => {
    it('should return environment details (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body).toHaveProperty('id', testEnv1.id);
      expect(res.body).toHaveProperty('name', testEnv1.name);
      expect(res.body).toHaveProperty('type', testEnv1.type);
      expect(res.body).toHaveProperty('description', testEnv1.description);
      expect(res.body).toHaveProperty('isDefault', true);
      expect(res.body).toHaveProperty('organizationId', testOrg.id);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv1.id}`);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 404 when environment does not exist', async () => {
      const nonExistentEnvId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${nonExistentEnvId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 422 when envId is not a valid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/invalid-uuid`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle server errors gracefully (500)', async () => {
      jest.spyOn(Environment, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/envs/${testEnv1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body).toHaveProperty('error');

      jest.restoreAllMocks();
    });
  });

  /**
   * PUT /api/v1/orgs/{orgId}/envs/{envId}
   */
  describe('PUT /api/v1/orgs/:orgId/envs/:envId - Update environment', () => {
    it('should update environment successfully (200)', async () => {
      const updateData = {
        name: 'Updated Live',
        description: 'Updated production environment',
      };

      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/envs/${testEnv1.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body).toHaveProperty('id', testEnv1.id);
      expect(res.body).toHaveProperty('name', updateData.name);
      expect(res.body).toHaveProperty('description', updateData.description);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/envs/${testEnv1.id}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when user lacks environments:manage permission', async () => {
      const limitedUser = await User.create({
        email: 'limited@example.com',
        fullName: 'Limited User',
        emailVerified: true,
        isActive: true,
        lastOrgId: testOrg.id,
        lastEnvId: testEnv1.id,
      });

      await OrganizationMember.create({
        userId: limitedUser.id,
        organizationId: testOrg.id,
      });

      const limitedToken = generateTestJWT({
        userId: limitedUser.id,
        orgId: testOrg.id,
        envId: testEnv1.id,
        email: limitedUser.email,
        fullName: limitedUser.fullName,
      });

      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/envs/${testEnv1.id}`)
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body).toHaveProperty('error');

      await limitedUser.destroy({ force: true });
    });

    it('should return 404 when environment does not exist', async () => {
      const nonExistentEnvId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/envs/${nonExistentEnvId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 422 when validation fails', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/envs/${testEnv1.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' }); // Empty name

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle server errors gracefully (500)', async () => {
      jest.spyOn(Environment.prototype, 'update').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}/envs/${testEnv1.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body).toHaveProperty('error');

      jest.restoreAllMocks();
    });
  });

  /**
   * DELETE /api/v1/orgs/{orgId}/envs/{envId}
   */
  describe('DELETE /api/v1/orgs/:orgId/envs/:envId - Delete environment', () => {
    it('should soft-delete environment successfully (204)', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv2.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.NO_CONTENT);
      expect(res.body).toEqual({});

      // Verify soft delete (should have deletedAt set)
      const deletedEnv = await Environment.findByPk(testEnv2.id, { paranoid: false });
      expect(deletedEnv?.deletedAt).not.toBeNull();
    });

    it('should return 400 when trying to delete default environment', async () => {
      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/default environment/i);
    });

    it('should return 400 when trying to delete last remaining environment', async () => {
      // Delete the non-default environment first
      await testEnv2.destroy();

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/last remaining environment/i);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv2.id}`);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when user lacks environments:manage permission', async () => {
      const limitedUser = await User.create({
        email: 'limited@example.com',
        fullName: 'Limited User',
        emailVerified: true,
        isActive: true,
        lastOrgId: testOrg.id,
        lastEnvId: testEnv1.id,
      });

      await OrganizationMember.create({
        userId: limitedUser.id,
        organizationId: testOrg.id,
      });

      const limitedToken = generateTestJWT({
        userId: limitedUser.id,
        orgId: testOrg.id,
        envId: testEnv1.id,
        email: limitedUser.email,
        fullName: limitedUser.fullName,
      });

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv2.id}`)
        .set('Authorization', `Bearer ${limitedToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body).toHaveProperty('error');

      await limitedUser.destroy({ force: true });
    });

    it('should return 404 when environment does not exist', async () => {
      const nonExistentEnvId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${nonExistentEnvId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body).toHaveProperty('error');
    });

    it('should handle server errors gracefully (500)', async () => {
      jest.spyOn(Environment.prototype, 'destroy').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete(`/api/v1/orgs/${testOrg.id}/envs/${testEnv2.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body).toHaveProperty('error');

      jest.restoreAllMocks();
    });
  });
});
