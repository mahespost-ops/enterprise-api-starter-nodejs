/**
 * Session Constants
 * Defines filterable, sortable, and searchable fields for session operations
 */

/**
 * Fields that can be used for filtering sessions
 */
export const SESSION_FILTERABLE_FIELDS = {
  USER_ID: 'userId',
  DEVICE_ID: 'deviceId',
  IS_ACTIVE: 'isActive',
  IS_REVOKED: 'isRevoked',
  CREATED_AT: 'createdAt',
  LAST_ACCESSED_AT: 'lastAccessedAt',
  EXPIRES_AT: 'expiresAt',
} as const;

/**
 * Fields that can be used for sorting sessions
 * Maps API field names to database field names
 */
export const SESSION_SORTABLE_FIELDS = {
  CREATED_AT: 'createdAt',
  LAST_ACCESSED_AT: 'lastAccessedAt',
  EXPIRES_AT: 'expiresAt',
  REQUEST_COUNT: 'requestCount',
  IS_ACTIVE: 'isActive',
} as const;

/**
 * Fields that can be used for searching sessions (full-text)
 * Note: Excludes ipAddress (INET type) to avoid type casting issues
 */
export const SESSION_SEARCHABLE_FIELDS = ['userAgent', 'lastActivityType'] as const;
