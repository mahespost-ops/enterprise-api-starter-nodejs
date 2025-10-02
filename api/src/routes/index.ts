/**
 * Main Routes Index
 * Aggregates all route modules
 */

import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);

// Future routes will be added here:
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/devices', deviceRoutes);
// router.use('/sessions', sessionRoutes);

export default router;
