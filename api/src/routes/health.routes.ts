/**
 * Health Routes
 * Public endpoints for health checks
 */

import { Router } from 'express';
import * as healthController from '../controllers/health.controller';

const router = Router();

/**
 * @route   GET /health
 * @desc    Basic health check (fast, <5ms)
 * @access  Public
 */
router.get('/', healthController.getHealth);

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check (includes database)
 * @access  Public
 */
router.get('/detailed', healthController.getDetailedHealth);

export default router;
