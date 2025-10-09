/**
 * EventType Cache Service
 *
 * In-memory cache for O(1) HTTP endpoint → EventType lookups.
 * Eliminates database query on every API request (critical for <200ms SLO).
 *
 * Cache Key Format: "METHOD:PATH" (e.g., "POST:/api/v1/auth/login")
 */

import { EventType } from '../models/EventType.model';
import logger from '../config/logger';

class EventTypeCacheService {
  private cache: Map<string, EventType>;
  private initialized: boolean;

  constructor() {
    this.cache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize cache by loading all EventTypes from database
   * Should be called once on application startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('EventTypeCache already initialized');
      return;
    }

    logger.info('Initializing EventTypeCache...');

    try {
      const eventTypes = await EventType.findAll();

      // Clear existing cache
      this.cache.clear();

      // Populate cache with all event types
      for (const eventType of eventTypes) {
        const cacheKey = this.buildCacheKey(eventType.httpMethod, eventType.httpPath);
        this.cache.set(cacheKey, eventType);
      }

      this.initialized = true;

      logger.info(`EventTypeCache initialized with ${eventTypes.length} event types`);
    } catch (error) {
      logger.error('Failed to initialize EventTypeCache', { error });
      throw error;
    }
  }

  /**
   * Get EventType by HTTP method and path (O(1) lookup)
   * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
   * @param path - API endpoint path
   * @returns EventType if found, null otherwise
   */
  getEventType(method: string, path: string): EventType | null {
    if (!this.initialized) {
      logger.warn('EventTypeCache not initialized, returning null');
      return null;
    }

    const cacheKey = this.buildCacheKey(method, path);
    const eventType = this.cache.get(cacheKey);

    if (eventType) {
      logger.debug(`EventType cache hit: ${cacheKey} → ${eventType.verb}`);
    } else {
      logger.debug(`EventType cache miss: ${cacheKey}`);
    }

    return eventType || null;
  }

  /**
   * Refresh cache by reloading all EventTypes from database
   * Should be called after EventType CRUD operations
   */
  async refresh(): Promise<void> {
    logger.info('Refreshing EventTypeCache...');

    try {
      const eventTypes = await EventType.findAll();

      // Clear and rebuild cache
      this.cache.clear();

      for (const eventType of eventTypes) {
        const cacheKey = this.buildCacheKey(eventType.httpMethod, eventType.httpPath);
        this.cache.set(cacheKey, eventType);
      }

      logger.info(`EventTypeCache refreshed with ${eventTypes.length} event types`);
    } catch (error) {
      logger.error('Failed to refresh EventTypeCache', { error });
      throw error;
    }
  }

  /**
   * Build cache key from HTTP method and path
   * @param method - HTTP method
   * @param path - API endpoint path
   * @returns Cache key in format "METHOD:PATH"
   */
  private buildCacheKey(method: string, path: string): string {
    return `${method.toUpperCase()}:${path}`;
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getStats(): { size: number; initialized: boolean } {
    return {
      size: this.cache.size,
      initialized: this.initialized,
    };
  }

  /**
   * Clear cache (primarily for testing)
   */
  clear(): void {
    this.cache.clear();
    this.initialized = false;
    logger.debug('EventTypeCache cleared');
  }
}

// Export singleton instance
export const eventTypeCacheService = new EventTypeCacheService();
export default eventTypeCacheService;
