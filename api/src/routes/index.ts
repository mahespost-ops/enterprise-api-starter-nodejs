/**
 * Main Routes Index
 * Aggregates all route modules
 */

import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import organizationRoutes from './organization.routes';
import environmentRoutes from './environment.routes';
import memberRoutes from './member.routes';
import groupRoutes from './group.routes';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/orgs', organizationRoutes);
router.use('/orgs', environmentRoutes);
router.use('/orgs/:orgId/members', memberRoutes);
router.use('/orgs/:orgId/groups', groupRoutes);

// Future routes will be added here:
// router.use('/devices', deviceRoutes);
// router.use('/sessions', sessionRoutes);

export default router;
