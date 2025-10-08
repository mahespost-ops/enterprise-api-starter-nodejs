/**
 * Standard Test Constants
 *
 * Centralized constants for test data to ensure consistency, readability, and maintainability.
 *
 * ## UUID Pattern Convention
 *
 * Pattern-based UUIDs for easy identification in tests and logs:
 * - 00000000-0000-0000-0000-0000000000XX: System/special entities (00=null, 01=admin, etc.)
 * - XXXXXXX1-XXXX-XXXX-XXXX-XXXXXXXXXXXX: Users (ending in 1)
 * - XXXXXXX2-XXXX-XXXX-XXXX-XXXXXXXXXXXX: Organizations (ending in 2)
 * - XXXXXXX3-XXXX-XXXX-XXXX-XXXXXXXXXXXX: Environments (ending in 3)
 * - XXXXXXX4-XXXX-XXXX-XXXX-XXXXXXXXXXXX: Devices (ending in 4)
 * - XXXXXXX5-XXXX-XXXX-XXXX-XXXXXXXXXXXX: Sessions (ending in 5)
 *
 * ## Usage Guidelines
 *
 * **Use Test Constants When:**
 * - Testing with JWT tokens that need specific org/env IDs
 * - Testing non-existent entity scenarios (404, 403)
 * - Testing permission checks with known user IDs
 * - Sharing test data across multiple test cases
 *
 * **Use `crypto.randomUUID()` When:**
 * - Creating unique entities that must not conflict (multiple orgs, users)
 * - Integration tests that create and destroy entities per test
 * - Testing concurrent operations
 * - Verifying entity isolation
 */

