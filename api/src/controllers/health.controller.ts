/**
 * Health Controller
 * Handles health check endpoint
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import healthService from '../services/health.service';
import logger from '../config/logger';

/**
 * @desc    Basic health check
 * @route   GET /health
 * @access  Public
 */
export const getHealth = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    logger.debug('Health check requested');

    const health = await healthService.getBasicHealth();

    res.status(HTTP_STATUS.OK).json(health);
  }
);

/**
 * @desc    Detailed health check (includes database)
 * @route   GET /health/detailed
 * @access  Public
 */
export const getDetailedHealth = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    logger.debug('Detailed health check requested');

    const health = await healthService.getDetailedHealth();

    res.status(HTTP_STATUS.OK).json(health);
  }
);
