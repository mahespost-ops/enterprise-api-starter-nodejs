/**
 * Integration Tests: Organizations Endpoints
 * Phase 2 Batch 3 - TDD RED Phase
 *
 * Tests for:
 * - GET /api/v1/orgs/{orgId} - Get organization details
 * - PATCH /api/v1/orgs/{orgId} - Update organization details
 */

import request from 'supertest';
import app from '../../app';
import { User } from '../../models/User.model';
import { Organization } from '../../models/Organization.model';
import { OrganizationMember } from '../../models/OrganizationMember.model';
import { generateTestJWT } from '../helpers/auth.helpers';
import { HTTP_STATUS } from '../../constants/http-status.constants';
import { sequelize } from '../../config/database';

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-1234-1234-1234-123456789012'),
}));

describe('Organizations API Integration Tests', () => {
  let testUser: User;
  let testOrg: Organization;
  let authToken: string;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.sync();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      email: 'org-test@example.com',
      fullName: 'Organization Test User',
      emailVerified: true,
      isActive: true,
      lastOrgId: null,
      lastEnvId: null,
    });

    // Create test organization
    testOrg = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org',
      description: 'Test organization for integration tests',
      defaultEnvId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      isActive: true,
    });

    // Create organization membership
    await OrganizationMember.create({
      userId: testUser.id,
      organizationId: testOrg.id,
    });

    // Update user's last org/env
    await testUser.update({
      lastOrgId: testOrg.id,
      lastEnvId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    });

    // Generate auth token
    authToken = generateTestJWT({
      userId: testUser.id,
      orgId: testOrg.id,
      envId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      email: testUser.email,
      fullName: testUser.fullName,
    });
  });

  afterEach(async () => {
    // Clean up in reverse order of foreign key dependencies
    await OrganizationMember.destroy({ where: {}, force: true });
    await Organization.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  /**
   * GET /api/v1/orgs/{orgId}
   */
  describe('GET /api/v1/orgs/:orgId - Get organization details', () => {
    it('should return organization details when authenticated user is a member (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body).toHaveProperty('id', testOrg.id);
      expect(res.body).toHaveProperty('name', testOrg.name);
      expect(res.body).toHaveProperty('slug', testOrg.slug);
      expect(res.body).toHaveProperty('description', testOrg.description);
      expect(res.body).toHaveProperty('defaultEnvId');
      expect(res.body).toHaveProperty('isActive', true);
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get(`/api/v1/orgs/${testOrg.id}`);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when user is not a member of the organization', async () => {
      // Create another user not in the organization
      const otherUser = await User.create({
        email: 'other@example.com',
        fullName: 'Other User',
        emailVerified: true,
        isActive: true,
      });

      const otherToken = generateTestJWT({
        userId: otherUser.id,
        orgId: '99999999-9999-9999-9999-999999999999',
        envId: '88888888-8888-8888-8888-888888888888',
        email: otherUser.email,
        fullName: otherUser.fullName,
      });

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body).toHaveProperty('error');

      await otherUser.destroy({ force: true });
    });

    it('should return 404 when organization does not exist', async () => {
      const nonExistentOrgId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .get(`/api/v1/orgs/${nonExistentOrgId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 422 when orgId is not a valid UUID', async () => {
      const res = await request(app)
        .get('/api/v1/orgs/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle server errors gracefully (500)', async () => {
      // Mock Organization.findByPk to throw error
      jest.spyOn(Organization, 'findByPk').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body).toHaveProperty('error');

      jest.restoreAllMocks();
    });
  });

  /**
   * PATCH /api/v1/orgs/{orgId}
   */
  describe('PATCH /api/v1/orgs/:orgId - Update organization details', () => {
    it('should update organization details successfully (200)', async () => {
      const updateData = {
        name: 'Updated Organization Name',
        description: 'Updated description',
        website: 'https://updated.example.com',
      };

      const res = await request(app)
        .patch(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body).toHaveProperty('id', testOrg.id);
      expect(res.body).toHaveProperty('name', updateData.name);
      expect(res.body).toHaveProperty('description', updateData.description);
      expect(res.body).toHaveProperty('website', updateData.website);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .patch(`/api/v1/orgs/${testOrg.id}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when user lacks organizations:manage permission', async () => {
      // This will be checked by RBAC middleware
      // For now, create a user without the permission
      const limitedUser = await User.create({
        email: 'limited@example.com',
        fullName: 'Limited User',
        emailVerified: true,
        isActive: true,
        lastOrgId: testOrg.id,
        lastEnvId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      });

      await OrganizationMember.create({
        userId: limitedUser.id,
        organizationId: testOrg.id,
      });

      const limitedToken = generateTestJWT({
        userId: limitedUser.id,
        orgId: testOrg.id,
        envId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        email: limitedUser.email,
        fullName: limitedUser.fullName,
      });

      const res = await request(app)
        .patch(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body).toHaveProperty('error');

      await limitedUser.destroy({ force: true });
    });

    it('should return 404 when organization does not exist', async () => {
      const nonExistentOrgId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .patch(`/api/v1/orgs/${nonExistentOrgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 422 when validation fails (invalid name length)', async () => {
      const res = await request(app)
        .patch(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' }); // Empty name

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle server errors gracefully (500)', async () => {
      jest.spyOn(Organization.prototype, 'update').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .patch(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body).toHaveProperty('error');

      jest.restoreAllMocks();
    });
  });
});