export const TEST_UUIDS = {
  // ============================================================================
  // System/Special UUIDs
  // ============================================================================

  /** Null/zero UUID - commonly used for non-existent entities */
  NULL: '00000000-0000-0000-0000-000000000000',

  /** Non-existent UUID - used for testing 404 scenarios */
  NONEXISTENT: '99999999-9999-9999-9999-999999999999',

  // ============================================================================
  // Users (ending in 1)
  // ============================================================================

  /** System admin user */
  USER_ADMIN: '00000000-0000-0000-0000-000000000001',

  /** Regular user with standard permissions */
  USER_REGULAR: '11111111-1111-1111-1111-111111111111',

  /** Secondary regular user for multi-user testing */
  USER_REGULAR_2: '11111111-1111-1111-1111-111111111112',

  /** Primary test user */
  USER_TEST: '12345678-1234-1234-1234-123456789001',

  /** Deleted/inactive user for testing edge cases */
  USER_DELETED: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',

  /** Secondary test user for multi-user scenarios */
  USER_OTHER: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',

  // ============================================================================
  // Organizations (ending in 2)
  // ============================================================================

  /** Default test organization */
  ORG_DEFAULT: '22222222-2222-2222-2222-222222222222',

  /** Primary test organization (legacy UUID maintained for compatibility) */
  ORG_TEST: '550e8400-e29b-41d4-a716-446655440002',

  /** Secondary test organization */
  ORG_TEST_2: '550e8400-e29b-41d4-a716-446655440003',

  /** Secondary organization for multi-tenant testing */
  ORG_SECONDARY: 'cccccccc-cccc-cccc-cccc-cccccccccc02',

  /** Unauthorized organization (user not a member) */
  ORG_UNAUTHORIZED: 'dddddddd-dddd-dddd-dddd-dddddddddd02',

  // ============================================================================
  // Environments (ending in 3)
  // ============================================================================

  /** Live/production environment (legacy UUID maintained for compatibility) */
  ENV_LIVE: '7c9e6679-7425-40de-944b-e07fc1f90003',

  /** Sandbox/test environment */
  ENV_SANDBOX: '33333333-3333-3333-3333-333333333333',

  /** Secondary test environment */
  ENV_TEST: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03',

  /** Development environment */
  ENV_DEV: 'ffffffff-ffff-ffff-ffff-ffffffffff03',

  // ============================================================================
  // Devices (ending in 4)
  // ============================================================================

  /** Primary test device */
  DEVICE_1: '44444444-4444-4444-4444-444444444441',

  /** Secondary test device */
  DEVICE_2: '44444444-4444-4444-4444-444444444442',

  /** Third test device */
  DEVICE_3: '44444444-4444-4444-4444-444444444443',

  /** Trusted device */
  DEVICE_TRUSTED: '44444444-4444-4444-4444-444444444444',

  /** Pending/untrusted device */
  DEVICE_PENDING: '55555555-5555-5555-5555-555555555554',

  /** Revoked device */
  DEVICE_REVOKED: '66666666-6666-6666-6666-666666666664',

  // ============================================================================
  // Sessions (ending in 5)
  // ============================================================================

  /** Active session */
  SESSION_ACTIVE: '77777777-7777-7777-7777-777777777775',

  /** Expired session */
  SESSION_EXPIRED: '88888888-8888-8888-8888-888888888885',

  /** Revoked session */
  SESSION_REVOKED: '99999999-9999-9999-9999-999999999995',

  /** Primary test session */
  SESSION_1: '55555555-5555-5555-5555-555555555551',

  /** Secondary test session */
  SESSION_2: '55555555-5555-5555-5555-555555555552',

  /** Third test session */
  SESSION_3: '55555555-5555-5555-5555-555555555553',

  // ============================================================================
  // Groups (ending in 6)
  // ============================================================================

  /** Primary test group */
  GROUP_1: '66666666-6666-6666-6666-666666666661',

  /** Second test group */
  GROUP_2: '66666666-6666-6666-6666-666666666662',

  /** Third test group */
  GROUP_3: '66666666-6666-6666-6666-666666666663',

  /** Engineering group */
  GROUP_ENGINEERING: '66666666-6666-6666-6666-666666666666',

  /** Admin group */
  GROUP_ADMIN: '77777777-7777-7777-7777-777777777776',

  /** Secondary test group */
  GROUP_TEST: '88888888-8888-8888-8888-888888888886',

  /** Non-existent group */
  GROUP_NONEXISTENT: '99999999-9999-9999-9999-999999999996',

  // ============================================================================
  // Members (ending in 7)
  // ============================================================================

  /** Primary test member */
  MEMBER_1: '77777777-7777-7777-7777-777777777771',

  /** Secondary test member */
  MEMBER_2: '77777777-7777-7777-7777-777777777772',

  /** Non-existent member */
  MEMBER_NONEXISTENT: '99999999-9999-9999-9999-999999999997',

  /** Non-existent organization */
  ORG_NONEXISTENT: '99999999-9999-9999-9999-999999999992',

  // ============================================================================
  // Roles (ending in 8)
  // ============================================================================

  /** Admin role */
  ROLE_ADMIN: '88888888-8888-8888-8888-888888888881',

  /** Custom role */
  ROLE_CUSTOM: '88888888-8888-8888-8888-888888888882',

  /** System role */
  ROLE_SYSTEM: '88888888-8888-8888-8888-888888888883',

  /** Non-existent role */
  ROLE_NONEXISTENT: '99999999-9999-9999-9999-999999999998',

  // ============================================================================
  // Permissions (ending in 9)
  // ============================================================================

  /** Devices read permission */
  PERMISSION_DEVICES_READ: '99999999-9999-9999-9999-999999999991',

  /** Devices manage permission */
  PERMISSION_DEVICES_MANAGE: '99999999-9999-9999-9999-999999999992',

  /** Sessions manage permission */
  PERMISSION_SESSIONS_MANAGE: '99999999-9999-9999-9999-999999999993',

  /** Non-existent permission */
  PERMISSION_NONEXISTENT: '99999999-9999-9999-9999-999999999999',

  // ============================================================================
  // Role Assignments (ending in A)
  // ============================================================================

  /** First test assignment (member) */
  ASSIGNMENT_1: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',

  /** Second test assignment (group) */
  ASSIGNMENT_2: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',

  /** Third test assignment */
  ASSIGNMENT_3: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',

  // ============================================================================
  // Events (ending in B)
  // ============================================================================

  /** Primary test event */
  EVENT_1: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',

  /** Secondary test event */
  EVENT_2: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',

  /** Third test event */
  EVENT_3: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',

  /** Non-existent event */
  EVENT_NONEXISTENT: '99999999-9999-9999-9999-99999999999b',
} as const;

/**
 * Test Helpers for Dynamic UUID Generation
 *
 * Use these when you need unique UUIDs that won't conflict with test constants.
 */

/**
 * Generate a random UUID for test isolation
 * Use when creating unique entities that must not conflict with other test data.
 *
 * @returns A v4 UUID string
 */
export const createTestUUID = (): string => crypto.randomUUID();

/**
 * Generate a unique test identifier combining prefix, timestamp, and random string
 * Useful for slugs, emails, and other string identifiers that need uniqueness.
 *
 * @param prefix - Optional prefix for the identifier (e.g., 'admin', 'user', 'org')
 * @param type - Optional type suffix ('email' or 'slug')
 * @returns A unique string in format: prefix-timestamp-randomchars[@example.com]
 * @example createTestIdentifier('admin', 'email') => "admin-1704123456789-a3b2c1@example.com"
 * @example createTestIdentifier('org', 'slug') => "org-1704123456789-a3b2c1"
 * @example createTestIdentifier('org') => "org-1704123456789-a3b2c1"
 */
export const createTestIdentifier = (prefix = 'test', type?: 'email' | 'slug'): string => {
  const base = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  if (type === 'email') {
    return `${base}@example.com`;
  }
  return base;
};
