/**
 * Admin Session Routes
 * Routes for admin session management endpoints
 */

import { Router } from 'express';
import * as controller from '../controllers/admin-session.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  listSessionsQuerySchema,
  sessionIdParamSchema,
  userIdParamSchema,
} from '../middleware/validation-schemas/admin-session.schemas';

const router = Router();

/**
 * @route   GET /api/v1/admin/sessions
 * @desc    List all sessions (admin)
 * @access  Private (admin:sessions:read)
 */
router.get(
  '/',
  authenticate,
  validate.query(listSessionsQuerySchema),
  authorize(['admin:sessions:read']),
  controller.listSessions,
);

/**
 * @route   GET /api/v1/admin/sessions/:sessionId
 * @desc    Get session by ID (admin)
 * @access  Private (admin:sessions:read)
 */
router.get(
  '/:sessionId',
  authenticate,
  validate.params(sessionIdParamSchema),
  authorize(['admin:sessions:read']),
  controller.getSessionById,
);

/**
 * @route   DELETE /api/v1/admin/sessions/:sessionId
 * @desc    Revoke session (admin)
 * @access  Private (admin:sessions:manage)
 */
router.delete(
  '/:sessionId',
  authenticate,
  validate.params(sessionIdParamSchema),
  authorize(['admin:sessions:manage']),
  controller.revokeSession,
);

/**
 * @route   DELETE /api/v1/admin/sessions/user/:userId
 * @desc    Revoke all sessions for user (admin)
 * @access  Private (admin:sessions:manage)
 */
router.delete(
  '/user/:userId',
  authenticate,
  validate.params(userIdParamSchema),
  authorize(['admin:sessions:manage']),
  controller.revokeAllUserSessions,
);

export default router;
