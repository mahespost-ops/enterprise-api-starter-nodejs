/**
 * Admin Environments Integration Tests
 *
 * Tests for admin environment management endpoints
 * - GET /admin/environments - List all environments
 * - GET /admin/environments/{envId} - Get environment details
 * - PUT /admin/environments/{envId} - Update environment
 * - DELETE /admin/environments/{envId} - Delete environment
 */

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: (): string => 'test-uuid-' + Math.random().toString(36).substring(7),
}));
import request from 'supertest';
import { Application } from 'express';
import appPromise from '../../../app';
import { User } from '../../../models/User.model';
import { Organization } from '../../../models/Organization.model';
import { OrganizationMember } from '../../../models/OrganizationMember.model';
import { Environment } from '../../../models/Environment.model';
import { Device } from '../../../models/Device.model';
import { UserSession } from '../../../models/UserSession.model';
import { generateTestJWT, grantPermissions, clearAllPermissions } from '../../helpers/auth.helpers';
import { TEST_UUIDS, createTestIdentifier } from '../../helpers/test-constants';

let app: Application;

describe('Admin Environments Endpoints', () => {
  let adminUser: User;
  let testOrg1: Organization;
  let testOrg2: Organization;
  let liveEnv1: Environment;
  let sandboxEnv1: Environment;
  let liveEnv2: Environment;
  let adminToken: string;

  beforeAll(async () => {
    app = await appPromise;
  });

  afterAll(async () => {
    // Close database connection to prevent Jest hanging
    const { sequelize } = await import('../../../models');
    await sequelize.close();
  });

  beforeEach(async () => {
    // Create admin user
    adminUser = await User.create({
      id: TEST_UUIDS.USER_ADMIN,
      email: createTestIdentifier('admin') + '@test.com',
      emailVerified: true,
      givenName: 'Admin',
      familyName: 'User',
      isActive: true,
    });

    // Create test organizations
    testOrg1 = await Organization.create({
      id: TEST_UUIDS.ORG_TEST,
      name: 'Test Organization 1',
      slug: createTestIdentifier('org1'),
      isActive: true,
    });

    testOrg2 = await Organization.create({
      id: TEST_UUIDS.ORG_DEFAULT,
      name: 'Test Organization 2',
      slug: createTestIdentifier('org2'),
      isActive: true,
    });

    // Create environments for testOrg1
    liveEnv1 = await Environment.create({
      id: TEST_UUIDS.ENV_LIVE,
      organizationId: testOrg1.id,
      name: 'Live',
      type: 'live',
      description: 'Production environment',
      isDefault: true,
      isActive: true,
    });

    sandboxEnv1 = await Environment.create({
      id: TEST_UUIDS.ENV_TEST,
      organizationId: testOrg1.id,
      name: 'Sandbox',
      type: 'sandbox',
      description: 'Testing environment',
      isDefault: false,
      isActive: true,
    });

    // Create environment for testOrg2
    liveEnv2 = await Environment.create({
      id: TEST_UUIDS.ENV_DEV,
      organizationId: testOrg2.id,
      name: 'Live',
      type: 'live',
      isDefault: true,
      isActive: false,
    });

    // Update organizations with defaultEnvId
    await testOrg1.update({ defaultEnvId: liveEnv1.id });
    await testOrg2.update({ defaultEnvId: liveEnv2.id });

    // Create organization membership for admin
    await OrganizationMember.create({
      organizationId: testOrg1.id,
      userId: adminUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, ['admin:environments:read', 'admin:environments:manage']);

    // Generate admin token
    adminToken = generateTestJWT({
      sub: adminUser.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();
    await Device.destroy({ where: {}, force: true });
    await UserSession.destroy({ where: {}, force: true });
    await Environment.destroy({ where: {}, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    await Organization.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('GET /api/v1/admin/environments', () => {
    it('should list all environments with default pagination', async () => {
      const response = await request(app)
        .get('/api/v1/admin/environments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toMatchObject({
        limit: 20,
        offset: 0,
        total: 3,
        hasMore: false,
      });

      // Verify all environments returned
      const envIds = response.body.data.map((env: { id: string }) => env.id);
      expect(envIds).toContain(liveEnv1.id);
      expect(envIds).toContain(sandboxEnv1.id);
      expect(envIds).toContain(liveEnv2.id);
    });

    it('should support custom pagination', async () => {
      const response = await request(app)
        .get('/api/v1/admin/environments')
        .query({ limit: 2, offset: 1 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        limit: 2,
        offset: 1,
        total: 3,
        hasMore: false,
      });
    });

    it('should filter by organizationId', async () => {
      const response = await request(app)
        .get('/api/v1/admin/environments')
        .query({ 'filter[organizationId]': testOrg1.id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((env: { organizationId: string }) => env.organizationId === testOrg1.id)).toBe(
        true
      );
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/v1/admin/environments')
        .query({ 'filter[type]': 'sandbox' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('sandbox');
    });

    it('should filter by isActive', async () => {
      const response = await request(app)
        .get('/api/v1/admin/environments')
        .query({ 'filter[isActive]': 'false' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isActive).toBe(false);
    });

    it('should filter by isDefault', async () => {
      const response = await request(app)
        .get('/api/v1/admin/environments')
        .query({ 'filter[isDefault]': 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((env: { isDefault: boolean }) => env.isDefault === true)).toBe(true);
    });

    it('should support sorting by name', async () => {
      const response = await request(app)
        .get('/api/v1/admin/environments')
        .query({ sort: 'name' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].name).toBe('Live');
      expect(response.body.data[2].name).toBe('Sandbox');
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/v1/admin/environments')
        .query({ search: 'Sandbox' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Sandbox');
    });

    it('should support field selection', async () => {
      const response = await request(app)
        .get('/api/v1/admin/environments')
        .query({ fields: 'name,type' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('type');
      expect(response.body.data[0]).not.toHaveProperty('description');
      expect(response.body.data[0]).not.toHaveProperty('createdAt');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/admin/environments').expect(401);
    });

    it('should require admin:environments:read permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['some:other:permission']);

      await request(app)
        .get('/api/v1/admin/environments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/environments/:envId', () => {
    it('should get environment details', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: liveEnv1.id,
        organizationId: testOrg1.id,
        name: 'Live',
        type: 'live',
        description: 'Production environment',
        isDefault: true,
        isActive: true,
      });
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should require authentication', async () => {
      await request(app).get(`/api/v1/admin/environments/${liveEnv1.id}`).expect(401);
    });

    it('should require admin:environments:read permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['some:other:permission']);

      await request(app)
        .get(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent environment', async () => {
      await request(app)
        .get(`/api/v1/admin/environments/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(Environment, 'findByPk').mockRejectedValueOnce(new Error('Database connection failed'));

      await request(app)
        .get(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  describe('PUT /api/v1/admin/environments/:envId', () => {
    it('should update environment name', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Production' })
        .expect(200);

      expect(response.body.name).toBe('Production');

      // Verify in database
      const updated = await Environment.findByPk(liveEnv1.id);
      expect(updated?.name).toBe('Production');
    });

    it('should update environment description', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(response.body.description).toBe('Updated description');
    });

    it('should update isDefault flag', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/environments/${sandboxEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isDefault: true })
        .expect(200);

      expect(response.body.isDefault).toBe(true);
    });

    it('should update isActive status', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should update multiple fields', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Production',
          description: 'Main production environment',
          isActive: true,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Production',
        description: 'Main production environment',
        isActive: true,
      });
    });

    it('should reject invalid name (too long)', async () => {
      await request(app)
        .put(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'a'.repeat(51) })
        .expect(422);
    });

    it('should reject invalid type', async () => {
      await request(app)
        .put(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'invalid' })
        .expect(422);
    });

    it('should reject invalid description (too long)', async () => {
      await request(app)
        .put(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'a'.repeat(501) })
        .expect(422);
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/v1/admin/environments/${liveEnv1.id}`)
        .send({ name: 'Updated' })
        .expect(401);
    });

    it('should require admin:environments:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:environments:read']);

      await request(app)
        .put(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(403);
    });

    it('should return 404 for non-existent environment', async () => {
      await request(app)
        .put(`/api/v1/admin/environments/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(Environment, 'findByPk').mockRejectedValueOnce(new Error('Database connection failed'));

      await request(app)
        .put(`/api/v1/admin/environments/${liveEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(500);

      jest.restoreAllMocks();
    });
  });

  describe('DELETE /api/v1/admin/environments/:envId', () => {
    it('should soft delete environment', async () => {
      await request(app)
        .delete(`/api/v1/admin/environments/${sandboxEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify soft delete (paranoid mode)
      const deleted = await Environment.findByPk(sandboxEnv1.id);
      expect(deleted).toBeNull();

      // Verify exists with paranoid: false
      const exists = await Environment.findByPk(sandboxEnv1.id, { paranoid: false });
      expect(exists).not.toBeNull();
      expect(exists?.deletedAt).not.toBeNull();
    });

    it('should require authentication', async () => {
      await request(app).delete(`/api/v1/admin/environments/${sandboxEnv1.id}`).expect(401);
    });

    it('should require admin:environments:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:environments:read']);

      await request(app)
        .delete(`/api/v1/admin/environments/${sandboxEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent environment', async () => {
      await request(app)
        .delete(`/api/v1/admin/environments/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(Environment, 'findByPk').mockRejectedValueOnce(new Error('Database connection failed'));

      await request(app)
        .delete(`/api/v1/admin/environments/${sandboxEnv1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      jest.restoreAllMocks();
    });
  });
});
