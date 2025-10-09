# Controller Standards

Controllers handle HTTP request/response logic and delegate business logic to services.

## File Naming
- Pattern: `{resource}.controller.ts`
- Examples: `auth.controller.ts`, `user.controller.ts`, `health.controller.ts`

## Function Naming
- Use camelCase
- Use descriptive verb-based names
- Examples: `register`, `requestMagicToken`, `verifyToken`, `getUser`, `updateUser`

## Structure

```typescript
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { HTTP_STATUS } from '../constants/http-status.constants';
import { someService } from '../services/some.service';
import logger from '../config/logger';

/**
 * @desc    Description of what this does
 * @route   GET /api/v1/resource
 * @access  Public|Private
 */
export const controllerFunction = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // 1. Extract and validate parameters (basic checks only)
    const { id } = req.params;

    // 2. Call service layer for business logic
    const result = await someService.doSomething(id);

    // 3. Return response
    res.status(HTTP_STATUS.OK).json(result);
  }
);
```

## Responsibilities

### Controllers SHOULD:
- Handle HTTP concerns (req/res)
- Extract parameters from req.params, req.query, req.body
- Call service layer methods
- Return HTTP responses with proper status codes
- Use asyncHandler for error handling
- Log at debug level for request/response details
- **Transform responses to camelCase if needed (service returns model objects)**

### Controllers SHOULD NOT:
- Contain business logic (delegate to services)
- Directly access database (use services)
- Perform complex validations (use middleware)
- Handle authentication/authorization (use middleware)
- **❌ NEVER expose database implementation details (hashes, fingerprints, internal IDs)**
- **❌ NEVER transform field names (e.g., trustStatus → isTrusted) - maintain consistency**
- **❌ NEVER return security-sensitive fields that are system-managed only**

## Middleware Order (Applied Before Controller)
1. **Rate Limiting** (endpoint-specific)
2. **Authentication** (verify JWT, attach user to req)
3. **Parameter Validation** (validate req.params - fast fail)
4. **Authorization** (check RBAC permissions)
5. **Request Body Validation** (validate req.body for POST/PUT/PATCH)
6. **Controller Execution**

## Error Handling

Controllers should throw custom errors that will be caught by error middleware:

```typescript
import { NotFoundError, ValidationError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json(user);
});
```

## Response Format

### Success Responses
```typescript
// Single resource (with field filtering for security)
const user = await userService.getUser(id);
res.status(HTTP_STATUS.OK).json({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  // ❌ NEVER include: passwordHash, fingerprintHash, or other internal fields
});

// Device response example (security-sensitive fields excluded)
const device = await deviceService.getDevice(deviceId);
res.status(HTTP_STATUS.OK).json({
  id: device.id,
  name: device.deviceName,
  deviceType: device.deviceType,
  browser: device.browser,
  os: device.os,
  trustStatus: device.trustStatus, // ✅ Keep as-is, don't transform to isTrusted
  isRevoked: device.revokedAt !== null, // ✅ OK to derive booleans from dates
  lastUsedAt: device.lastUsedAt,
  createdAt: device.createdAt,
  // ❌ NEVER include: fingerprintHash (bcrypt hash - server-side only)
});

// Collection
res.status(HTTP_STATUS.OK).json({
  data: users,
  pagination: {
    limit: 20,
    offset: 0,
    total: 100,
    hasMore: true
  }
});

// Created
res.status(HTTP_STATUS.CREATED).json({ user });

// No content
res.status(HTTP_STATUS.NO_CONTENT).send();
```

### Field Name Consistency Rules

**✅ ALLOWED:**
- Keep field names consistent: `trustStatus` stays `trustStatus` across all layers
- Derive boolean flags from dates: `isRevoked: device.revokedAt !== null`
- Transform model field names to camelCase: `device.deviceName` → `name` (for brevity)

**❌ FORBIDDEN:**
- Transform field types: `trustStatus` (enum) → `isTrusted` (boolean)
- Expose database implementation: `fingerprintHash`, `passwordHash`, `saltRounds`
- Return internal identifiers: `internalId`, `legacyId`, `externalSystemId`
- Expose security controls: Raw permission bits, encryption keys, secrets

### Error Responses
Handled by error middleware - just throw errors:
```typescript
throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
throw new UnauthorizedError(ERROR_MESSAGES.INVALID_TOKEN);
throw new ValidationError([{ field: 'email', message: 'Invalid format' }]);
```

## Performance Considerations (<200ms SLO)

- **Fast Fail**: Validate parameters early before expensive operations
- **Avoid N+1**: Services should handle eager loading
- **Pagination**: Always paginate collections (default limit: 20, max: 100)
- **Field Selection**: Allow clients to request specific fields via query params
- **Caching**: Leverage service-layer caching for frequently accessed data

## Testing

Each controller function should have:
- Unit test with mocked services
- Integration test with real HTTP requests
- Test success cases
- Test error cases (404, 401, 403, 422, 500)
- Test edge cases (empty results, boundary values)

```typescript
// tests/unit/controllers/user.controller.test.ts
describe('UserController', () => {
  describe('getUser', () => {
    it('should return user when found', async () => {
      // Mock service
      // Call controller
      // Assert response
    });

    it('should throw NotFoundError when user not found', async () => {
      // Test error case
    });
  });
});
```

## File Size
- Target: <300 lines per controller file
- >500 lines: Consider refactoring
- >1000 lines: Must refactor by logical grouping (e.g., split auth.controller.ts into auth-login.controller.ts, auth-token.controller.ts)
