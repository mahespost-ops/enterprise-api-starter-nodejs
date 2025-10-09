/**
 * Admin Organizations Integration Tests
 *
 * Tests for admin organization management endpoints
 * - GET /admin/organizations - List all organizations
 * - GET /admin/organizations/{orgId} - Get organization details
 * - PUT /admin/organizations/{orgId} - Update organization
 * - DELETE /admin/organizations/{orgId} - Delete organization
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
// Note: Organization model uses isActive (boolean) not status (enum)

let app: Application;

describe('Admin Organizations Endpoints', () => {
  let adminUser: User;
  let testOrg1: Organization;
  let testOrg2: Organization;
  let defaultEnv: Environment;
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
      isActive: false,
    });

    // Create default environment for testOrg1
    defaultEnv = await Environment.create({
      id: TEST_UUIDS.ENV_LIVE,
      organizationId: testOrg1.id,
      name: 'Live',
      type: 'live',
      isDefault: true,
      isActive: true,
    });

    // Update testOrg1 with defaultEnvId
    await testOrg1.update({ defaultEnvId: defaultEnv.id });

    // Create organization membership for admin
    await OrganizationMember.create({
      organizationId: testOrg1.id,
      userId: adminUser.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Grant admin permissions
    await grantPermissions(adminUser.id, ['admin:organizations:read', 'admin:organizations:manage']);

    // Generate admin token
    adminToken = generateTestJWT({
      sub: adminUser.id,
    });
  });

  afterEach(async () => {
    await clearAllPermissions();
    // Clean up test environments only (exclude system env)
    const SYSTEM_ENV_ID = '00000000-0000-0000-0000-000000000100';
    await Environment.destroy({ where: { id: { [require('sequelize').Op.ne]: SYSTEM_ENV_ID } }, force: true });
    await OrganizationMember.destroy({ where: {}, force: true });
    // Clean up test organizations only (exclude system org)
    const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';
    await Organization.destroy({ where: { id: { [require('sequelize').Op.ne]: SYSTEM_ORG_ID } }, force: true });
    await UserSession.destroy({ where: {}, force: true });
    await Device.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  // =======================
  // GET /admin/organizations - List Organizations
  // =======================
  describe('GET /admin/organizations', () => {
    it('should list all organizations with pagination (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('offset');
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('hasMore');
    });

    it('should filter organizations by isActive (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?filter[isActive]=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2); // Test org + System org
      expect(res.body.data.every((org: { isActive: boolean }) => org.isActive === true)).toBe(true);
    });

    it('should paginate organizations (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?limit=1&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.offset).toBe(0);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.hasMore).toBe(true);
    });

    it('should sort organizations by name ascending (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?sort=name')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0].name.localeCompare(res.body.data[1].name)).toBeLessThanOrEqual(0);
    });

    it('should sort organizations by createdAt descending (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?sort=-createdAt')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      const firstDate = new Date(res.body.data[0].createdAt);
      const secondDate = new Date(res.body.data[1].createdAt);
      expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
    });

    it('should select specific fields only (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?fields=id,name,slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('slug');
      expect(res.body.data[0]).not.toHaveProperty('status');
      expect(res.body.data[0]).not.toHaveProperty('createdAt');
    });

    it('should search organizations by name (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?search=Organization 1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toContain('Organization 1');
    });

    it('should return 422 for invalid filter operator', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?filter[status][invalid]=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).get('/api/v1/admin/organizations').expect(401);
    });

    it('should return 403 when user lacks admin:organizations:read permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });

      const unauthorizedToken = generateTestJWT({ sub: regularUser.id });

      await request(app)
        .get('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(403);

      await User.destroy({ where: { id: regularUser.id }, force: true });
    });

    it('should return 500 on database error', async () => {
      // Mock database error
      jest.spyOn(Organization, 'findAndCountAll').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body).toHaveProperty('message');

      // Restore mock
      jest.restoreAllMocks();
    });
  });

  // =======================
  // GET /admin/organizations/{orgId} - Get Organization Details
  // =======================
  describe('GET /admin/organizations/:orgId', () => {
    it('should get organization details (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', testOrg1.id);
      expect(res.body).toHaveProperty('name', testOrg1.name);
      expect(res.body).toHaveProperty('slug', testOrg1.slug);
      expect(res.body).toHaveProperty('isActive', testOrg1.isActive);
      expect(res.body).toHaveProperty('defaultEnvId', defaultEnv.id);
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).get(`/api/v1/admin/organizations/${testOrg1.id}`).expect(401);
    });

    it('should return 403 when user lacks admin:organizations:read permission', async () => {
      const regularUser = await User.create({
        email: createTestIdentifier('regular2') + '@test.com',
        emailVerified: true,
        givenName: 'Regular',
        familyName: 'User',
        isActive: true,
      });

      const unauthorizedToken = generateTestJWT({ sub: regularUser.id });

      await request(app)
        .get(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(403);

      await User.destroy({ where: { id: regularUser.id }, force: true });
    });

    it('should return 404 when organization does not exist', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/organizations/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 500 on database error', async () => {
      jest.spyOn(Organization, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body).toHaveProperty('message');

      jest.restoreAllMocks();
    });
  });

  // =======================
  // PUT /admin/organizations/{orgId} - Update Organization
  // =======================
  describe('PUT /admin/organizations/:orgId', () => {
    it('should update organization details (200)', async () => {
      const updatedData = {
        name: 'Updated Organization Name',
        metadata: { industry: 'Technology' },
      };

      const res = await request(app)
        .put(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData)
        .expect(200);

      expect(res.body).toHaveProperty('id', testOrg1.id);
      expect(res.body).toHaveProperty('name', updatedData.name);
      expect(res.body).toHaveProperty('metadata', updatedData.metadata);
    });

    it('should update organization slug (200)', async () => {
      const updatedData = {
        slug: 'new-slug-' + Date.now(),
      };

      const res = await request(app)
        .put(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData)
        .expect(200);

      expect(res.body).toHaveProperty('slug', updatedData.slug);
    });

    it('should update organization isActive (200)', async () => {
      const updatedData = {
        isActive: false,
      };

      const res = await request(app)
        .put(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData)
        .expect(200);

      expect(res.body).toHaveProperty('isActive', false);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .put(`/api/v1/admin/organizations/${testOrg1.id}`)
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should return 403 when user lacks admin:organizations:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:organizations:read']);
      const readOnlyToken = generateTestJWT({ sub: adminUser.id });

      await request(app)
        .put(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ name: 'Test' })
        .expect(403);
    });

    it('should return 404 when organization does not exist', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/organizations/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 422 for invalid slug format', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'Invalid_Slug!' })
        .expect(422);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 422 for invalid isActive', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: 'not-a-boolean' })
        .expect(422);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 409 for duplicate slug', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: testOrg2.slug })
        .expect(409);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 500 on database error', async () => {
      jest.spyOn(Organization.prototype, 'save').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(500);

      expect(res.body).toHaveProperty('message');

      jest.restoreAllMocks();
    });
  });

  // =======================
  // DELETE /admin/organizations/{orgId} - Delete Organization
  // =======================
  describe('DELETE /admin/organizations/:orgId', () => {
    it('should soft delete organization (204)', async () => {
      await request(app)
        .delete(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify organization is soft deleted
      const deletedOrg = await Organization.findByPk(testOrg1.id, { paranoid: false });
      expect(deletedOrg).not.toBeNull();
      expect(deletedOrg?.deletedAt).not.toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).delete(`/api/v1/admin/organizations/${testOrg1.id}`).expect(401);
    });

    it('should return 403 when user lacks admin:organizations:manage permission', async () => {
      await clearAllPermissions();
      await grantPermissions(adminUser.id, ['admin:organizations:read']);
      const readOnlyToken = generateTestJWT({ sub: adminUser.id });

      await request(app)
        .delete(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .expect(403);
    });

    it('should return 404 when organization does not exist', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/organizations/${TEST_UUIDS.NONEXISTENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 500 on database error', async () => {
      jest.spyOn(Organization.prototype, 'destroy').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete(`/api/v1/admin/organizations/${testOrg1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body).toHaveProperty('message');

      jest.restoreAllMocks();
    });
  });
});
