/**
 * Event Logging Type Definitions
 *
 * TypeScript interfaces for the event logging system including:
 * - Event data structures
 * - CloudEvents 1.0.2 format
 * - Request/Response snapshots
 * - WAL entries
 */

import { EventType } from '../models/EventType.model';

/**
 * Event data captured from HTTP request/response
 * This is the internal format used throughout the event logging pipeline
 */
export interface EventData {
  eventType: EventType;
  request: RequestSnapshot;
  response: ResponseSnapshot;
  context: EventContext;
}

/**
 * Snapshot of HTTP request data
 */
export interface RequestSnapshot {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
  ip: string;
  userAgent: string;
}

/**
 * Snapshot of HTTP response data
 */
export interface ResponseSnapshot {
  statusCode: number;
  duration: number; // milliseconds
}

/**
 * Context about the actor and tenant performing the action
 */
export interface EventContext {
  userId?: string;
  userName?: string;
  userEmail?: string;
  orgId?: string;
  envId?: string;
  orgName?: string;
  envName?: string;
  impersonation?: ImpersonationContext | null;
  requestId: string;
}

/**
 * Impersonation context when an admin is acting as another user
 */
export interface ImpersonationContext {
  impersonatorId: string;
  impersonatorEmail: string;
  impersonatedAt: Date;
}

/**
 * CloudEvents 1.0.2 format
 * @see https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
 */
export interface CloudEvent {
  specversion: '1.0.2';
  type: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: 'application/json';
  data: CloudEventData;
}

/**
 * CloudEvents data payload
 * Follows W3C Activity Streams pattern with actor/object/target
 */
export interface CloudEventData {
  actor: CloudEventActor;
  object: CloudEventObject;
  target?: CloudEventTarget | null;
  audit: CloudEventAudit;
}

/**
 * Actor performing the action (User or System)
 */
export interface CloudEventActor {
  type: 'User' | 'System';
  id?: string;
  name?: string;
  email?: string;
  impersonation?: ImpersonationContext | null;
}

/**
 * Primary resource being acted upon
 */
export interface CloudEventObject {
  type: string;
  id?: string;
  [key: string]: unknown;
}

/**
 * Secondary resource (optional, e.g., group when adding member)
 */
export interface CloudEventTarget {
  type: string;
  id?: string;
  [key: string]: unknown;
}

/**
 * Audit metadata (HTTP request/response details)
 */
export interface CloudEventAudit {
  http: {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
  };
  ip: string;
  userAgent: string;
  requestId: string;
}

/**
 * Write-Ahead Log entry format (JSONL)
 * Used for crash recovery when events fail to write to database
 */
export interface WALEntry {
  timestamp: string;
  eventData: EventData;
  retries: number;
}
