# Route Standards

Routes define API endpoints and wire middleware to controllers.

## File Naming
- Pattern: `{resource}.routes.ts`
- Examples: `auth.routes.ts`, `user.routes.ts`, `health.routes.ts`

## Structure

```typescript
import { Router } from 'express';
import * as controller from '../controllers/resource.controller';
import { authenticate } from '../middleware/authenticate.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { schemas } from '../middleware/validation-schemas';

const router = Router();

/**
 * Middleware order (applied in sequence):
 * 1. Rate limiting (endpoint-specific)
 * 2. Authentication (if protected)
 * 3. Parameter validation (req.params)
 * 4. Authorization (RBAC)
 * 5. Body validation (req.body for POST/PUT/PATCH)
 * 6. Controller
 */

// Public endpoint
router.get(
  '/resource',
  rateLimit.apiEndpoint,
  controller.list
);

// Protected endpoint
router.get(
  '/resource/:id',
  authenticate,
  validate.params(schemas.resourceId),
  authorize(['user', 'admin']),
  controller.getById
);

// Create endpoint (POST)
router.post(
  '/resource',
  rateLimit.apiEndpoint,
  authenticate,
  authorize(['admin']),
  validate.body(schemas.createResource),
  controller.create
);

export default router;
```

## Route Naming

### RESTful Patterns
```typescript
// Collection routes
GET    /api/v1/users          // List all
POST   /api/v1/users          // Create new

// Resource routes
GET    /api/v1/users/:id      // Get by ID
PUT    /api/v1/users/:id      // Full update
PATCH  /api/v1/users/:id      // Partial update
DELETE /api/v1/users/:id      // Delete

// Nested resources
GET    /api/v1/users/:id/devices
POST   /api/v1/users/:id/devices

// Actions (when not CRUD)
POST   /api/v1/auth/request-token
POST   /api/v1/auth/verify-token
DELETE /api/v1/sessions/all
```

### URL Parameters
- Use kebab-case for multi-word endpoints: `/request-token`, `/verify-token`
- Use UUID for IDs (obfuscated): `/users/a7b3c4d5-e6f7-8901-2345-6789abcdef01`
- Avoid exposing sequential IDs: ~~`/users/12345`~~ ❌

## Middleware Order of Operations

The order is critical for performance (<200ms SLO) and security:

### 1. Rate Limiting (Fast Fail)
```typescript
router.post('/auth/request-token',
  rateLimit.authEndpoint,  // Strict limits for auth
  ...
);
```

### 2. Authentication (Verify JWT)
```typescript
router.get('/users',
  authenticate,  // Verifies JWT, attaches req.user
  ...
);
```

### 3. Parameter Validation (Fast Fail)
```typescript
router.get('/users/:id',
  authenticate,
  validate.params(schemas.userId),  // Validate ID format early
  ...
);
```

### 4. Authorization (RBAC)
```typescript
router.delete('/users/:id',
  authenticate,
  validate.params(schemas.userId),
  authorize(['admin']),  // Check permissions
  ...
);
```

### 5. Body Validation (POST/PUT/PATCH)
```typescript
router.post('/users',
  authenticate,
  authorize(['admin']),
  validate.body(schemas.createUser),  // Validate request body last
  controller.create
);
```

### 6. Controller Execution
```typescript
controller.create  // Finally execute business logic
```

## Grouping Routes

### Main Router (src/routes/index.ts)
```typescript
import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import deviceRoutes from './device.routes';
import sessionRoutes from './session.routes';
import healthRoutes from './health.routes';

const router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/sessions', sessionRoutes);

export default router;
```

### Version Prefix (in app.ts)
```typescript
app.use('/api/v1', routes);
```

## Route Documentation

Each route should include JSDoc comments:
```typescript
/**
 * @route   POST /api/v1/auth/request-token
 * @desc    Request magic token for passwordless authentication
 * @access  Public
 * @rateLimit 3 requests per 15 minutes per email
 */
router.post('/request-token', ...);
```

## Error Handling

Routes don't handle errors directly - they're caught by:
1. `asyncHandler` in controllers
2. Global error middleware

## Testing

Each route file should have integration tests:
```typescript
// tests/integration/routes/user.routes.test.ts
import request from 'supertest';
import app from '../../../src/app';

describe('User Routes', () => {
  describe('GET /api/v1/users/:id', () => {
    it('should return 200 with user data', async () => {
      const res = await request(app)
        .get('/api/v1/users/test-id')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/v1/users/test-id');
      expect(res.status).toBe(401);
    });
  });
});
```

## Performance Considerations

- **Parameter Validation First**: Validate params before body (faster fail)
- **Conditional Middleware**: Only apply middleware when needed
- **Avoid Deep Nesting**: Keep route definitions flat and readable

## Validation Schema Standards

When creating validation schemas, maintain consistency with API contracts:

```typescript
// ✅ GOOD: Field names match API contract
export const listDevicesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  trustStatus: Joi.string().valid('trusted', 'pending', 'revoked').optional(), // Enum as-is
});

// ❌ BAD: Field name transformation
export const listDevicesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  isTrusted: Joi.boolean().optional(), // Changed from enum to boolean
});
```

**Security-Sensitive Fields:**

Never allow user modification of system-managed fields:

```typescript
// ✅ GOOD: Update schema excludes security fields
export const updateDeviceSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  // trustStatus is system-managed - NOT included
});

// ❌ BAD: Allows user to modify security controls
export const updateDeviceSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  is_trusted: Joi.boolean().optional(), // Security field - should be system-only
});
```

**Fields that should NEVER be user-modifiable:**
- `trustStatus`, `roles`, `permissions` (security controls)
- `emailVerified`, `phoneVerified` (verification state)
- `isActive`, `isSuspended` (account state)
- `passwordHash`, `fingerprintHash`, `saltRounds` (cryptographic data)
- `createdAt`, `updatedAt`, `deletedAt` (timestamps)

## File Size
- Target: <200 lines per route file
- >500 lines: Must refactor by logical grouping
- Factor by resource or feature boundary
