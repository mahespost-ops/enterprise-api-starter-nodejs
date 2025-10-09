/**
 * Member Constants
 * Organization member-related values and defaults
 */

/**
 * Member status values
 * - invited: Member has been invited but not yet accepted
 * - active: Member is active in the organization
 * - suspended: Member access has been suspended
 */
export const MEMBER_STATUS = {
  INVITED: 'invited',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;

export type MemberStatus = (typeof MEMBER_STATUS)[keyof typeof MEMBER_STATUS];

/**
 * Filterable fields for admin organization member list endpoint
 */
export const MEMBER_FILTERABLE_FIELDS = {
  STATUS: 'status',
  CREATED_AT: 'createdAt',
  JOINED_AT: 'joinedAt',
} as const;

/**
 * Sortable fields for admin organization member list endpoint
 */
export const MEMBER_SORTABLE_FIELDS = {
  CREATED_AT: 'createdAt',
  JOINED_AT: 'joinedAt',
  STATUS: 'status',
} as const;

/**
 * Searchable fields for admin organization member list endpoint
 * Search is performed on associated user fields
 */
export const MEMBER_SEARCHABLE_FIELDS = ['email', 'givenName', 'familyName'] as const;
