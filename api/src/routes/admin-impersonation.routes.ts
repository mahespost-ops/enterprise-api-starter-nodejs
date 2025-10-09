/**
 * Admin Impersonation Routes
 * Endpoints for admin-level impersonation management
 *
 * Per STANDARDS.md:
 * - RESTful endpoint definitions
 * - Middleware ordering: rate limit → auth → validate → authorize → controller
 */

import { Router } from 'express';
import * as controller from '../controllers/admin-impersonation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  startImpersonationBodySchema,
  startImpersonationParamsSchema,
  listImpersonationSessionsQuerySchema,
  forceEndSessionParamsSchema,
} from '../middleware/validation-schemas/admin-impersonation.schemas';

const router = Router();

/**
 * @route   POST /api/v1/admin/users/:userId/impersonate
 * @desc    Start system-wide impersonation
 * @access  Private (admin:users:impersonate)
 */
router.post(
  '/users/:userId/impersonate',
  authenticate,
  validate.params(startImpersonationParamsSchema),
  authorize(['admin:users:impersonate']),
  validate.body(startImpersonationBodySchema),
  controller.startImpersonation
);

/**
 * @route   DELETE /api/v1/admin/impersonation/end
 * @desc    End impersonation session (pop or terminate)
 * @access  Private (requires active impersonation)
 */
router.delete('/impersonation/end', authenticate, controller.endImpersonation);

/**
 * @route   GET /api/v1/admin/impersonation/active
 * @desc    Get active impersonation sessions
 * @access  Private (admin:impersonation:read)
 */
router.get(
  '/impersonation/active',
  authenticate,
  authorize(['admin:impersonation:read']),
  controller.getActiveSessions
);

/**
 * @route   GET /api/v1/admin/impersonation-sessions
 * @desc    List all impersonation sessions (history)
 * @access  Private (admin:impersonation:read)
 */
router.get(
  '/impersonation-sessions',
  authenticate,
  validate.query(listImpersonationSessionsQuerySchema),
  authorize(['admin:impersonation:read']),
  controller.listSessions
);

/**
 * @route   DELETE /api/v1/admin/impersonation-sessions/:sessionId
 * @desc    Force-end impersonation session
 * @access  Private (admin:impersonation:manage)
 */
router.delete(
  '/impersonation-sessions/:sessionId',
  authenticate,
  validate.params(forceEndSessionParamsSchema),
  authorize(['admin:impersonation:manage']),
  controller.forceEndSession
);

export default router;
