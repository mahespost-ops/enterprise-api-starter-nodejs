/**
 * Admin Device Service
 * Business logic for admin device management operations
 *
 * Separation of concerns:
 * - Admin-specific device operations separated from tenant-scoped device service
 * - All database queries delegated to model static methods (no Op imports)
 */

import { Device, TrustStatus, DeviceType } from '../models/Device.model';
import { NotFoundError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import { DEVICE_SORTABLE_FIELDS, DEVICE_SEARCHABLE_FIELDS } from '../constants/device.constants';
import logger from '../config/logger';

/**
 * DTO for updating device (admin)
 * Note: trustStatus is system-managed but admin can override
 */
export interface UpdateDeviceDto {
  name?: string;
  trustStatus?: TrustStatus;
}

/**
 * Filter options for listing devices
 */
export interface ListDevicesFilters {
  userId?: string;
  trustStatus?: TrustStatus;
  deviceType?: DeviceType;
  isRevoked?: boolean;
  createdAt?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
    eq?: Date;
    ne?: Date;
  };
  lastUsedAt?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
    eq?: Date;
    ne?: Date;
  };
}

/**
 * Pagination and query options for list
 */
export interface ListDevicesOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  fields?: string[];
  filters?: ListDevicesFilters;
}

class AdminDeviceService {
  /**
   * List all devices with filters, pagination, sorting, and search
   * Delegates all database logic to Device model static method
   * @param options - Query options
   * @returns Paginated device list
   */
  async listDevices(options: ListDevicesOptions): Promise<{ devices: Device[]; total: number }> {
    logger.debug('Admin: Listing devices', { options });

    const { limit = 20, offset = 0, sort, search, fields, filters = {} } = options;

    // Delegate to model's static method - all DB logic in model layer
    const { rows: devices, count: total } = await Device.findWithFilters(filters, {
      limit,
      offset,
      sort,
      search,
      searchFields: DEVICE_SEARCHABLE_FIELDS as unknown as string[],
      sortableFields: Object.values(DEVICE_SORTABLE_FIELDS) as string[],
      fields,
    });

    logger.debug('Admin: Devices retrieved', { count: devices.length, total });

    return { devices, total };
  }

  /**
   * Get device by ID
   * @param deviceId - Device ID
   * @returns Device
   * @throws NotFoundError if device not found
   */
  async getDeviceById(deviceId: string): Promise<Device> {
    logger.debug('Admin: Getting device', { deviceId });

    const device = await Device.findByPk(deviceId);

    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE_NOT_FOUND);
    }

    return device;
  }

  /**
   * Update device
   * @param deviceId - Device ID
   * @param data - Update data
   * @returns Updated device
   * @throws NotFoundError if device not found
   */
  async updateDevice(deviceId: string, data: UpdateDeviceDto): Promise<Device> {
    logger.debug('Admin: Updating device', { deviceId, data });

    const device = await this.getDeviceById(deviceId);

    // Update fields
    if (data.name !== undefined) {
      device.deviceName = data.name;
    }

    if (data.trustStatus !== undefined) {
      device.trustStatus = data.trustStatus;
    }

    await device.save();

    logger.info('Admin: Device updated', { deviceId });

    return device;
  }

  /**
   * Revoke device (soft delete via revokedAt timestamp)
   * @param deviceId - Device ID
   * @throws NotFoundError if device not found
   */
  async revokeDevice(deviceId: string): Promise<void> {
    logger.debug('Admin: Revoking device', { deviceId });

    const device = await this.getDeviceById(deviceId);

    device.revokedAt = new Date();
    await device.save();

    logger.info('Admin: Device revoked', { deviceId });
  }
}

export default new AdminDeviceService();
