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
 * Generate a unique test identifier combining timestamp and random string
 * Useful for slugs, emails, and other string identifiers that need uniqueness.
 *
 * @returns A unique string in format: timestamp-randomchars
 * @example "1704123456789-a3b2c1"
 */
export const createTestIdentifier = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(7)}`;
