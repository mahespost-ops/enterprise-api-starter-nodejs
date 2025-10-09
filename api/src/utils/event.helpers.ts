/**
 * Event Helper Utilities
 *
 * Reusable functions for building Event JSONB fields and CloudEvents data.
 * These helpers follow DRY principles and are used across the event logging system.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  EventData,
  EventContext,
  RequestSnapshot,
  ResponseSnapshot,
  CloudEvent,
  CloudEventActor,
  CloudEventObject,
  CloudEventTarget,
  CloudEventAudit,
} from '../types/event.types';
import { CLOUDEVENTS_SPEC_VERSION, CLOUDEVENTS_TYPE_PREFIX, CLOUDEVENTS_CONTENT_TYPE } from '../constants/cloudevents.constants';

/**
 * Build actor JSONB field for Event model
 * Includes impersonation context if present
 */
export function buildActor(context: EventContext): Record<string, unknown> {
  if (!context.userId) {
    return {
      type: 'System',
      id: null,
      name: 'System',
      email: null,
      impersonation: null,
    };
  }

  return {
    type: 'User',
    id: context.userId,
    name: context.userName || null,
    email: context.userEmail || null,
    impersonation: context.impersonation ? {
      impersonatorId: context.impersonation.impersonatorId,
      impersonatorEmail: context.impersonation.impersonatorEmail,
      impersonatedAt: context.impersonation.impersonatedAt.toISOString(),
    } : null,
  };
}

/**
 * Build CloudEvents actor field
 */
export function buildCloudEventActor(context: EventContext): CloudEventActor {
  if (!context.userId) {
    return {
      type: 'System',
    };
  }

  return {
    type: 'User',
    id: context.userId,
    name: context.userName,
    email: context.userEmail,
    impersonation: context.impersonation || null,
  };
}

/**
 * Build object JSONB field (primary resource being acted upon)
 * Extracts resource information from request body and params
 */
export function buildObject(request: RequestSnapshot): Record<string, unknown> {
  const body = (request.body as Record<string, unknown>) || {};
  const params = request.params || {};

  // Try to infer resource type from path
  const resourceType = inferResourceType(request.path);

  // Try to extract ID from params (common patterns)
  const resourceId = extractResourceId(params);

  return {
    type: resourceType,
    id: resourceId,
    ...body,
  };
}

/**
 * Build CloudEvents object field
 */
export function buildCloudEventObject(request: RequestSnapshot): CloudEventObject {
  const body = (request.body as Record<string, unknown>) || {};
  const params = request.params || {};
  const resourceId = extractResourceId(params);

  return {
    type: inferResourceType(request.path),
    ...(resourceId ? { id: resourceId } : {}),
    ...body,
  };
}

/**
 * Build target JSONB field (secondary resource, if applicable)
 * Example: when adding a member to a group, the group is the target
 */
export function buildTarget(_request: RequestSnapshot): Record<string, unknown> | null {
  // TODO: Implement target extraction logic based on specific endpoints
  // For now, return null (most operations don't have a secondary target)
  return null;
}

/**
 * Build CloudEvents target field
 */
export function buildCloudEventTarget(request: RequestSnapshot): CloudEventTarget | null {
  return buildTarget(request) as CloudEventTarget | null;
}

/**
 * Build audit JSONB field (HTTP metadata, IP, user agent)
 */
export function buildAudit(
  request: RequestSnapshot,
  response: ResponseSnapshot,
  requestId: string
): Record<string, unknown> {
  return {
    http: {
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      duration: response.duration,
    },
    ip: request.ip,
    userAgent: request.userAgent,
    requestId,
  };
}

/**
 * Build CloudEvents audit field
 */
export function buildCloudEventAudit(
  request: RequestSnapshot,
  response: ResponseSnapshot,
  requestId: string
): CloudEventAudit {
  return {
    http: {
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      duration: response.duration,
    },
    ip: request.ip,
    userAgent: request.userAgent,
    requestId,
  };
}

/**
 * Build human-readable description of the event
 */
export function buildDescription(eventData: EventData): string {
  const { verb } = eventData.eventType;
  const { context } = eventData;

  // Determine actor name
  let actorName: string;
  if (!context.userId) {
    actorName = 'System';
  } else {
    actorName = context.userName || 'User';
  }

  return `${actorName} performed ${verb}`;
}

/**
 * Convert EventData to CloudEvents 1.0.2 format
 */
export function toCloudEvent(eventData: EventData): CloudEvent {
  const { eventType, request, response, context } = eventData;

  // Build source URI
  const source = context.orgId && context.envId
    ? `/orgs/${context.orgId}/envs/${context.envId}`
    : '/system';

  return {
    specversion: CLOUDEVENTS_SPEC_VERSION,
    type: `${CLOUDEVENTS_TYPE_PREFIX}.${eventType.verb}`,
    source,
    id: uuidv4(),
    time: new Date().toISOString(),
    datacontenttype: CLOUDEVENTS_CONTENT_TYPE,
    data: {
      actor: buildCloudEventActor(context),
      object: buildCloudEventObject(request),
      target: buildCloudEventTarget(request),
      audit: buildCloudEventAudit(request, response, context.requestId),
    },
  };
}

/**
 * Infer resource type from API path
 * Example: /api/v1/orgs/{orgId}/users/{userId} → "User"
 */
export function inferResourceType(path: string): string {
  // Remove query parameters if present
  const cleanPath = path.split('?')[0];

  // Split path into segments
  const segments = cleanPath.split('/').filter(s => s.length > 0);

  // Find the last non-parameter segment
  // Skip parameter placeholders (:param or {param}) and ID values (containing hyphens)
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];

    // Skip parameter placeholders
    if (segment.startsWith(':') || segment.startsWith('{')) {
      continue;
    }

    // Skip likely ID values (contains hyphens like UUID/nanoid)
    if (segment.includes('-')) {
      continue;
    }

    // Skip known non-resource segments
    if (['api', 'v1', 'v2', 'admin'].includes(segment.toLowerCase())) {
      continue;
    }

    // Capitalize first letter and make singular
    const capitalized = segment.charAt(0).toUpperCase() + segment.slice(1);
    // Remove trailing 's' if plural
    return capitalized.endsWith('s') ? capitalized.slice(0, -1) : capitalized;
  }

  return 'Unknown';
}

/**
 * Extract resource ID from request params
 * Tries common param names: id, userId, deviceId, orgId, etc.
 */
export function extractResourceId(params: Record<string, unknown>): string | null {
  // Try specific ID fields first
  const idFields = [
    'id',
    'userId',
    'deviceId',
    'sessionId',
    'groupId',
    'roleId',
    'webhookId',
    'eventId',
  ];

  for (const field of idFields) {
    if (params[field]) {
      return String(params[field]);
    }
  }

  // Try any field ending with 'Id'
  for (const [key, value] of Object.entries(params)) {
    if (key.endsWith('Id') && value) {
      return String(value);
    }
  }

  return null;
}
