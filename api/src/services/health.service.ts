/**
 * Health Service
 * Checks application health and dependencies
 */

import { ServiceUnavailableError } from '../utils/errors';
import logger from '../config/logger';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database?: {
    connected: boolean;
    latency?: number;
  };
}

class HealthService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get basic health status
   * Fast check (<5ms) - returns uptime only
   */
  async getBasicHealth(): Promise<HealthStatus> {
    logger.debug('Checking basic health');

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
    };
  }

  /**
   * Get detailed health status
   * Includes database connection check
   * Note: Database check will be implemented after Sequelize setup
   */
  async getDetailedHealth(): Promise<HealthStatus> {
    logger.debug('Checking detailed health');

    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
      database: {
        connected: false,
        latency: undefined,
      },
    };

    // TODO: Implement database health check after Sequelize configuration
    // const dbHealth = await this.checkDatabaseHealth();
    // health.database = dbHealth;

    // Placeholder: Mark as connected for now (will fail when DB is required)
    health.database!.connected = true;
    health.database!.latency = 0;

    if (!health.database!.connected) {
      health.status = 'unhealthy';
      throw new ServiceUnavailableError();
    }

    return health;
  }
}

export const healthService = new HealthService();
export default healthService;
