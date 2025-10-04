# Service Standards

Services contain business logic and orchestrate data operations. They are the bridge between controllers and models/external services.

## File Naming
- Pattern: `{resource}.service.ts`
- Examples: `auth.service.ts`, `user.service.ts`, `device.service.ts`

## Function Naming
- Use camelCase
- Use descriptive, verb-noun patterns
- Examples: `createUser`, `findUserByEmail`, `generateMagicToken`, `validateToken`

## Structure

```typescript
import { User } from '../models/User.model';
import { NotFoundError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import logger from '../config/logger';

class UserService {
  /**
   * Find user by ID
   * @param id - User UUID
   * @returns User object or null
   */
  async findById(id: string): Promise<User | null> {
    logger.debug(`Finding user by ID: ${id}`);

    const user = await User.findByPk(id);

    if (!user) {
      logger.warn(`User not found: ${id}`);
      return null;
    }

    return user;
  }

  /**
   * Create new user
   * @param userData - User creation data
   * @returns Created user
   */
  async createUser(userData: CreateUserDto): Promise<User> {
    logger.info(`Creating user: ${userData.email}`);

    const user = await User.create(userData);

    logger.info(`User created: ${user.id}`);
    return user;
  }
}

export const userService = new UserService();
export default userService;
```

## Responsibilities

### Services SHOULD:
- Contain business logic
- Orchestrate database operations
- Call external APIs (via adapter pattern)
- Perform complex validations
- Handle transactions
- Manage caching
- Throw custom errors with meaningful messages
- **Use camelCase for DTOs and parameters (consistent with API layer)**
- **Return model objects as-is (let controller handle response transformation)**

### Services SHOULD NOT:
- Handle HTTP concerns (req/res)
- Directly return HTTP status codes
- Contain authentication/authorization logic (middleware responsibility)
- **❌ NEVER transform field names (e.g., trustStatus → isTrusted) - keep consistent**
- **❌ NEVER expose security-sensitive fields in service responses (filter at controller)**
- **❌ NEVER allow user modification of system-managed fields (trustStatus, roles, permissions)**

## Error Handling

Services throw custom errors that propagate to controllers:

```typescript
async findById(id: string): Promise<User> {
  const user = await User.findByPk(id);

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  return user;
}
```

## Transactions

Use database transactions for multi-step operations:

```typescript
import { sequelize } from '../config/database';

async createUserWithDevice(userData: CreateUserDto, deviceData: DeviceDto): Promise<User> {
  const transaction = await sequelize.transaction();

  try {
    const user = await User.create(userData, { transaction });
    const device = await Device.create(
      { ...deviceData, userId: user.id },
      { transaction }
    );

    await transaction.commit();

    return user;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

## Adapter Pattern for External Services

Wrap external services to enable testing and portability:

```typescript
// services/adapters/email.adapter.ts
export interface EmailAdapter {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

// Implementation (can swap for testing or different providers)
class SendGridAdapter implements EmailAdapter {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // SendGrid-specific implementation
  }
}

// services/notification.service.ts
class NotificationService {
  constructor(private emailAdapter: EmailAdapter) {}

  async sendMagicToken(email: string, token: string): Promise<void> {
    await this.emailAdapter.sendEmail(
      email,
      'Your Magic Token',
      `Your token: ${token}`
    );
  }
}
```

## Caching Strategy

Use Redis for frequently accessed data:

```typescript
import { redis } from '../config/redis';

async findById(id: string): Promise<User | null> {
  // Check cache first
  const cacheKey = `user:${id}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    logger.debug(`Cache hit: ${cacheKey}`);
    return JSON.parse(cached);
  }

  // Cache miss - fetch from DB
  const user = await User.findByPk(id);

  if (user) {
    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(user));
  }

  return user;
}
```

## Performance Optimization (<200ms SLO)

### Database Queries
```typescript
// ❌ Bad: N+1 query problem
const users = await User.findAll();
for (const user of users) {
  user.devices = await Device.findAll({ where: { userId: user.id } });
}

// ✅ Good: Eager loading
const users = await User.findAll({
  include: [{ model: Device, as: 'devices' }]
});
```

### Denormalization
```typescript
// For read-heavy operations, denormalize data
// Example: Store device count directly on user record
interface User {
  deviceCount: number;  // Denormalized
}

// Update count when devices change
async addDevice(userId: string, deviceData: DeviceDto): Promise<Device> {
  const device = await Device.create(deviceData);

  // Update denormalized count
  await User.increment('deviceCount', { where: { id: userId } });

  return device;
}
```

### Pagination
```typescript
async findAll(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
  // Enforce max limit
  const safeLimit = Math.min(limit, 100);

  const { rows: users, count: total } = await User.findAndCountAll({
    limit: safeLimit,
    offset: (page - 1) * safeLimit,
  });

  return { users, total };
}
```

## Logging

Log at appropriate levels:
```typescript
logger.debug('Detailed info for debugging');
logger.info('Important business events');
logger.warn('Recoverable issues');
logger.error('Errors requiring attention', { error });
```

## Testing

Each service should have comprehensive unit tests:
```typescript
// tests/unit/services/user.service.test.ts
import { userService } from '../../../src/services/user.service';
import { User } from '../../../src/models/User.model';

jest.mock('../../../src/models/User.model');

describe('UserService', () => {
  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.findById('123');

      expect(result).toEqual(mockUser);
      expect(User.findByPk).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundError when user not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(userService.findById('123')).rejects.toThrow(NotFoundError);
    });
  });
});
```

## File Size
- Target: <400 lines per service file
- >500 lines: Consider refactoring
- >1000 lines: Must refactor by logical grouping (e.g., split user.service.ts into user-auth.service.ts, user-profile.service.ts)

## Security Considerations

- **Sanitize Inputs**: Always validate and sanitize data before database operations
- **No Sensitive Data in Logs**: Redact passwords, tokens, PII
- **Rate Limiting**: Services can enforce business-level rate limits
- **Audit Logging**: Log important operations (create, update, delete)

### System-Managed Fields (Never User-Modifiable)

When designing DTOs, **exclude** these types of fields from update operations:

```typescript
// ❌ BAD: Allows user to modify security-sensitive fields
interface UpdateDeviceDto {
  name?: string;
  is_trusted?: boolean;  // WRONG - security field should be system-managed
}

// ✅ GOOD: Only allows modification of user-controllable fields
interface UpdateDeviceDto {
  name?: string;
  // trustStatus is managed by system logic, not user input
}

// Example system-managed fields:
// - trustStatus, roles, permissions (security controls)
// - emailVerified, phoneVerified (verification state)
// - isActive, isSuspended (account state)
// - createdAt, updatedAt (timestamps)
// - passwordHash, fingerprintHash (cryptographic data)
```

### Field Naming Consistency

**Rule:** Keep field names and types consistent across all API layers

```typescript
// ✅ GOOD: Consistent field naming
interface DeviceFilters {
  trustStatus?: 'trusted' | 'pending' | 'revoked';  // Enum stays enum
}

const where: WhereOptions = {};
if (filters.trustStatus) {
  where.trustStatus = filters.trustStatus;  // Direct assignment
}

// ❌ BAD: Field name transformation
interface DeviceFilters {
  isTrusted?: boolean;  // Changed from enum to boolean
}

const where: WhereOptions = {};
if (filters.isTrusted !== undefined) {
  where.trustStatus = filters.isTrusted ? 'trusted' : 'pending';  // Transformation logic
}
```

**Why this matters:**
- Consistency reduces cognitive load and bugs
- API contract stays aligned with domain model
- Easier to trace data flow through layers
- Type safety is preserved
