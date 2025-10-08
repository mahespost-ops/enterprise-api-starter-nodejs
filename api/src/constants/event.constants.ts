/**
 * Event Constants
 *
 * Constants for event (activity log) operations including filterable, sortable, and searchable fields.
 * Events use cursor-based pagination for high-volume scenarios (10M+ records).
 */

/**
 * Fields that can be filtered in event queries
 * Used for query parameter validation and model filtering
 */
export const EVENT_FILTERABLE_FIELDS = [
  'verb',
  'actorType',
  'actorId',
  'organizationId',
  'environmentId',
  'isWebhookEvent',
  'timestamp',
] as const;

/**
 * Fields that can be sorted in event queries
 * Used for query parameter validation and model ordering
 */
export const EVENT_SORTABLE_FIELDS = ['timestamp', 'verb', 'actorType'] as const;

/**
 * Fields that are searchable (full-text) in event queries
 * Used for search query implementation
 */
export const EVENT_SEARCHABLE_FIELDS = ['description', 'verb'] as const;

/**
 * All selectable fields for field selection optimization
 * Matches Event model attributes
 */
export const EVENT_SELECTABLE_FIELDS = [
  'id',
  'environmentId',
  'verb',
  'actorType',
  'actor',
  'object',
  'target',
  'audit',
  'description',
  'timestamp',
  'organizationId',
  'organizationName',
  'environmentName',
  'isWebhookEvent',
] as const;

/**
 * Denormalized fields that should always be included in responses
 * These fields are critical for event context and cannot be excluded
 */
export const EVENT_REQUIRED_FIELDS = [
  'id',
  'verb',
  'timestamp',
  'organizationId',
  'organizationName',
  'environmentId',
  'environmentName',
] as const;
