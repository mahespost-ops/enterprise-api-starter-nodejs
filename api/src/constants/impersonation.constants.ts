/**
 * Impersonation Constants
 * Configuration values and field definitions for impersonation management
 */

/**
 * Impersonation session durations (in minutes)
 */
export const IMPERSONATION_DURATION = {
  MIN: 5, // Minimum session duration
  MAX: 480, // Maximum session duration (8 hours)
  DEFAULT: 60, // Default session duration (1 hour)
} as const;

/**
 * Impersonation types
 */
export const IMPERSONATION_TYPE = {
  SYSTEM: 'system' as const,
  ORGANIZATION: 'organization' as const,
} as const;

/**
 * Fields that can be filtered when listing impersonation sessions
 */
export const IMPERSONATION_FILTERABLE_FIELDS = {
  ORIGINAL_USER_ID: 'originalUserId',
  IMPERSONATED_USER_ID: 'impersonatedUserId',
  IMPERSONATION_TYPE: 'impersonationType',
  IS_ACTIVE: 'isActive',
  ENVIRONMENT_ID: 'environmentId',
  STARTED_AT: 'startedAt',
  EXPIRES_AT: 'expiresAt',
  ENDED_AT: 'endedAt',
} as const;

/**
 * Fields that can be used for sorting impersonation sessions
 */
export const IMPERSONATION_SORTABLE_FIELDS = {
  STARTED_AT: 'startedAt',
  EXPIRES_AT: 'expiresAt',
  ENDED_AT: 'endedAt',
  IMPERSONATION_TYPE: 'impersonationType',
  IS_ACTIVE: 'isActive',
} as const;

/**
 * Fields that can be searched in impersonation sessions
 * Note: Search operates on associated user fields (email, name)
 */
export const IMPERSONATION_SEARCHABLE_FIELDS = [
  'reason', // Search in reason text
] as const;
