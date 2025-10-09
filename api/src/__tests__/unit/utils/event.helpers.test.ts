/**
 * Event Helpers Tests
 *
 * Tests for event helper utility functions
 */

// Mock uuid before imports
jest.mock('uuid', () => ({
  v4: (): string => 'test-uuid-1234',
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
  redactHeaders,
  redactBody,
  redactQuery,
  redactRequestSnapshot,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  describe('redactHeaders()', () => {
    it('should redact authorization header', () => {
      const headers = {
        'authorization': 'Bearer secret-token-12345',
        'content-type': 'application/json',
      };

      const redacted = redactHeaders(headers);

      expect(redacted['authorization']).toBe('[REDACTED]');
      expect(redacted['content-type']).toBe('application/json');
    });

    it('should redact authorization header (case-insensitive)', () => {
      const headers = {
        'Authorization': 'Bearer secret-token-12345',
        'AUTHORIZATION': 'Bearer another-token',
      };

      const redacted = redactHeaders(headers);

      expect(redacted['Authorization']).toBe('[REDACTED]');
      expect(redacted['AUTHORIZATION']).toBe('[REDACTED]');
    });

    it('should redact cookie headers', () => {
      const headers = {
        'cookie': 'sessionId=abc123; token=xyz789',
        'set-cookie': 'sessionId=abc123; Path=/; HttpOnly',
      };

      const redacted = redactHeaders(headers);

      expect(redacted['cookie']).toBe('[REDACTED]');
      expect(redacted['set-cookie']).toBe('[REDACTED]');
    });

    it('should redact API key headers', () => {
      const headers = {
        'x-api-key': 'secret-api-key-12345',
        'api-key': 'another-secret-key',
        'apikey': 'yet-another-key',
      };

      const redacted = redactHeaders(headers);

      expect(redacted['x-api-key']).toBe('[REDACTED]');
      expect(redacted['api-key']).toBe('[REDACTED]');
      expect(redacted['apikey']).toBe('[REDACTED]');
    });

    it('should preserve non-sensitive headers', () => {
      const headers = {
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0',
        'accept': 'application/json',
      };

      const redacted = redactHeaders(headers);

      expect(redacted).toEqual(headers);
    });

    it('should handle array header values', () => {
      const headers: Record<string, string | string[] | undefined> = {
        'authorization': ['Bearer token1', 'Bearer token2'],
        'content-type': 'application/json',
      };

      const redacted = redactHeaders(headers);

      expect(redacted['authorization']).toBe('[REDACTED]');
      expect(redacted['content-type']).toBe('application/json');
    });
  });

  describe('redactBody()', () => {
    it('should redact password field', () => {
      const body = {
        email: 'user@example.com',
        password: 'super-secret-password',
        fullName: 'John Doe',
      };

      const redacted = redactBody(body);

      expect(redacted).toEqual({
        email: 'user@example.com',
        password: '[REDACTED]',
        fullName: 'John Doe',
      });
    });

    it('should redact multiple sensitive fields', () => {
      const body = {
        username: 'john',
        password: 'secret123',
        apiKey: 'key-12345',
        token: 'jwt-token',
        secret: 'my-secret',
      };

      const redacted = redactBody(body);

      expect(redacted).toEqual({
        username: 'john',
        password: '[REDACTED]',
        apiKey: '[REDACTED]',
        token: '[REDACTED]',
        secret: '[REDACTED]',
      });
    });

    it('should handle nested objects', () => {
      const body = {
        user: {
          email: 'user@example.com',
          password: 'secret',
          profile: {
            name: 'John',
            apiKey: 'nested-key',
          },
        },
        token: 'jwt-token',
      };

      const redacted = redactBody(body);

      expect(redacted).toEqual({
        user: {
          email: 'user@example.com',
          password: '[REDACTED]',
          profile: {
            name: 'John',
            apiKey: '[REDACTED]',
          },
        },
        token: '[REDACTED]',
      });
    });

    it('should handle arrays', () => {
      const body = {
        users: [
          { email: 'user1@example.com', password: 'secret1' },
          { email: 'user2@example.com', password: 'secret2' },
        ],
      };

      const redacted = redactBody(body);

      expect(redacted).toEqual({
        users: [
          { email: 'user1@example.com', password: '[REDACTED]' },
          { email: 'user2@example.com', password: '[REDACTED]' },
        ],
      });
    });

    it('should handle null and undefined', () => {
      expect(redactBody(null)).toBeNull();
      expect(redactBody(undefined)).toBeUndefined();
    });

    it('should handle primitives', () => {
      expect(redactBody('string')).toBe('string');
      expect(redactBody(123)).toBe(123);
      expect(redactBody(true)).toBe(true);
    });

    it('should redact sensitive field name variations', () => {
      const body = {
        user_password: 'secret1',
        apiKey: 'secret2',
        api_key: 'secret3',
        privateKey: 'secret4',
        private_key: 'secret5',
        accessKey: 'secret6',
        clientSecret: 'secret7',
        bearerToken: 'secret8',
        credentials: 'secret9',
        authToken: 'secret10',
      };

      const redacted = redactBody(body) as Record<string, string>;

      expect(redacted.user_password).toBe('[REDACTED]');
      expect(redacted.apiKey).toBe('[REDACTED]');
      expect(redacted.api_key).toBe('[REDACTED]');
      expect(redacted.privateKey).toBe('[REDACTED]');
      expect(redacted.private_key).toBe('[REDACTED]');
      expect(redacted.accessKey).toBe('[REDACTED]');
      expect(redacted.clientSecret).toBe('[REDACTED]');
      expect(redacted.bearerToken).toBe('[REDACTED]');
      expect(redacted.credentials).toBe('[REDACTED]');
      expect(redacted.authToken).toBe('[REDACTED]');
    });

    it('should redact security-sensitive fields', () => {
      const body = {
        fingerprint: 'device-fingerprint-hash',
        hash: 'password-hash',
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
        cvv: '123',
      };

      const redacted = redactBody(body) as Record<string, string>;

      expect(redacted.fingerprint).toBe('[REDACTED]');
      expect(redacted.hash).toBe('[REDACTED]');
      expect(redacted.ssn).toBe('[REDACTED]');
      expect(redacted.creditCard).toBe('[REDACTED]');
      expect(redacted.cvv).toBe('[REDACTED]');
    });
  });

  describe('redactQuery()', () => {
    it('should redact sensitive query parameters', () => {
      const query = {
        search: 'user@example.com',
        token: 'secret-token',
        apiKey: 'secret-key',
      };

      const redacted = redactQuery(query);

      expect(redacted).toEqual({
        search: 'user@example.com',
        token: '[REDACTED]',
        apiKey: '[REDACTED]',
      });
    });
  });

  describe('redactRequestSnapshot()', () => {
    it('should redact all sensitive data from request snapshot', () => {
      const snapshot: RequestSnapshot = {
        method: 'POST',
        path: '/api/v1/auth/register',
        headers: {
          'authorization': 'Bearer secret-token',
          'content-type': 'application/json',
        },
        body: {
          email: 'user@example.com',
          password: 'super-secret',
        },
        query: {
          token: 'query-token',
          search: 'test',
        },
        params: { orgId: 'org-123' },
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      };

      const redacted = redactRequestSnapshot(snapshot);

      expect(redacted.headers['authorization']).toBe('[REDACTED]');
      expect(redacted.headers['content-type']).toBe('application/json');
      expect((redacted.body as Record<string, unknown>).email).toBe('user@example.com');
      expect((redacted.body as Record<string, unknown>).password).toBe('[REDACTED]');
      expect(redacted.query.token).toBe('[REDACTED]');
      expect(redacted.query.search).toBe('test');
      expect(redacted.params).toEqual({ orgId: 'org-123' });
      expect(redacted.ip).toBe('192.168.1.100');
      expect(redacted.userAgent).toBe('Mozilla/5.0');
    });

    it('should preserve original request snapshot structure', () => {
      const snapshot: RequestSnapshot = {
        method: 'GET',
        path: '/api/v1/users',
        headers: {},
        body: null,
        query: {},
        params: {},
        ip: '127.0.0.1',
        userAgent: 'Test Agent',
      };

      const redacted = redactRequestSnapshot(snapshot);

      expect(redacted.method).toBe('GET');
      expect(redacted.path).toBe('/api/v1/users');
      expect(redacted.body).toBeNull();
    });
  });
});
