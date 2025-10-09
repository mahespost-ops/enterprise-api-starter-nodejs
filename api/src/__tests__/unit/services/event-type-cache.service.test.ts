/**
 * EventType Cache Service Tests
 *
 * Tests for in-memory O(1) EventType lookup cache
 */

// Mock EventType model before imports
jest.mock('../../../models/EventType.model', () => ({
  EventType: {
    findAll: jest.fn(),
  },
}));

// Mock database
jest.mock('../../../config/database', () => ({
  __esModule: true,
  default: {},
}));

import { eventTypeCacheService } from '../../../services/event-type-cache.service';
import { EventType } from '../../../models/EventType.model';

describe('EventTypeCacheService', () => {
  const mockEventTypes = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      verb: 'auth.login',
      httpMethod: 'POST',
      httpPath: '/api/v1/auth/login',
      isWebhookEvent: false,
      description: 'User login',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      verb: 'user.update',
      httpMethod: 'PATCH',
      httpPath: '/api/v1/users/:userId',
      isWebhookEvent: true,
      description: 'User profile update',
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      verb: 'device.list',
      httpMethod: 'GET',
      httpPath: '/api/v1/orgs/:orgId/devices',
      isWebhookEvent: false,
      description: 'List devices',
    },
  ];

  beforeEach(() => {
    // Clear cache before each test
    eventTypeCacheService.clear();
    jest.clearAllMocks();
  });

  describe('initialize()', () => {
    it('should initialize cache from database', async () => {
      // Arrange
      (EventType.findAll as jest.Mock).mockResolvedValue(mockEventTypes);

      // Act
      await eventTypeCacheService.initialize();

      // Assert
      expect(EventType.findAll).toHaveBeenCalledTimes(1);
      const stats = eventTypeCacheService.getStats();
      expect(stats.size).toBe(3);
      expect(stats.initialized).toBe(true);
    });

    it('should handle empty database without crashing', async () => {
      // Arrange
      (EventType.findAll as jest.Mock).mockResolvedValue([]);

      // Act
      await eventTypeCacheService.initialize();

      // Assert
      const stats = eventTypeCacheService.getStats();
      expect(stats.size).toBe(0);
      expect(stats.initialized).toBe(true);
    });

    it('should not re-initialize if already initialized', async () => {
      // Arrange
      (EventType.findAll as jest.Mock).mockResolvedValue(mockEventTypes);
      await eventTypeCacheService.initialize();

      // Act
      await eventTypeCacheService.initialize();

      // Assert - findAll should only be called once
      expect(EventType.findAll).toHaveBeenCalledTimes(1);
    });

    it('should throw error if database query fails', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      (EventType.findAll as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(eventTypeCacheService.initialize()).rejects.toThrow('Database connection failed');
    });
  });

  describe('getEventType()', () => {
    beforeEach(async () => {
      (EventType.findAll as jest.Mock).mockResolvedValue(mockEventTypes);
      await eventTypeCacheService.initialize();
    });

    it('should get event type by exact match (O(1) lookup)', () => {
      // Act
      const eventType = eventTypeCacheService.getEventType('POST', '/api/v1/auth/login');

      // Assert
      expect(eventType).toBeTruthy();
      expect(eventType?.verb).toBe('auth.login');
      expect(eventType?.httpMethod).toBe('POST');
      expect(eventType?.isWebhookEvent).toBe(false);
    });

    it('should return null for unknown endpoint', () => {
      // Act
      const eventType = eventTypeCacheService.getEventType('POST', '/api/v1/unknown/endpoint');

      // Assert
      expect(eventType).toBeNull();
    });

    it('should return null if cache not initialized', () => {
      // Arrange
      eventTypeCacheService.clear();

      // Act
      const eventType = eventTypeCacheService.getEventType('POST', '/api/v1/auth/login');

      // Assert
      expect(eventType).toBeNull();
    });

    it('should be case-insensitive for HTTP method', () => {
      // Act - lowercase method
      const eventType1 = eventTypeCacheService.getEventType('post', '/api/v1/auth/login');
      const eventType2 = eventTypeCacheService.getEventType('Post', '/api/v1/auth/login');
      const eventType3 = eventTypeCacheService.getEventType('POST', '/api/v1/auth/login');

      // Assert - all should return same result
      expect(eventType1).toBeTruthy();
      expect(eventType2).toBeTruthy();
      expect(eventType3).toBeTruthy();
      expect(eventType1?.verb).toBe('auth.login');
      expect(eventType2?.verb).toBe('auth.login');
      expect(eventType3?.verb).toBe('auth.login');
    });
  });

  describe('refresh()', () => {
    it('should refresh cache with new event types', async () => {
      // Arrange - Initial cache
      (EventType.findAll as jest.Mock).mockResolvedValue(mockEventTypes);
      await eventTypeCacheService.initialize();

      // Act - Add new event type and refresh
      const updatedEventTypes = [
        ...mockEventTypes,
        {
          id: '44444444-4444-4444-4444-444444444444',
          verb: 'session.logout',
          httpMethod: 'POST',
          httpPath: '/api/v1/auth/logout',
          isWebhookEvent: true,
          description: 'User logout',
        },
      ];
      (EventType.findAll as jest.Mock).mockResolvedValue(updatedEventTypes);
      await eventTypeCacheService.refresh();

      // Assert
      const stats = eventTypeCacheService.getStats();
      expect(stats.size).toBe(4);

      const newEventType = eventTypeCacheService.getEventType('POST', '/api/v1/auth/logout');
      expect(newEventType).toBeTruthy();
      expect(newEventType?.verb).toBe('session.logout');
    });

    it('should remove deleted event types from cache', async () => {
      // Arrange - Initial cache
      (EventType.findAll as jest.Mock).mockResolvedValue(mockEventTypes);
      await eventTypeCacheService.initialize();

      // Act - Remove event type and refresh
      const reducedEventTypes = mockEventTypes.slice(0, 2);
      (EventType.findAll as jest.Mock).mockResolvedValue(reducedEventTypes);
      await eventTypeCacheService.refresh();

      // Assert
      const stats = eventTypeCacheService.getStats();
      expect(stats.size).toBe(2);

      const deletedEventType = eventTypeCacheService.getEventType('GET', '/api/v1/orgs/:orgId/devices');
      expect(deletedEventType).toBeNull();
    });
  });

  describe('getStats()', () => {
    it('should return cache statistics', async () => {
      // Arrange
      (EventType.findAll as jest.Mock).mockResolvedValue(mockEventTypes);
      await eventTypeCacheService.initialize();

      // Act
      const stats = eventTypeCacheService.getStats();

      // Assert
      expect(stats).toEqual({
        size: 3,
        initialized: true,
      });
    });
  });
});
