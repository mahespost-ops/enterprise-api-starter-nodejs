/**
 * Main Routes Index
 * Aggregates all route modules
 */

import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Future routes will be added here:
// router.use('/users', userRoutes);
// router.use('/devices', deviceRoutes);
// router.use('/sessions', sessionRoutes);

export default router;
