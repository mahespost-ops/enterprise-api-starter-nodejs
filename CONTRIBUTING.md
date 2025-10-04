# Contributing to Enterprise API Starter

Welcome! This guide will help you get started with development on this project.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Project Structure](#project-structure)
4. [NPM Scripts](#npm-scripts)
5. [Testing](#testing)
6. [Code Quality](#code-quality)
7. [Database Management](#database-management)
8. [Standards & Best Practices](#standards--best-practices)

---

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- npm 9+
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd enterprise-api-starter-nodejs/api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure .env with your local settings
# Edit DATABASE_URL, JWT_SECRET, etc.

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000/api/v1`

### Verify Setup

```bash
# Run all tests
npm test

# Check types
npm run typecheck

# Check linting
npm run lint
```

All should pass ✅

---

## Development Workflow

This project follows **Test-Driven Development (TDD)**:

1. **Write failing test** (Red phase)
2. **Implement minimum code to pass** (Green phase)
3. **Refactor for quality** (Refactor phase)
4. **Commit changes**

### Step-by-Step Example

```bash
# 1. Create feature branch
git checkout -b feature/add-device-notifications

# 2. Write failing integration test
# Edit: src/__tests__/integration/devices.test.ts
npm test -- devices.test.ts  # ❌ Should fail

# 3. Implement feature (service, controller, route)
# Follow standards in respective STANDARDS.md files

# 4. Run tests
npm test -- devices.test.ts  # ✅ Should pass

# 5. Run all tests
npm test  # ✅ All should pass

# 6. Check code quality
npm run typecheck  # ✅ No errors
npm run lint       # ✅ No errors

# 7. Commit changes
git add .
git commit -m "feat: add device notification system"

# 8. Push and create PR
git push origin feature/add-device-notifications
```

---

## Project Structure

```
/api
├── src/
│   ├── __tests__/              # Test files (collocated)
│   │   ├── helpers/            # Test utilities
│   │   ├── integration/        # API endpoint tests
│   │   └── unit/               # Unit tests (middleware, utils)
│   ├── config/                 # Configuration (DB, logger, etc.)
│   ├── constants/              # Centralized constants
│   ├── controllers/            # HTTP request handlers
│   ├── middleware/             # Express middleware
│   ├── models/                 # Sequelize ORM models
│   ├── routes/                 # Route definitions
│   ├── services/               # Business logic
│   │   ├── auth/               # Authentication services
│   │   ├── email/              # Email adapters (SendGrid, SMTP, Mock)
│   │   ├── queue/              # Queue adapters (Pub/Sub, SQS, etc.)
│   │   ├── secrets/            # Secrets management adapters
│   │   └── storage/            # Storage adapters (GCS, S3, Local)
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Entry point
├── migrations/                 # Database migrations
├── api-docs/                   # OpenAPI specifications
│   ├── paths/                  # Endpoint definitions
│   └── components/             # Reusable schemas
├── docs/                       # Documentation
│   ├── ADAPTER_PATTERN.md      # Adapter pattern guide
│   ├── ADAPTER_USAGE.md        # How to use adapters
│   ├── AUTHENTICATION_DESIGN.md # Auth system design
│   ├── ENTITY_MODEL.md         # Database schema & entities
│   ├── JWT_TOKEN_STRUCTURE.md  # JWT token details
│   ├── QUERY_PARAMETER_STANDARDS.md # API query conventions
│   └── progress-tracking/      # Implementation progress
├── jest.config.ts              # Jest configuration
├── tsconfig.json               # TypeScript configuration
├── eslint.config.mjs           # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── .env.example                # Environment template
└── package.json                # Dependencies & scripts
```

### Key Directories

- **`src/__tests__/`** - All tests collocated with source code
- **`src/controllers/`** - HTTP layer (req/res handling)
- **`src/services/`** - Business logic (orchestration)
- **`src/models/`** - Database entities (Sequelize)
- **`src/routes/`** - Route definitions (middleware → controller)
- **`api-docs/`** - OpenAPI spec (single source of truth for API)

---

## NPM Scripts

### Development & Build

```bash
npm run dev          # Start development server (nodemon + ts-node)
npm run build        # Compile TypeScript to JavaScript (dist/)
npm start            # Run production server from compiled code
```

### Testing

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

**Test-specific runs:**

```bash
npm test -- auth.test.ts                    # Run specific test file
npm test -- --testNamePattern="should login" # Run tests matching pattern
```

### Code Quality

```bash
npm run lint          # Run ESLint on TypeScript files
npm run lint:fix      # Run ESLint and auto-fix issues
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting without fixing
npm run typecheck     # Run TypeScript type checking (no emit)
```

### Database

```bash
npm run db:migrate        # Apply pending migrations
npm run db:migrate:undo   # Rollback last migration
npm run db:migrate:reset  # Reset database (DEV ONLY - drops all data)
```

**⚠️ WARNING:** Never run `db:migrate:reset` in production!

### Pre-Commit Checklist

Before committing, always run:

```bash
npm run typecheck && npm run lint && npm test
```

All must pass ✅

---

## Testing

### Test Organization

Tests are collocated in `src/__tests__/` following modern best practices:

```
src/__tests__/
├── helpers/
│   ├── auth.helpers.ts         # Auth test utilities
│   └── test-constants.ts       # Centralized test data
├── integration/
│   ├── auth.test.ts            # Authentication endpoints
│   ├── users.test.ts           # User endpoints
│   ├── organizations.test.ts   # Organization endpoints
│   └── environments.test.ts    # Environment endpoints
└── unit/
    └── middleware/             # Middleware unit tests
```

### Test Standards

**See:** `src/__tests__/STANDARDS.md` for comprehensive testing guidelines.

**Key Principles:**
- Follow **AAA pattern** (Arrange, Act, Assert)
- Use **test constants** from `test-constants.ts` (not hardcoded UUIDs)
- Use **test helpers** from `auth.helpers.ts` for authentication
- Clean up database state in `beforeEach`/`afterEach` hooks
- Write descriptive test names: `should return 200 when authenticated`

**Example Test:**

```typescript
it('should return user profile when authenticated (200)', async () => {
  // ===== ARRANGE =====
  const user = await User.create({
    email: 'test@example.com',
    givenName: 'Test',
    familyName: 'User',
  });

  const token = generateTestJWT({
    sub: user.id,
    orgId: TEST_UUIDS.ORG_TEST,
    envId: TEST_UUIDS.ENV_LIVE,
    user: { fullName: user.fullName, email: user.email },
  });

  // ===== ACT =====
  const res = await request(app)
    .get('/api/v1/users/me')
    .set('Authorization', `Bearer ${token}`);

  // ===== ASSERT =====
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id', user.id);
  expect(res.body).toHaveProperty('email', user.email);
  expect(res.body).not.toHaveProperty('password_hash'); // Security check
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# With coverage
npm run test:coverage

# Specific file
npm test -- auth.test.ts

# Specific test
npm test -- --testNamePattern="should login"
```

---

## Code Quality

### TypeScript

- **Strict mode enabled** - No implicit any, strict null checks
- **Type everything** - Avoid `any`, use proper types
- **Use interfaces** - For object shapes, DTOs, API contracts
- **Check types before commit:** `npm run typecheck`

### ESLint

Configuration: `eslint.config.mjs`

Rules enforced:
- No unused variables
- No console.log in production code
- Consistent code style
- TypeScript best practices

**Fix issues:**

```bash
npm run lint:fix
```

### Prettier

Configuration: `.prettierrc`

Format all code:

```bash
npm run format
```

Check formatting:

```bash
npm run format:check
```

### File Size Limits

To maintain code quality and reduce hallucination risk:

- **Controllers:** Target <300 lines, max 500, must refactor >1000
- **Services:** Target <400 lines, max 500, must refactor >1000
- **Routes:** Target <200 lines, must refactor >500
- **Middleware:** Target <300 lines, must refactor >500

**When to refactor:**
- File approaching 500 lines → Plan refactoring
- File exceeds 1000 lines → MUST refactor immediately
- Factor by logical grouping or feature boundary

---

## Database Management

### Sequelize ORM

Models are defined in `src/models/*.model.ts` using Sequelize v6.

**Model conventions:**
- Use UUIDs for primary keys
- Include `createdAt`, `updatedAt`, `deletedAt` timestamps
- Define associations in model file
- Export both named and default: `export { Model }; export default Model;`

**Example Model:**

```typescript
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class User extends Model {
  declare id: string;
  declare email: string;
  declare givenName: string;
  declare familyName: string;
  // ... other fields
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    // ... other fields
  },
  {
    sequelize,
    tableName: 'user',
    timestamps: true,
    paranoid: true, // Soft deletes
  }
);

export default User;
```

### Migrations

Migrations are in `migrations/` directory.

**Create new migration:**

```bash
npx sequelize-cli migration:generate --name describe-changes
```

**Apply migrations:**

```bash
npm run db:migrate
```

**Rollback migration:**

```bash
npm run db:migrate:undo
```

**Migration best practices:**
- Always include `up` and `down` methods
- Use transactions for multi-step changes
- Test rollback before deploying
- Never modify existing migrations (create new ones)

### Database Naming Conventions

- **Tables:** Singular, snake_case (e.g., `user`, `organization_member`)
- **Columns:** snake_case (e.g., `created_at`, `is_active`)
- **Foreign Keys:** `{table}_id` (e.g., `user_id`, `organization_id`)

**API uses camelCase:**
- Database: `organization_id` → API: `organizationId`
- Transformation handled by Sequelize field mapping

---

## Standards & Best Practices

Each component type has a STANDARDS.md file with patterns and best practices:

### Component Standards

- **Controllers:** `src/controllers/STANDARDS.md`
  - Handle HTTP concerns only
  - Delegate business logic to services
  - Never expose database implementation details (hashes, internal IDs)

- **Services:** `src/services/STANDARDS.md`
  - Contain business logic
  - Orchestrate database operations
  - Use adapter pattern for external services

- **Routes:** `src/routes/STANDARDS.md`
  - Define endpoints and middleware order
  - Wire middleware to controllers
  - Follow RESTful conventions

- **Middleware:** `src/middleware/STANDARDS.md`
  - Handle cross-cutting concerns (auth, validation, etc.)
  - Follow Express error handling patterns
  - Use `next(error)` for error propagation

- **Tests:** `src/__tests__/STANDARDS.md`
  - Follow AAA pattern
  - Use test constants and helpers
  - Maintain test isolation

### Key Architectural Principles

1. **Separation of Concerns**
   - Controller → Service → Model (clear boundaries)
   - HTTP layer separate from business logic
   - Adapters for external services (email, storage, queue)

2. **Security First**
   - Never expose: hashes, internal IDs, encryption keys
   - System-managed fields not user-modifiable (trustStatus, roles, permissions)
   - Complete audit trail for all operations

3. **Field Naming Consistency**
   - **Database:** snake_case
   - **API:** camelCase
   - **NO field name transformations** (e.g., trustStatus stays trustStatus, not isTrusted)
   - Sequelize handles snake_case ↔ camelCase mapping

4. **Performance (<200ms SLO)**
   - Denormalize for read performance
   - Cursor pagination for 10M+ records
   - Eager loading to avoid N+1 queries
   - Indexed foreign keys and frequently queried fields

5. **12-Factor Methodology**
   - Environment-based config
   - Stateless services
   - Log to stdout (not files)
   - Graceful shutdown

### Adapter Pattern

For cloud-agnostic design, use adapters for external services:

- **Email:** SendGrid, AWS SES, SMTP, Mock
- **Secrets:** GCP Secret Manager, AWS Secrets Manager, Vault, Environment
- **Storage:** GCS, S3, Local filesystem
- **Queue:** Pub/Sub, SQS, Redis, Kafka, In-memory

**See:** `docs/ADAPTER_PATTERN.md` and `docs/ADAPTER_USAGE.md`

### Constants Over Magic Strings

Always use constants from `src/constants/`:

```typescript
// ✅ GOOD
import { HTTP_STATUS } from '../constants/http-status.constants';
res.status(HTTP_STATUS.OK).json(user);

// ❌ BAD
res.status(200).json(user);
```

---

## Git Workflow

### Branch Naming

```
feature/add-device-notifications
bugfix/fix-session-expiry
refactor/extract-auth-service
docs/update-api-docs
```

### Commit Messages

Follow conventional commits:

```
feat: add webhook delivery retry logic
fix: prevent duplicate device fingerprints
refactor: extract email service to adapter
docs: update JWT token documentation
test: add integration tests for impersonation
chore: update dependencies
```

### Pull Request Process

1. **Create feature branch** from `main`
2. **Implement changes** following TDD
3. **Run quality checks:**
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```
4. **Commit changes** with descriptive messages
5. **Push branch** and create PR
6. **Request review** from team
7. **Address feedback** and update PR
8. **Merge** when approved (squash or rebase)

---

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Server
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DB_LOGGING=false

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Email (for development, use mock)
EMAIL_ADAPTER=mock
EMAIL_FROM=noreply@example.com

# Secrets (for development, use env)
SECRETS_ADAPTER=env

# Queue (for development, use memory)
QUEUE_ADAPTER=memory

# Storage (for development, use local)
STORAGE_ADAPTER=local
STORAGE_LOCAL_PATH=./uploads
```

**Production:**
- Use strong `JWT_SECRET` (32+ random characters)
- Set `NODE_ENV=production`
- Use real adapters (SendGrid, GCP, AWS, etc.)
- Enable `RATE_LIMIT_ENABLED=true`

---

## Helpful Resources

### Documentation

- **Architecture:** `CLAUDE.md` - High-level overview
- **Entity Model:** `docs/ENTITY_MODEL.md` - Database schema
- **JWT Tokens:** `docs/JWT_TOKEN_STRUCTURE.md` - Token format details
- **Adapter Pattern:** `docs/ADAPTER_PATTERN.md` - Cloud-agnostic design
- **Query Standards:** `docs/QUERY_PARAMETER_STANDARDS.md` - API query conventions
- **Progress Tracking:** `docs/progress-tracking/` - Implementation status

### API Documentation

Swagger UI available at: `http://localhost:3000/api-docs`

OpenAPI spec: `api-docs/index.yaml`

### Need Help?

- Check `STANDARDS.md` files for component-specific guidance
- Review existing implementations for patterns
- Ask in team chat or create GitHub issue
- Refer to `docs/` for architectural decisions

---

## Tips for Success

1. **Read STANDARDS.md first** - Save time by following established patterns
2. **Write tests first** - TDD catches bugs early and guides design
3. **Use test helpers** - Don't reinvent authentication in every test
4. **Check types often** - Run `npm run typecheck` during development
5. **Keep files small** - Refactor before reaching 500 lines
6. **Commit frequently** - Small commits are easier to review and revert
7. **Ask questions** - Better to ask than introduce bugs

---

**Happy coding! 🚀**
