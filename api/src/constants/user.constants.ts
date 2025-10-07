/**
 * User Constants
 * User account-related values and defaults
 */

/**
 * Preferred authentication method
 */
export const AUTH_METHOD = {
  EMAIL: 'email',
  SMS: 'sms',
} as const;

export type AuthMethod = (typeof AUTH_METHOD)[keyof typeof AUTH_METHOD];

/**
 * Filterable fields for admin user list endpoint
 */
export const USER_FILTERABLE_FIELDS = {
  IS_ACTIVE: 'isActive',
  ORGANIZATION_ID: 'organizationId',
  EMAIL_VERIFIED: 'emailVerified',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const;

/**
 * Sortable fields for admin user list endpoint
 */
export const USER_SORTABLE_FIELDS = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  EMAIL: 'email',
  NAME: 'name',
} as const;

/**
 * Searchable fields for admin user list endpoint
 * Full-text search across these fields
 * Note: Only actual database columns, not computed properties like 'fullName'
 */
export const USER_SEARCHABLE_FIELDS = ['email', 'givenName', 'familyName'] as const;
