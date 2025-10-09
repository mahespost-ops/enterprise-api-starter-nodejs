/**
 * Event Type Constants
 *
 * Constants for event type operations including filterable, sortable, and searchable fields.
 * Event types use offset-based pagination (not high-volume like events).
 */

/**
 * Fields that can be filtered in event type queries
 * Used for query parameter validation and model filtering
 */
export const EVENT_TYPE_FILTERABLE_FIELDS = [
  'verb',
  'httpMethod',
  'isWebhookEvent',
  'createdAt',
] as const;

/**
 * Fields that can be sorted in event type queries
 * Used for query parameter validation and model ordering
 */
export const EVENT_TYPE_SORTABLE_FIELDS = ['verb', 'httpMethod', 'createdAt'] as const;

/**
 * Fields that are searchable (full-text) in event type queries
 * Used for search query implementation
 */
export const EVENT_TYPE_SEARCHABLE_FIELDS = ['verb', 'httpPath', 'description'] as const;

/**
 * All selectable fields for field selection optimization
 * Matches EventType model attributes
 */
export const EVENT_TYPE_SELECTABLE_FIELDS = [
  'id',
  'verb',
  'httpMethod',
  'httpPath',
  'description',
  'isWebhookEvent',
  'createdAt',
] as const;
