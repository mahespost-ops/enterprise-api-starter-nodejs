/**
 * CloudEvents 1.0.2 Constants
 *
 * Constants for CloudEvents spec compliance.
 * @see https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
 */

/**
 * CloudEvents specification version
 */
export const CLOUDEVENTS_SPEC_VERSION = '1.0.2' as const;

/**
 * Event type prefix for this organization
 * Format: {prefix}.{verb} (e.g., "com.enterprise.user.created")
 */
export const CLOUDEVENTS_TYPE_PREFIX = 'com.enterprise' as const;

/**
 * Data content type for CloudEvents payloads
 */
export const CLOUDEVENTS_CONTENT_TYPE = 'application/json' as const;

/**
 * Required CloudEvents attributes (MUST be present)
 */
export const CLOUDEVENTS_REQUIRED_ATTRIBUTES = [
  'specversion',
  'type',
  'source',
  'id',
] as const;

/**
 * Optional CloudEvents attributes (MAY be present)
 */
export const CLOUDEVENTS_OPTIONAL_ATTRIBUTES = [
  'time',
  'datacontenttype',
  'dataschema',
  'subject',
  'data',
] as const;
