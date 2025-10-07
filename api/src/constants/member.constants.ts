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
