# Test Structure

This directory contains application-level integration and unit tests following 2024/2025 best practices with **collocated testing**.

## Directory Structure

```
src/
├── __tests__/                          # Application-level tests
│   ├── integration/                    # End-to-end API endpoint tests
│   │   ├── auth.test.ts               # Authentication flow tests
│   │   ├── users.test.ts              # User endpoints
│   │   ├── organizations.test.ts      # Organization endpoints
│   │   ├── environments.test.ts       # Environment endpoints
│   │   ├── members.test.ts            # Member management
│   │   ├── groups.test.ts             # Group management
│   │   ├── events.test.ts             # Event/audit endpoints
│   │   ├── webhooks.test.ts           # Webhook endpoints
│   │   ├── admin/                     # Admin endpoint tests
│   │   │   ├── users.test.ts
│   │   │   ├── organizations.test.ts
│   │   │   ├── impersonation.test.ts
│   │   │   └── ...
│   │   └── journeys/                  # Critical path tests
│   │       ├── user-journey.test.ts   # Standard user flow
│   │       ├── admin-journey.test.ts  # Admin user flow
│   │       └── tenant-isolation.test.ts
│   └── unit/                          # Unit tests for shared concerns
│       └── middleware/                # Middleware tests
│           ├── authenticate.middleware.test.ts
│           ├── authorize.middleware.test.ts
│           ├── validate-context.middleware.test.ts
│           └── rate-limit.middleware.test.ts
├── controllers/
│   ├── __tests__/                     # Controller unit tests
│   │   └── auth.controller.test.ts
│   └── auth.controller.ts
├── services/
│   ├── email/__tests__/               # Email adapter tests ✅
│   ├── queue/__tests__/               # Queue adapter tests ✅
│   ├── secrets/__tests__/             # Secrets adapter tests ✅
│   └── storage/__tests__/             # Storage adapter tests ✅
└── utils/
    └── __tests__/                     # Utility function tests ✅
        ├── pagination-response.test.ts
        └── query-params.test.ts
```

## Test Types

### 1. Integration Tests (`__tests__/integration/`)
- Test complete HTTP request/response cycles
- Use `supertest` for HTTP testing
- Test authentication, authorization, validation, business logic
- Mock database calls (initially)
- Test against OpenAPI specification compliance

**Example:**
```typescript
import request from 'supertest';
import app from '../../app';

describe('POST /api/v1/auth/register', () => {
  it('should register new user and return 201', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', fullName: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
  });
});
```

### 2. Unit Tests (`__tests__/unit/`)
- Test shared middleware, utilities
- Use Jest mocking for dependencies
- Focus on isolated functionality

**Example:**
```typescript
import { authenticate } from '../../../middleware/authenticate.middleware';

describe('authenticate middleware', () => {
  it('should attach user to req when JWT valid', async () => {
    // Mock req, res, next
    // Test middleware behavior
  });
});
```

### 3. Component Tests (Collocated)
- Tests next to the component they test
- Examples: `src/services/email/__tests__/`, `src/utils/__tests__/`
- Self-contained, reusable components

**Example:**
```typescript
// src/services/email/__tests__/email.adapter.test.ts
describe('EmailAdapter', () => {
  // Test email sending functionality
});
```

### 4. Journey Tests (`__tests__/integration/journeys/`)
- Test complete user workflows end-to-end
- Verify critical paths work together
- Examples: Register → Login → Use API → Logout

## Testing Strategy (TDD)

Following **Test-Driven Development**:

1. **Write tests first** (they fail - RED)
2. **Implement code** to make tests pass (GREEN)
3. **Refactor** while keeping tests green
4. **Commit** when batch complete

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="authentication"
```

## Coverage Goals

- **Branches:** 80%
- **Functions:** 80%
- **Lines:** 80%
- **Statements:** 80%

Configured in `jest.config.ts`

## Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **Descriptive names**: `it('should return 401 when JWT expired', ...)`
3. **One assertion per test** (when possible)
4. **Mock external dependencies** (database, APIs, queues)
5. **Clean up after tests** (Jest does this automatically with `clearMocks: true`)
6. **Test error cases** (not just happy paths)
7. **Test edge cases** (empty arrays, null values, boundary conditions)

## Naming Conventions

- **Files**: `*.test.ts` or `*.spec.ts`
- **Directories**: `__tests__/`
- **Describe blocks**: Match function/component names
- **Test names**: Start with "should" for clarity

## Mocking

```typescript
// Mock service
jest.mock('../../services/auth.service', () => ({
  register: jest.fn(),
  verifyToken: jest.fn(),
}));

// Mock adapter
jest.mock('../../services/adapter.factory', () => ({
  getEmailAdapter: jest.fn(() => mockEmailAdapter),
}));
```

## Database Strategy

**Phase 1 (Current):** Mock database calls
**Phase 2 (Future):** Use test database with transactions that rollback

## Progress Tracking

See `api/docs/TEST_IMPLEMENTATION_PROGRESS.md` for detailed progress on test implementation.

## Why Collocated Tests?

**Benefits:**
- ✅ Tests travel with code (refactoring, extraction)
- ✅ Clear relationship between test and code
- ✅ Easier code review (see changes + tests together)
- ✅ Modern standard (Next.js, Remix, Vite)
- ✅ Modular (can extract to packages with tests)

**Configuration:**
- `jest.config.ts`: `roots: ['<rootDir>/src']`
- `tsconfig.json`: `exclude: ["**/__tests__", "**/*.test.ts"]`
- Tests excluded from production builds automatically
