/**
 * Authentication Routes
 * Endpoints for passwordless authentication using magic tokens
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authSchemas } from '../middleware/validation-schemas';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Middleware order (applied in sequence):
 * 1. Rate limiting (endpoint-specific)
 * 2. Authentication (if protected)
 * 3. Parameter validation (req.params)
 * 4. Authorization (RBAC)
 * 5. Body validation (req.body for POST/PUT/PATCH)
 * 6. Controller
 */

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user and send magic token
 * @access  Public
 * @rateLimit 3 requests per 15 minutes per email
 */
router.post(
  '/register',
  rateLimit.authEndpoint,
  validate.body(authSchemas.registerSchema),
  authController.register
);

/**
 * @route   POST /api/v1/auth/request-token
 * @desc    Request a magic token for existing user
 * @access  Public
 * @rateLimit 3 requests per 15 minutes per email
 */
router.post(
  '/request-token',
  rateLimit.authEndpoint,
  validate.body(authSchemas.requestTokenSchema),
  authController.requestMagicToken
);

/**
 * @route   POST /api/v1/auth/verify-token
 * @desc    Verify magic token and return JWT tokens
 * @access  Public
 * @rateLimit STRICT: 3 attempts per 15 minutes (prevents brute force)
 */
router.post(
  '/verify-token',
  rateLimit.verifyEndpoint,
  validate.body(authSchemas.verifyTokenSchema),
  authController.verifyMagicToken
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @rateLimit Standard API rate limit
 */
router.post(
  '/refresh',
  rateLimit.apiEndpoint,
  validate.body(authSchemas.refreshTokenSchema),
  authController.refreshAccessToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private (requires JWT)
 * @rateLimit Standard API rate limit
 */
router.post(
  '/logout',
  rateLimit.apiEndpoint,
  authenticate,
  validate.body(authSchemas.logoutSchema),
  authController.logout
);

/**
 * @route   POST /api/v1/auth/switch-context
 * @desc    Switch organization/environment context
 * @access  Private (requires JWT)
 * @rateLimit Standard API rate limit
 */
router.post(
  '/switch-context',
  rateLimit.apiEndpoint,
  authenticate,
  validate.body(authSchemas.switchContextSchema),
  authController.switchContext
);

export default router;
