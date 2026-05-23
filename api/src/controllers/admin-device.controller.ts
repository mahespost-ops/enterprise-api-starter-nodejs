/**
 * Admin Device Controller
 * Handles HTTP request/response for admin device management operations
 *
 * Per CLAUDE.md:
 * - Handle HTTP concerns (req/res)
 * - Extract params and delegate to service
 * - Never expose database implementation details (fingerprintHash)
 * - NO field name transformations (keep camelCase consistent)
 * - Format response with pagination info
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import adminDeviceService, { ListDevicesFilters } from '../services/admin-device.service';
import logger from '../config/logger';
import { TrustStatus, DeviceType } from '../models/Device.model';

/**
 * Helper: Parse filter parameters from query string
 */
function parseFilters(query: Record<string, unknown>): ListDevicesFilters {
  const filters: ListDevicesFilters = {};

  // Parse userId
  if (query['filter[userId]']) {
    filters.userId = query['filter[userId]'] as string;
  }

  // Parse trustStatus
  if (query['filter[trustStatus]']) {
    filters.trustStatus = query['filter[trustStatus]'] as TrustStatus;
  }

  // Parse deviceType
  if (query['filter[deviceType]']) {
    filters.deviceType = query['filter[deviceType]'] as DeviceType;
  }

  // Parse isRevoked
  if (query['filter[isRevoked]'] !== undefined) {
    filters.isRevoked = query['filter[isRevoked]'] === 'true' || query['filter[isRevoked]'] === true;
  }

  // Parse createdAt filters
  if (
    query['filter[createdAt][gte]'] ||
    query['filter[createdAt][lte]'] ||
    query['filter[createdAt][gt]'] ||
    query['filter[createdAt][lt]'] ||
    query['filter[createdAt][eq]'] ||
    query['filter[createdAt][ne]']
  ) {
    filters.createdAt = {};
    if (query['filter[createdAt][gte]']) filters.createdAt.gte = new Date(query['filter[createdAt][gte]'] as string);
    if (query['filter[createdAt][lte]']) filters.createdAt.lte = new Date(query['filter[createdAt][lte]'] as string);
    if (query['filter[createdAt][gt]']) filters.createdAt.gt = new Date(query['filter[createdAt][gt]'] as string);
    if (query['filter[createdAt][lt]']) filters.createdAt.lt = new Date(query['filter[createdAt][lt]'] as string);
    if (query['filter[createdAt][eq]']) filters.createdAt.eq = new Date(query['filter[createdAt][eq]'] as string);
    if (query['filter[createdAt][ne]']) filters.createdAt.ne = new Date(query['filter[createdAt][ne]'] as string);
  }

  // Parse lastUsedAt filters
  if (
    query['filter[lastUsedAt][gte]'] ||
    query['filter[lastUsedAt][lte]'] ||
    query['filter[lastUsedAt][gt]'] ||
    query['filter[lastUsedAt][lt]'] ||
    query['filter[lastUsedAt][eq]'] ||
    query['filter[lastUsedAt][ne]']
  ) {
    filters.lastUsedAt = {};
    if (query['filter[lastUsedAt][gte]']) filters.lastUsedAt.gte = new Date(query['filter[lastUsedAt][gte]'] as string);
    if (query['filter[lastUsedAt][lte]']) filters.lastUsedAt.lte = new Date(query['filter[lastUsedAt][lte]'] as string);
    if (query['filter[lastUsedAt][gt]']) filters.lastUsedAt.gt = new Date(query['filter[lastUsedAt][gt]'] as string);
    if (query['filter[lastUsedAt][lt]']) filters.lastUsedAt.lt = new Date(query['filter[lastUsedAt][lt]'] as string);
    if (query['filter[lastUsedAt][eq]']) filters.lastUsedAt.eq = new Date(query['filter[lastUsedAt][eq]'] as string);
    if (query['filter[lastUsedAt][ne]']) filters.lastUsedAt.ne = new Date(query['filter[lastUsedAt][ne]'] as string);
  }

  return filters;
}

/**
 * Helper: Transform device model to API response
 * CRITICAL: Never expose fingerprintHash (bcrypt hash - server-side only)
 * Note: Keep field names in camelCase per architectural standards
 */
