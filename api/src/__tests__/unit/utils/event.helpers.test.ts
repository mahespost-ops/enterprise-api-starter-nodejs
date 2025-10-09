/**
 * Event Helpers Tests
 *
 * Tests for event helper utility functions
 */

// Mock uuid before imports
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

import {
  buildActor,
  buildCloudEventActor,
  buildObject,
  buildAudit,
  buildDescription,
  toCloudEvent,
  inferResourceType,
  extractResourceId,
} from '../../../utils/event.helpers';
import { EventData, EventContext, RequestSnapshot, ResponseSnapshot } from '../../../types/event.types';

describe('Event Helpers', () => {
  const mockContext: EventContext = {
    userId: 'user-123',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    orgId: 'org-456',
    envId: 'env-789',
    orgName: 'Acme Corp',
    envName: 'Production',
    impersonation: null,
    requestId: 'req-abc',
  };

  const mockRequest: RequestSnapshot = {
    method: 'PATCH',
    path: '/api/v1/users/user-123',
    headers: {},
    body: { fullName: 'John Updated' },
    query: {},
    params: { userId: 'user-123' },
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
  };

  const mockResponse: ResponseSnapshot = {
    statusCode: 200,
    duration: 45,
  };

  describe('buildActor()', () => {
    it('should build actor for User', () => {
      const actor = buildActor(mockContext);

      expect(actor).toEqual({
        type: 'User',
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        impersonation: null,
      });
    });

    it('should build actor for System', () => {
      const systemContext: EventContext = {
        ...mockContext,
        userId: undefined,
      };

      const actor = buildActor(systemContext);

      expect(actor).toEqual({
        type: 'System',
        id: null,
        name: 'System',
        email: null,
        impersonation: null,
      });
    });

    it('should include impersonation context', () => {
      const impersonatedContext: EventContext = {
        ...mockContext,
        impersonation: {
          impersonatorId: 'admin-456',
          impersonatorEmail: 'admin@example.com',
          impersonatedAt: new Date('2025-10-08T12:00:00Z'),
        },
      };

      const actor = buildActor(impersonatedContext);

      expect(actor).toMatchObject({
        type: 'User',
        id: 'user-123',
        impersonation: {
          impersonatorId: 'admin-456',
          impersonatorEmail: 'admin@example.com',
          impersonatedAt: '2025-10-08T12:00:00.000Z',
        },
      });
    });

    it('should handle missing user name and email gracefully', () => {
      const minimalContext: EventContext = {
        ...mockContext,
        userName: undefined,
        userEmail: undefined,
      };

      const actor = buildActor(minimalContext);

      expect(actor).toEqual({
        type: 'User',
        id: 'user-123',
        name: null,
        email: null,
        impersonation: null,
      });
    });
  });

  describe('buildCloudEventActor()', () => {
    it('should build CloudEvent actor for User', () => {
      const actor = buildCloudEventActor(mockContext);

      expect(actor).toEqual({
        type: 'User',
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        impersonation: null,
      });
    });

    it('should build CloudEvent actor for System', () => {
      const systemContext: EventContext = {
        ...mockContext,
        userId: undefined,
      };

      const actor = buildCloudEventActor(systemContext);

      expect(actor).toEqual({
        type: 'System',
      });
    });
  });

  describe('buildObject()', () => {
    it('should extract resource from request', () => {
      const object = buildObject(mockRequest);

      expect(object).toMatchObject({
        type: 'User',
        id: 'user-123',
        fullName: 'John Updated',
      });
    });

    it('should handle empty body', () => {
      const emptyRequest: RequestSnapshot = {
        ...mockRequest,
        body: {},
      };

      const object = buildObject(emptyRequest);

      expect(object).toMatchObject({
        type: 'User',
        id: 'user-123',
      });
    });
  });

  describe('buildAudit()', () => {
    it('should format HTTP metadata correctly', () => {
      const audit = buildAudit(mockRequest, mockResponse, 'req-abc');

      expect(audit).toEqual({
        http: {
          method: 'PATCH',
          path: '/api/v1/users/user-123',
          statusCode: 200,
          duration: 45,
        },
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-abc',
      });
    });
  });

  describe('buildDescription()', () => {
    it('should generate human-readable description', () => {
      const eventData: EventData = {
        eventType: {
          id: 'et-123',
          verb: 'user.update',
          httpMethod: 'PATCH',
          httpPath: '/api/v1/users/:userId',
          isWebhookEvent: true,
          description: 'User profile update',
        } as any,
        request: mockRequest,
        response: mockResponse,
        context: mockContext,
      };

      const description = buildDescription(eventData);

      expect(description).toBe('John Doe performed user.update');
    });

    it('should use "System" for system events', () => {
      const systemEventData: EventData = {
        eventType: {
          verb: 'system.cleanup',
        } as any,
        request: mockRequest,
        response: mockResponse,
        context: { ...mockContext, userId: undefined },
      };

      const description = buildDescription(systemEventData);

      expect(description).toBe('System performed system.cleanup');
    });
  });

  describe('toCloudEvent()', () => {
    it('should convert EventData to CloudEvents 1.0.2 format', () => {
      const eventData: EventData = {
        eventType: {
          id: 'et-123',
          verb: 'user.update',
          httpMethod: 'PATCH',
          httpPath: '/api/v1/users/:userId',
          isWebhookEvent: true,
          description: 'User update',
        } as any,
        request: mockRequest,
        response: mockResponse,
        context: mockContext,
      };

      const cloudEvent = toCloudEvent(eventData);

      expect(cloudEvent.specversion).toBe('1.0.2');
      expect(cloudEvent.type).toBe('com.enterprise.user.update');
      expect(cloudEvent.source).toBe('/orgs/org-456/envs/env-789');
      expect(cloudEvent.datacontenttype).toBe('application/json');
      expect(cloudEvent.id).toBeTruthy();
      expect(cloudEvent.time).toBeTruthy();
      expect(cloudEvent.data.actor.type).toBe('User');
      expect(cloudEvent.data.object.type).toBe('User');
      expect(cloudEvent.data.audit.http.method).toBe('PATCH');
    });

    it('should use /system source for events without org/env context', () => {
      const systemEventData: EventData = {
        eventType: {
          verb: 'system.cleanup',
        } as any,
        request: mockRequest,
        response: mockResponse,
        context: {
          ...mockContext,
          orgId: undefined,
          envId: undefined,
        },
      };

      const cloudEvent = toCloudEvent(systemEventData);

      expect(cloudEvent.source).toBe('/system');
    });
  });

  describe('inferResourceType()', () => {
    it('should infer resource type from path', () => {
      expect(inferResourceType('/api/v1/users/user-123')).toBe('User');
      expect(inferResourceType('/api/v1/orgs/org-456/devices')).toBe('Device');
      expect(inferResourceType('/api/v1/admin/webhooks/webhook-789')).toBe('Webhook');
    });

    it('should handle paths with query parameters', () => {
      expect(inferResourceType('/api/v1/users?limit=10')).toBe('User');
    });

    it('should handle paths with parameter placeholders', () => {
      expect(inferResourceType('/api/v1/users/:userId')).toBe('User');
      expect(inferResourceType('/api/v1/orgs/{orgId}/devices')).toBe('Device');
    });

    it('should return "Unknown" for non-standard paths', () => {
      expect(inferResourceType('/api/v1')).toBe('Unknown');
      expect(inferResourceType('/')).toBe('Unknown');
    });
  });

  describe('extractResourceId()', () => {
    it('should extract ID from common param names', () => {
      expect(extractResourceId({ userId: 'user-123' })).toBe('user-123');
      expect(extractResourceId({ deviceId: 'device-456' })).toBe('device-456');
      expect(extractResourceId({ id: 'generic-789' })).toBe('generic-789');
    });

    it('should extract ID from any field ending with "Id"', () => {
      expect(extractResourceId({ customResourceId: 'custom-999' })).toBe('custom-999');
    });

    it('should return null if no ID found', () => {
      expect(extractResourceId({ name: 'test' })).toBeNull();
      expect(extractResourceId({})).toBeNull();
    });

    it('should prioritize specific ID fields', () => {
      const params = {
        orgId: 'org-111',
        userId: 'user-222',
        id: 'generic-333',
      };

      // Should return 'id' first as it's the most generic
      expect(extractResourceId(params)).toBe('generic-333');
    });
  });
});
