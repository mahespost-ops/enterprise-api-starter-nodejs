# Test Standards and Best Practices

**Last Updated:** 2025-10-04
**Status:** Living Document - Updated as patterns emerge

---

## Table of Contents

1. [Test Organization](#test-organization)
2. [Test Constants and Data](#test-constants-and-data)
3. [Test Helpers](#test-helpers)
4. [Naming Conventions](#naming-conventions)
5. [Test Structure (AAA Pattern)](#test-structure-aaa-pattern)
6. [Database and State Management](#database-and-state-management)
7. [Mocking Guidelines](#mocking-guidelines)
8. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
9. [Lessons Learned](#lessons-learned)

---

## Test Organization

### Directory Structure

```
src/__tests__/
├── helpers/
│   ├── auth.helpers.ts          # Auth-specific test utilities
│   └── test-constants.ts        # Centralized test data constants
├── integration/
│   ├── auth.test.ts             # Authentication endpoints
│   ├── users.test.ts            # User endpoints
│   ├── organizations.test.ts    # Organization endpoints
│   ├── environments.test.ts     # Environment endpoints
│   └── admin/                   # Admin endpoints (future)
└── unit/
    └── middleware/              # Middleware unit tests
        ├── auth.middleware.test.ts
        ├── rbac.middleware.test.ts
        └── rate-limit.middleware.test.ts
```

### Collocated Tests

Following modern best practices (Next.js, Remix, Vite), tests are collocated with source code in `src/__tests__/` rather than a separate top-level `tests/` directory.

**Benefits:**
- Tests travel with code during refactoring
- Clear component-test relationship
- Consistency with existing adapter tests

---

## Test Constants and Data

### Centralized Constants (`helpers/test-constants.ts`)

**CRITICAL:** Always use centralized test constants instead of hardcoded values.

```typescript
import { TEST_UUIDS, createTestUUID, createTestIdentifier } from '../helpers/test-constants';

// ✅ GOOD: Use semantic constants
const token = generateTestJWT({
  sub: TEST_UUIDS.USER_ADMIN,
  orgId: TEST_UUIDS.ORG_TEST,
  envId: TEST_UUIDS.ENV_LIVE,
});

// ❌ BAD: Hardcoded UUIDs
const token = generateTestJWT({
  sub: '00000000-0000-0000-0000-000000000001',
  orgId: '550e8400-e29b-41d4-a716-446655440000',
  envId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
});
```

### UUID Pattern Convention

Pattern-based UUIDs for instant recognition in logs and tests:

| Entity Type | Pattern | Example Constant | Example UUID |
|------------|---------|------------------|--------------|
| System/Special | `00000000...` or `99999999...` | `TEST_UUIDS.NULL` | `00000000-0000-0000-0000-000000000000` |
| Users | Ends in `1` | `TEST_UUIDS.USER_ADMIN` | `00000000-0000-0000-0000-000000000001` |
| Organizations | Ends in `2` | `TEST_UUIDS.ORG_TEST` | `550e8400-e29b-41d4-a716-446655440002` |
| Environments | Ends in `3` | `TEST_UUIDS.ENV_LIVE` | `7c9e6679-7425-40de-944b-e07fc1f90003` |
| Devices | Ends in `4` | `TEST_UUIDS.DEVICE_TRUSTED` | `44444444-4444-4444-4444-444444444444` |
| Sessions | Ends in `5` | `TEST_UUIDS.SESSION_ACTIVE` | `77777777-7777-7777-7777-777777777775` |

### When to Use What

**Use Test Constants When:**
- ✅ Testing with JWT tokens that need specific org/env IDs
- ✅ Testing non-existent entity scenarios (404, 403)
- ✅ Testing permission checks with known user IDs
- ✅ Sharing test data across multiple test cases

**Use `crypto.randomUUID()` When:**
- ✅ Creating unique entities that must not conflict
- ✅ Integration tests that create and destroy entities per test
- ✅ Testing concurrent operations
- ✅ Verifying entity isolation

**Use `createTestIdentifier()` When:**
- ✅ Generating unique email addresses or slugs
- ✅ Preventing test pollution from duplicate identifiers
- ✅ Creating time-based unique strings

---

## Test Helpers

### Authentication Helpers (`helpers/auth.helpers.ts`)

Centralized utilities for authentication testing:

```typescript
import {
  generateTestJWT,
  generateExpiredTestJWT,
  getLatestMagicTokenForUser,
  grantPermissions,
  clearAllPermissions,
} from '../helpers/auth.helpers';

// Generate valid JWT for authenticated requests
const token = generateTestJWT({
  sub: user.id,
  orgId: TEST_UUIDS.ORG_TEST,
  envId: TEST_UUIDS.ENV_LIVE,
  user: { fullName: user.fullName, email: user.email },
});

// Grant permissions for RBAC testing
await grantPermissions(user.id, ['users:read', 'users:manage']);

// Extract magic token from mock email
const magicToken = await getLatestMagicTokenForUser(user.email);
```

### Creating New Helpers

**Guidelines:**
1. **Single Responsibility:** Each helper should do one thing well
2. **Clear Naming:** Use descriptive names that indicate purpose
3. **Type Safety:** Always provide TypeScript types
4. **Documentation:** Add JSDoc comments explaining usage
5. **Reusability:** Design for use across multiple test files

---

## Naming Conventions

### Test Suites (`describe` blocks)

```typescript
// ✅ GOOD: Clear, descriptive suite names
describe('POST /api/v1/auth/register - User Registration', () => {});
describe('GET /api/v1/users/me - Get current user profile', () => {});

// ❌ BAD: Vague or unclear
describe('Auth tests', () => {});
describe('User endpoint', () => {});
```

### Test Cases (`it` blocks)

```typescript
// ✅ GOOD: Descriptive, states expected behavior and result
it('should return user profile when authenticated (200)', async () => {});
it('should return 401 when not authenticated', async () => {});
it('should return 403 when user lacks required permission', async () => {});

// ❌ BAD: Unclear or missing context
it('works', async () => {});
it('returns 200', async () => {});
it('auth error', async () => {});
```

### Variable Names

```typescript
// ✅ GOOD: Semantic, clear purpose
const testUser = await User.create({ /* ... */ });
const authToken = generateTestJWT({ /* ... */ });
const nonExistentUserId = TEST_UUIDS.USER_DELETED;

// ❌ BAD: Generic, unclear
const user1 = await User.create({ /* ... */ });
const token = generateTestJWT({ /* ... */ });
const id = '00000000-0000-0000-0000-000000000000';
```

---

## Test Structure (AAA Pattern)

All tests follow the **Arrange-Act-Assert** pattern:

```typescript
it('should return user profile when authenticated (200)', async () => {
  // ===== ARRANGE: Set up test data and preconditions =====
  const user = await User.create({
    email: 'test@example.com',
    givenName: 'Test',
    familyName: 'User',
  });

  await grantPermissions(user.id, ['users:read']);

  const token = generateTestJWT({
    sub: user.id,
    orgId: TEST_UUIDS.ORG_TEST,
    envId: TEST_UUIDS.ENV_LIVE,
    user: { fullName: user.fullName, email: user.email },
  });

  // ===== ACT: Perform the action being tested =====
  const res = await request(app)
    .get('/api/v1/users/me')
    .set('Authorization', `Bearer ${token}`);

  // ===== ASSERT: Verify the expected outcome =====
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id', user.id);
  expect(res.body).toHaveProperty('email', user.email);
  expect(res.body).not.toHaveProperty('password_hash'); // Security check
});
```

**Guidelines:**
- **Arrange:** Set up all necessary preconditions, test data, mocks
- **Act:** Execute ONE action/operation being tested
- **Assert:** Verify expected outcomes, including edge cases and security checks

---

## Database and State Management

### Lifecycle Hooks

```typescript
describe('Users Integration Tests', () => {
  let app: Application;

  // ===== SETUP: Run once before all tests =====
  beforeAll(async () => {
    app = await appPromise;
  });

  // ===== CLEANUP: Clear state before each test =====
  beforeEach(async () => {
    await clearAllUsers();
    await clearAllSessions();
    await clearAllDevices();
    await clearAllPermissions();
  });

  // ===== TEARDOWN: Close connections after all tests =====
  afterAll(async () => {
    await sequelize.close();
  });
});
```

### Cleanup Best Practices

1. **Always clean up in reverse order of foreign key dependencies:**

```typescript
afterEach(async () => {
  await clearAllPermissions();        // No FK dependencies
  await UserSession.destroy({ where: {}, force: true });
  await Device.destroy({ where: {}, force: true });
  await OrganizationMember.destroy({ where: {}, force: true });
  await Environment.destroy({ where: {}, force: true });
  await Organization.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true }); // Has FKs to others
});
```

2. **Use `force: true` to bypass soft-delete and ensure full cleanup**
3. **Clear mock state in addition to database state** (e.g., `clearAllSentEmails()`)

### Test Isolation

**CRITICAL:** Prevent test pollution by ensuring complete isolation:

```typescript
// ✅ GOOD: Unique identifiers per test
const uniqueId = createTestIdentifier();
const testEmail = `user-${uniqueId}@example.com`;
const testSlug = `org-${uniqueId}`;

// ❌ BAD: Hardcoded identifiers cause conflicts
const testEmail = 'test@example.com';
const testSlug = 'test-org';
```

---

## Mocking Guidelines

### When to Mock

**Mock External Dependencies:**
- ✅ Email services (use MockEmailAdapter)
- ✅ External APIs
- ✅ Message queues
- ✅ File storage
- ✅ Third-party libraries with ESM issues

**Don't Mock Core Logic:**
- ❌ Database interactions (use test database)
- ❌ Business logic (test real implementation)
- ❌ Models and services (integration tests)

### UUID Mocking (ESM Compatibility)

**Only when necessary** (e.g., `uuid` package ESM issues in Jest):

```typescript
// ✅ GOOD: Mock at file level ONLY when needed
jest.mock('uuid', () => ({
  v4: (): string => 'test-uuid-' + Math.random().toString(36).substring(7),
}));

// Import test constants AFTER mock
import { TEST_UUIDS } from '../helpers/test-constants';
```

**⚠️ WARNING:** UUID mocks can cause test pollution. Removed from most test files in 2025-10-04 refactor.

### Mock Email Adapter Pattern

```typescript
import { getLatestMagicTokenForUser, clearAllSentEmails } from '../helpers/auth.helpers';

// Use MockEmailAdapter to extract tokens from "sent" emails
const magicToken = await getLatestMagicTokenForUser(user.email);

// Always clear sent emails in cleanup
afterEach(async () => {
  clearAllSentEmails();
});
```

---

## Common Pitfalls and Solutions

### 1. Test Pollution from UUID Mocks

**Problem:** `jest.mock('uuid')` creates duplicate/invalid UUIDs across test suites.

**Solution:**
- ✅ Remove UUID mocks unless absolutely necessary (ESM compatibility)
- ✅ Use `crypto.randomUUID()` or Sequelize-generated UUIDs
- ✅ Use test constants for predictable test scenarios

### 2. Parallel Test Execution Conflicts

**Problem:** Tests running in parallel cause database race conditions.

**Solution:**
```typescript
// jest.config.ts
export default {
  maxWorkers: 1, // Sequential execution
};
```

### 3. Foreign Key Constraint Violations

**Problem:** Deleting parent records before child records causes errors.

**Solution:**
```typescript
// ✅ GOOD: Delete in reverse order of dependencies
await UserSession.destroy({ where: {}, force: true });
await Device.destroy({ where: {}, force: true });
await User.destroy({ where: {}, force: true });

// ❌ BAD: Deleting parent before children
await User.destroy({ where: {}, force: true });
await Device.destroy({ where: {}, force: true }); // FAILS: FK constraint
```

### 4. Incorrect Error Field Checks

**Problem:** Checking wrong field for error messages.

**Solution:**
```typescript
// ✅ GOOD: Check specific error message
expect(res.body).toHaveProperty('message');
expect(res.body.message).toContain('Cannot delete the default environment');

// ❌ BAD: Checking generic error field
expect(res.body).toHaveProperty('error'); // Returns "Bad Request", not specific error
```

### 5. Mocking Wrong Methods

**Problem:** Mocking methods that aren't actually called.

**Solution:**
```typescript
// ✅ GOOD: Mock the actual method called
jest.spyOn(Organization.prototype, 'save').mockRejectedValueOnce(new Error('DB error'));

// ❌ BAD: Mocking non-existent or unused method
jest.spyOn(Organization, 'update').mockRejectedValueOnce(new Error('DB error'));
```

### 6. Hardcoded UUIDs

**Problem:** Hardcoded UUIDs are hard to read and maintain.

**Solution:**
```typescript
// ✅ GOOD: Use semantic constants
const res = await request(app).get(`/api/v1/orgs/${TEST_UUIDS.NONEXISTENT}`);

// ❌ BAD: Hardcoded UUID
const res = await request(app).get('/api/v1/orgs/99999999-9999-9999-9999-999999999999');
```

---

## Lessons Learned

### 2025-10-04: UUID Standardization

**Problem:** Hardcoded UUIDs scattered across test files made tests hard to read and maintain.

**Solution:** Created centralized `test-constants.ts` with semantic, pattern-based UUIDs.

**Benefits:**
- Improved readability: `TEST_UUIDS.USER_ADMIN` vs `00000000-0000-0000-0000-000000000001`
- Single source of truth for test data
- Pattern-based UUIDs instantly recognizable in logs
- TypeScript autocomplete prevents typos
- Easy to extend with new constants

**Impact:** All 360 tests refactored, 100% pass rate maintained.

### 2025-10-04: Test Isolation and Sequential Execution

**Problem:** Parallel test execution + UUID mocks caused database corruption and test failures.

**Solution:**
- Removed UUID mocks from all test files except where absolutely necessary (ESM issues)
- Configured Jest to run tests sequentially (`maxWorkers: 1`)
- Used unique identifiers per test (`createTestIdentifier()`)

**Impact:** 38 failing tests → 0 failing tests (100% pass rate achieved).

### 2025-10-04: Security Checks in Tests

**Lesson:** Always verify security-sensitive fields are NOT exposed in API responses.

```typescript
// ✅ GOOD: Negative assertion for security
expect(res.body).not.toHaveProperty('fingerprintHash'); // Never expose bcrypt hashes
expect(res.body).not.toHaveProperty('password_hash');

// ✅ GOOD: Verify system-managed fields not user-modifiable
expect(res.body).toHaveProperty('trustStatus'); // System sets, user can't change
```

### 2025-10-03: Field Naming Consistency

**Lesson:** Maintain camelCase consistently across all API layers. Only database uses snake_case.

```typescript
// ✅ GOOD: Consistent camelCase across all layers
expect(res.body).toHaveProperty('trustStatus');
const filter = { trustStatus: 'trusted' };

// ❌ BAD: Field name transformations
expect(res.body).toHaveProperty('isTrusted'); // Transforms trustStatus → isTrusted
```

### 2025-10-03: Cookie Testing

**Lesson:** Cookie assertions should account for environment differences.

```typescript
// ✅ GOOD: Account for environment-specific flags
if (process.env.NODE_ENV === 'production') {
  expect(cookieHeader).toContain('Secure');
}

// ✅ GOOD: Accept multiple valid formats
expect(cookieHeader).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
```

### 2025-10-03: Rate Limiting in Tests

**Lesson:** Disable rate limiting in test environment to prevent test flakiness.

```typescript
// config/index.ts
export default {
  rateLimiting: {
    enabled: process.env.NODE_ENV !== 'test', // Disabled in tests
  },
};
```

---

## Future Improvements

**Planned:**
- [ ] Add factory functions for common test entities (User, Organization, etc.)
- [ ] Create snapshot testing for API responses
- [ ] Add performance benchmarking for critical endpoints
- [ ] Implement test coverage reporting and enforcement
- [ ] Add visual regression testing for frontend components (future)

**Under Consideration:**
- [ ] Parallel test execution with better isolation (requires database sharding)
- [ ] Contract testing between frontend and backend
- [ ] E2E testing with Playwright (critical paths only)

---

**Remember:** These standards are living guidelines. Update this document when new patterns emerge or lessons are learned.
