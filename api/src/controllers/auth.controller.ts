/**
 * Authentication Controller
 * Handles HTTP request/response logic for authentication endpoints
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import authService from '../services/auth.service';
import logger from '../config/logger';

/**
 * @desc    Register a new user and send magic token
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('User registration requested', { email: req.body.email });

    const result = await authService.register(req.body);

    res.status(HTTP_STATUS.CREATED).json(result);
  }
);

/**
 * @desc    Request a magic token for existing user
 * @route   POST /api/v1/auth/request-token
 * @access  Public
 */
export const requestMagicToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('Magic token requested', { email: req.body.email });

    const result = await authService.requestMagicToken(req.body);

    res.status(HTTP_STATUS.OK).json(result);
  }
);

/**
 * @desc    Verify magic token and return JWT tokens
 * @route   POST /api/v1/auth/verify-token
 * @access  Public
 *
 * @security Dual-mode token delivery:
 * - Cookie (httpOnly): For web apps (XSS protection)
 * - Body: For mobile apps that cannot use cookies
 * - Note: For maximum security, consider cookie-only mode in production
 *   and require mobile apps to use a different flow (e.g., OAuth PKCE)
 */
export const verifyMagicToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('Magic token verification requested');

    const result = await authService.verifyMagicToken(req.body);

    // Set refresh token as HTTP-only cookie (for web apps)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.refreshExpiresIn * 1000, // Convert to milliseconds
    });

    // Return full response including refreshToken (for mobile apps)
    res.status(HTTP_STATUS.OK).json(result);
  }
);

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 *
 * @security Dual-mode token delivery:
 * - Accepts refreshToken from cookie OR body
 * - Returns new refreshToken in both cookie AND body
 * - Cookie-only mode would be more secure for web apps
 */
export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('Token refresh requested');

    // Get refresh token from cookie or body (dual-mode)
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    const result = await authService.refreshAccessToken(refreshToken);

    // Update refresh token cookie (for web apps)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.refreshExpiresIn * 1000,
    });

    // Return full response including refreshToken (for mobile apps)
    res.status(HTTP_STATUS.OK).json(result);
  }
);

/**
 * @desc    Logout user and invalidate session
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('Logout requested', { userId: req.user?.sub });

    const userId = req.user?.sub;
    if (!userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'User not authenticated' });
      return;
    }

    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    await authService.logout(userId, refreshToken);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.status(HTTP_STATUS.NO_CONTENT).send();
  }
);

/**
 * @desc    Switch organization/environment context
 * @route   POST /api/v1/auth/switch-context
 * @access  Private
 */
export const switchContext = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('Context switch requested', { userId: req.user?.sub });

    const userId = req.user?.sub;
    if (!userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'User not authenticated' });
      return;
    }

    const result = await authService.switchContext({
      userId,
      ...req.body,
    });

    res.status(HTTP_STATUS.OK).json(result);
  }
);
