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
 */
export const verifyMagicToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('Magic token verification requested');

    const result = await authService.verifyMagicToken(req.body);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.refreshExpiresIn * 1000, // Convert to milliseconds
    });

    // Return access token in response body
    const { refreshToken, ...responseData } = result;

    res.status(HTTP_STATUS.OK).json(responseData);
  }
);

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('Token refresh requested');

    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    const result = await authService.refreshAccessToken(refreshToken);

    // Update refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.refreshExpiresIn * 1000,
    });

    // Return access token in response body
    const { refreshToken: newRefreshToken, ...responseData } = result;

    res.status(HTTP_STATUS.OK).json(responseData);
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
