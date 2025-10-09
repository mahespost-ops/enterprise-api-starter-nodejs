/**
 * Audit Logger Middleware Tests
 *
 * Tests for event logging middleware that captures HTTP requests
 */

import { Request, Response, NextFunction } from 'express';

// Mock uuid to avoid ESM issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock dependencies BEFORE imports
jest.mock('../../../config/database', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../../models/EventType.model', () => ({
  EventType: {},
}));
jest.mock('../../../models/Event.model', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../../services/event-type-cache.service', () => ({
  eventTypeCacheService: {
    getEventType: jest.fn(),
  },
}));
jest.mock('../../../services/event-processor.service', () => ({
  eventProcessorService: {
    emit: jest.fn(),
  },
}));
jest.mock('../../../config/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));
// Mock redactRequestSnapshot to pass through the snapshot
jest.mock('../../../utils/event.helpers', () => ({
  redactRequestSnapshot: jest.fn((snapshot) => snapshot),
}));

import { auditLogger } from '../../../middleware/audit-logger.middleware';
import { eventTypeCacheService } from '../../../services/event-type-cache.service';
import { eventProcessorService } from '../../../services/event-processor.service';
import logger from '../../../config/logger';

describe('auditLogger middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let finishListener: () => void;

  const mockEventType = {
    id: 'event-type-123',
    verb: 'user.updated',
    httpMethod: 'PATCH',
    httpPath: '/api/v1/users/:userId',
    isWebhookEvent: false,
    description: 'User updated event',
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup redactRequestSnapshot to pass through
    const { redactRequestSnapshot } = require('../../../utils/event.helpers');
    (redactRequestSnapshot as jest.Mock).mockImplementation((snapshot) => snapshot);

    // Setup mock request
    mockRequest = {
      method: 'PATCH',
      path: '/api/v1/users/user-123',
      headers: {
        'authorization': 'Bearer token-123',
        'content-type': 'application/json',
      },
      body: { fullName: 'Updated Name' },
      query: {},
      params: { userId: 'user-123' },
      ip: '192.168.1.100',
      get: jest.fn((header: string) => {
        if (header === 'user-agent') return 'Mozilla/5.0';
        if (header === 'set-cookie') return undefined;
        return undefined;
      }) as any,
      user: {
        sub: 'user-123',
        orgId: 'org-456',
        envId: 'env-789',
        user: {
          fullName: 'Test User',
          email: 'test@example.com',
        },
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      },
      id: 'req-abc-123',
      socket: {
        remoteAddress: '192.168.1.100',
      } as any,
    };

    // Setup mock response with event emitter functionality
    const listeners: { [event: string]: (() => void)[] } = {};
    mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, callback: () => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
        finishListener = callback; // Capture for manual triggering
        return mockResponse as Response;
      }),
    };

    nextFunction = jest.fn();

    // Mock event type cache service
    (eventTypeCacheService.getEventType as jest.Mock).mockReturnValue(mockEventType);

    // Mock event processor service
    (eventProcessorService.emit as jest.Mock).mockReturnValue(undefined);
  });

  it('should call next() immediately (non-blocking)', () => {
    auditLogger(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it('should register finish listener on response', () => {
    auditLogger(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should emit event with correct data when response finishes', () => {
    auditLogger(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Trigger the finish event
    finishListener();

    expect(eventTypeCacheService.getEventType).toHaveBeenCalledWith('PATCH', '/api/v1/users/user-123');
    expect(eventProcessorService.emit).toHaveBeenCalledWith('api-request', expect.objectContaining({
      eventType: mockEventType,
      request: expect.objectContaining({
        method: 'PATCH',
        path: '/api/v1/users/user-123',
        body: { fullName: 'Updated Name' },
      }),
      response: expect.objectContaining({
        statusCode: 200,
        duration: expect.any(Number),
      }),
      context: expect.objectContaining({
        userId: 'user-123',
        orgId: 'org-456',
        envId: 'env-789',
        requestId: 'req-abc-123',
      }),
    }));
  });

  it('should skip event emission when no event type configured', () => {
    (eventTypeCacheService.getEventType as jest.Mock).mockReturnValue(null);

    auditLogger(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Trigger the finish event
    finishListener();

    expect(eventProcessorService.emit).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'No event type configured for endpoint',
      expect.objectContaining({
        method: 'PATCH',
        path: '/api/v1/users/user-123',
      })
    );
  });

  it('should handle impersonation context from JWT', () => {
    (mockRequest as any).user = {
      ...mockRequest.user!,
      impersonation: {
        originalUserId: 'admin-123',
        effectiveUserId: 'user-123',
        impersonationChain: [
          {
            sessionId: 'session-abc',
            userId: 'admin-123',
            startedAt: new Date('2025-10-08T12:00:00Z').toISOString(),
            impersonationType: 'system' as const,
            permissions: null,
          },
        ],
      },
    };

    auditLogger(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Trigger the finish event
    finishListener();

    expect(eventProcessorService.emit).toHaveBeenCalledWith('api-request', expect.objectContaining({
      context: expect.objectContaining({
        impersonation: expect.objectContaining({
          impersonatorId: 'admin-123',
          impersonatedAt: expect.any(Date),
        }),
      }),
    }));
  });

  it('should handle errors gracefully without throwing', () => {
    (eventTypeCacheService.getEventType as jest.Mock).mockImplementation(() => {
      throw new Error('Cache service error');
    });

    auditLogger(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Should not throw when triggering finish
    expect(() => finishListener()).not.toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      'Error capturing event in audit logger',
      expect.objectContaining({
        error: expect.any(Error),
        method: 'PATCH',
        path: '/api/v1/users/user-123',
      })
    );
  });

  it('should handle requests without authentication', () => {
    (mockRequest as any).user = undefined;
    (mockRequest as any).id = undefined;

    auditLogger(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Trigger the finish event
    finishListener();

    expect(eventProcessorService.emit).toHaveBeenCalledWith('api-request', expect.objectContaining({
      context: expect.objectContaining({
        userId: undefined,
        orgId: undefined,
        envId: undefined,
        requestId: 'unknown',
        impersonation: null,
      }),
    }));
  });

  it('should calculate request duration correctly', (done) => {
    auditLogger(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Wait 10ms before triggering finish
    setTimeout(() => {
      finishListener();

      expect(eventProcessorService.emit).toHaveBeenCalledWith('api-request', expect.objectContaining({
        response: expect.objectContaining({
          duration: expect.any(Number),
        }),
      }));

      const emittedEvent = (eventProcessorService.emit as jest.Mock).mock.calls[0][1];
      expect(emittedEvent.response.duration).toBeGreaterThanOrEqual(10);

      done();
    }, 10);
  });

  it('should handle missing IP address', () => {
    (mockRequest as any).ip = undefined;
    (mockRequest as any).socket = {} as any;

    auditLogger(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    finishListener();

    expect(eventProcessorService.emit).toHaveBeenCalledWith('api-request', expect.objectContaining({
      request: expect.objectContaining({
        ip: 'unknown',
      }),
    }));
  });

  it('should handle missing user agent', () => {
    (mockRequest.get as jest.Mock).mockReturnValue(undefined);

    auditLogger(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    finishListener();

    expect(eventProcessorService.emit).toHaveBeenCalledWith('api-request', expect.objectContaining({
      request: expect.objectContaining({
        userAgent: 'unknown',
      }),
    }));
  });
});