function transformDeviceResponse(device: {
  id: string;
  userId: string;
  deviceName: string | null;
  deviceType: DeviceType | null;
  os: string | null;
  browser: string | null;
  userAgent: string | null;
  timezone: string | null;
  screenResolution: string | null;
  trustStatus: TrustStatus;
  firstSeenIp: string;
  lastSeenIp: string | null;
  lastCountry: string | null;
  lastRegion: string | null;
  lastCity: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
}): Record<string, unknown> {
  return {
    id: device.id,
    userId: device.userId,
    name: device.deviceName,
    deviceType: device.deviceType,
    os: device.os,
    browser: device.browser,
    userAgent: device.userAgent,
    timezone: device.timezone,
    screenResolution: device.screenResolution,
    trustStatus: device.trustStatus, // Keep as-is (enum), don't transform to isTrusted
    firstSeenIp: device.firstSeenIp,
    lastSeenIp: device.lastSeenIp,
    lastCountry: device.lastCountry,
    lastRegion: device.lastRegion,
    lastCity: device.lastCity,
    createdAt: device.createdAt,
    lastUsedAt: device.lastUsedAt,
    isRevoked: device.revokedAt !== null,
    revokedAt: device.revokedAt,
    // Security: Never expose fingerprintHash (bcrypt hash)
  };
}

/**
 * @desc    List all devices (admin)
 * @route   GET /api/v1/admin/devices
 * @access  Private (admin:devices:read)
 */
export const listDevices = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.debug('Admin: Listing devices', { query: req.query });

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const sort = req.query.sort as string | undefined;
  const search = req.query.search as string | undefined;

  // Map API field names to database field names
  let fields: string[] | undefined;
  if (req.query.fields) {
    const apiFields = (req.query.fields as string).split(',');
    const fieldMap: Record<string, string> = {
      id: 'id',
      userId: 'userId',
      name: 'deviceName',
      deviceType: 'deviceType',
      os: 'os',
      browser: 'browser',
      userAgent: 'userAgent',
      timezone: 'timezone',
      screenResolution: 'screenResolution',
      trustStatus: 'trustStatus',
      firstSeenIp: 'firstSeenIp',
      lastSeenIp: 'lastSeenIp',
      lastCountry: 'lastCountry',
      lastRegion: 'lastRegion',
      lastCity: 'lastCity',
      createdAt: 'createdAt',
      lastUsedAt: 'lastUsedAt',
      revokedAt: 'revokedAt',
    };
    fields = apiFields.map((field) => fieldMap[field] || field);
  }

  const filters = parseFilters(req.query);

  const { devices, total } = await adminDeviceService.listDevices({
    limit,
    offset,
    sort,
    search,
    fields,
    filters,
  });

  res.status(HTTP_STATUS.OK).json({
    data: devices.map(transformDeviceResponse),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + devices.length < total,
    },
  });
});

/**
 * @desc    Get device by ID (admin)
 * @route   GET /api/v1/admin/devices/:deviceId
 * @access  Private (admin:devices:read)
 */
export const getDeviceById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const deviceId = req.params.deviceId as string;

  logger.debug(`Admin: Getting device: ${deviceId}`);

  const device = await adminDeviceService.getDeviceById(deviceId);

  res.status(HTTP_STATUS.OK).json(transformDeviceResponse(device));
});

/**
 * @desc    Update device (admin)
 * @route   PUT /api/v1/admin/devices/:deviceId
 * @access  Private (admin:devices:manage)
 */
export const updateDevice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const deviceId = req.params.deviceId as string;

  logger.debug(`Admin: Updating device: ${deviceId}`, { body: req.body });

  const device = await adminDeviceService.updateDevice(deviceId, req.body);

  res.status(HTTP_STATUS.OK).json(transformDeviceResponse(device));
});

/**
 * @desc    Revoke device (admin, soft delete)
 * @route   DELETE /api/v1/admin/devices/:deviceId
 * @access  Private (admin:devices:manage)
 */
export const revokeDevice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const deviceId = req.params.deviceId as string;

  logger.debug(`Admin: Revoking device: ${deviceId}`);

  await adminDeviceService.revokeDevice(deviceId);

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
