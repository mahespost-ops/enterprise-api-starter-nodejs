/**
 * User Controller
 * Handles HTTP request/response for user-related operations
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import { BOOLEAN_STRINGS } from '../constants/validation.constants';
import { TrustStatus } from '../constants/device.constants';
import userService from '../services/user.service';
import logger from '../config/logger';

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/users/me
 * @access  Private
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  logger.debug(`Getting current user profile: ${userId}`);

  const user = await userService.getCurrentUser(userId);

  // Transform to camelCase for API response
  res.status(HTTP_STATUS.OK).json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    isActive: user.isActive,
    isEmailVerified: user.emailVerified,
    isPhoneVerified: user.phoneNumberVerified,
    timezone: user.zoneinfo,
    locale: user.locale,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/v1/users/me
 * @access  Private
 */
export const updateCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  logger.debug(`Updating current user profile: ${userId}`);

  const user = await userService.updateProfile(userId, req.body);

  // Transform to camelCase for API response
  res.status(HTTP_STATUS.OK).json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    isActive: user.isActive,
    isEmailVerified: user.emailVerified,
    isPhoneVerified: user.phoneNumberVerified,
    timezone: user.zoneinfo,
    locale: user.locale,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

/**
 * @desc    Get current user's organizations
 * @route   GET /api/v1/users/me/organizations
 * @access  Private
 */
export const getCurrentUserOrganizations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { limit, offset, includeInactive } = req.query;

  logger.debug(`Getting organizations for user: ${userId}`);

  const result = await userService.getUserOrganizations(userId, {
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
    includeInactive: includeInactive === BOOLEAN_STRINGS.TRUE,
  });

  res.status(HTTP_STATUS.OK).json(result);
});

/**
 * @desc    Get current user's permissions
 * @route   GET /api/v1/users/me/permissions
 * @access  Private
 */
export const getCurrentUserPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const orgId = (req.query.orgId as string) || req.user!.orgId!;
  const envId = (req.query.envId as string) || req.user!.envId!;

  logger.debug(`Getting permissions for user: ${userId}, org: ${orgId}, env: ${envId}`);

  const result = await userService.getUserPermissions(userId, orgId, envId);

  res.status(HTTP_STATUS.OK).json(result);
});

/**
 * @desc    Get current user's devices
 * @route   GET /api/v1/users/me/devices
 * @access  Private
 */
export const getCurrentUserDevices = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { limit, offset, trustStatus } = req.query;

  logger.debug(`Getting devices for user: ${userId}`);

  const result = await userService.getUserDevices(userId, {
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
    trustStatus: trustStatus as TrustStatus | undefined,
  });

  // Transform devices to camelCase (never expose fingerprintHash - security sensitive)
  const data = result.data.map((device) => ({
    id: device.id,
    name: device.deviceName,
    deviceType: device.deviceType,
    browser: device.browser,
    os: device.os,
    trustStatus: device.trustStatus,
    isRevoked: device.revokedAt !== null,
    lastUsedAt: device.lastUsedAt,
    createdAt: device.createdAt,
  }));

  res.status(HTTP_STATUS.OK).json({
    data,
    pagination: result.pagination,
  });
});

/**
 * @desc    Update current user's device
 * @route   PUT /api/v1/users/me/devices/:deviceId
 * @access  Private
 */
export const updateCurrentUserDevice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { deviceId } = req.params;

  logger.debug(`Updating device: ${deviceId} for user: ${userId}`);

  const device = await userService.updateDevice(userId, deviceId, req.body);

  // Transform to camelCase (never expose fingerprintHash - security sensitive)
  res.status(HTTP_STATUS.OK).json({
    id: device.id,
    name: device.deviceName,
    deviceType: device.deviceType,
    browser: device.browser,
    os: device.os,
    trustStatus: device.trustStatus,
    isRevoked: device.revokedAt !== null,
    lastUsedAt: device.lastUsedAt,
    createdAt: device.createdAt,
  });
});

/**
 * @desc    Revoke current user's device
 * @route   DELETE /api/v1/users/me/devices/:deviceId
 * @access  Private
 */
export const revokeCurrentUserDevice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { deviceId } = req.params;

  logger.debug(`Revoking device: ${deviceId} for user: ${userId}`);

  await userService.revokeDevice(userId, deviceId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});

/**
 * @desc    Get current user's sessions
 * @route   GET /api/v1/users/me/sessions
 * @access  Private
 */
export const getCurrentUserSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { limit, offset, isActive } = req.query;

  logger.debug(`Getting sessions for user: ${userId}`);

  const result = await userService.getUserSessions(userId, {
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
    isActive: isActive !== undefined ? isActive === BOOLEAN_STRINGS.TRUE : undefined,
  });

  // Transform sessions to camelCase
  const data = result.data.map((session) => {
    // Device association temporarily commented out until configured
    const sessionWithDevice = session as { device?: { deviceName?: string } };
    return {
      id: session.id,
      deviceId: session.deviceId,
      deviceName: sessionWithDevice.device?.deviceName || null,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isActive: session.isActive,
      isCurrent: false, // TODO: Compare with current session ID from JWT
      lastAccessedAt: session.lastAccessedAt,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  });

  res.status(HTTP_STATUS.OK).json({
    data,
    pagination: result.pagination,
  });
});

/**
 * @desc    Revoke current user's session
 * @route   DELETE /api/v1/users/me/sessions/:sessionId
 * @access  Private
 */
export const revokeCurrentUserSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { sessionId } = req.params;

  logger.debug(`Revoking session: ${sessionId} for user: ${userId}`);

  await userService.revokeSession(userId, sessionId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});

/**
 * @desc    Revoke all current user's sessions
 * @route   DELETE /api/v1/users/me/sessions/all
 * @access  Private
 */
export const revokeAllCurrentUserSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  logger.debug(`Revoking all sessions for user: ${userId}`);

  // TODO: Extract current session ID from JWT or request context
  const currentSessionId = undefined; // Preserve current session

  await userService.revokeAllSessions(userId, currentSessionId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
