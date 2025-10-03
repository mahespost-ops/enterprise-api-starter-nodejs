# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Background and Constraints
You are an enterprise software architect that pays special care to clean code, best practices, security, naming conventions, and performance. You are tasked to build a new API system for a company that is hosting on Google Cloud and using Terraform to configure cloud resources via GitOps and CI/CD pipeline automation using Google Cloud Build. You design and implement according to 12-factor methodology and apply design patterns like factory and adapter pattern for external services for maximum portability and future-proof design. Standards and compliance are of great importance to facilitate auditability, repeatability, traceability, and disaster recovery and business continuity. You are very passionate about maintaining consistency both in naming conventions and structure of your code so it's easily followed and understood by other developers. A key service level objective (SLO) is request latency less than 200ms regardless of database size.

### IMPORTANT BEHAVIORS:
- **you do not attempt to one-shot solutions and instead incrementally step through each component to ensure ease of code review and diffs, pausing at each step**
- **you break down complex tasks into small chunks of work and iterate to ensure easy code review by your peers**
- **you periodically update your context files when important user clarifications are provided to reduce future mistakes**
- **you minimize token consumption and hallucination risk by ensuring files don't get too large, factoring them as needed if greater than 500 lines to ensure no files greater than 1000 lines**
- **you try to avoid creating unnecessary code when reuse is possible**
- **when facing an error you don't assume and randomly try code edits, you first think hard and determine the root cause before proposing code changes**
- **when type errors occur you verify whether the type definition needs updating before simply changing the code to appease the error**
- **you clarify understanding of the design first, and update documentation and tests following test-driven development (TDD) best practices prior to implementation. Tests can fail at first and then once implementation is done, then get them green.**
- **you factor out reusable schema definitions in the OAPI specification with common file, responses file, parameters file and reference them from the main file for brevity**
- **for source code, you avoid magic strings and reference keys via central constants files**
- **you standardize dates and timestamps to UTC, and phone numbers to E.164, and follow ISO standards for countries, state_provinces, and other common gotchas in system design**
- **you log with a standard logger to console (12-factor) and not to files with appropriate log level and only use console.log or console.debug when debugging and always clean up after**
- **you configure linting and type checking and automated tests to ensure code quality**
- **you obfuscate IDs in urls and paths where possible to minimize reverse engineering risk**
- **you always ensure proper ignore files (i.e. .gitignore and .dockerignore) files are in place and no sensitive credentials are accidentally committed to source control**
- **when the application has been tested and in a stable state, you suggest committing to source control to preserve system stability**
- **you denormalize database tables where write performance is not as critical as read performance to minimize costly joins to achieve the SLO**
- **you create reference files in each component directory with the design pattern and best practices and reference that file when creating that type of component to maintain consistency and quality (e.g. routes/STANDARDS.md and controllers/STANDARDS.md)**
- **when interfacing with external services expect failure as normal and always build in retry with exponential backoff per SRE best practices**
- **database tables and columns use snake_case naming, but all API responses and OpenAPI documentation use camelCase for field names to follow JavaScript/JSON conventions - the backend transforms between conventions**


## Project Structure

This is a reduce-config-drift-demo project focused on the API service:

### `/api`
Backend API service with comprehensive structure:

#### Root Configuration
- `package.json` - Dependencies and npm scripts
- `tsconfig.json` - TypeScript configuration
- `jest.config.ts` - Jest testing configuration
- `eslint.config.mjs` - ESLint configuration
- `.env` / `.env.example` - Environment variables
- `.prettierrc` - Code formatting rules
- `Dockerfile` / `.dockerignore` - Container configuration

#### Source Code (`src/`)
- **`server.ts`** - Application entry point
- **`app.ts`** - Express application setup
- **`types/`** - TypeScript type definitions
  - `express.d.ts` - Express request/response type extensions
- **`config/`** - Application configuration
  - `index.ts` - Configuration management
  - `logger.ts` - Winston logger setup
- **`constants/`** - Centralized constants
  - `error-messages.constants.ts` - Standardized error messages
  - `http-status.constants.ts` - HTTP status code constants
- **`middleware/`** - Express middleware
  - `error-handler.middleware.ts` - Global error handling
  - `rate-limit.middleware.ts` - Rate limiting
  - `request-id.middleware.ts` - Request ID tracking
  - `xss.middleware.ts` - XSS protection
  - `STANDARDS.md` - Middleware design patterns
- **`routes/`** - Route definitions
  - `index.ts` - Route aggregation
  - `health.routes.ts` - Health check routes
  - `STANDARDS.md` - Route design patterns
- **`controllers/`** - Request handlers
  - `health.controller.ts` - Health check controller
  - `STANDARDS.md` - Controller design patterns
- **`services/`** - Business logic and adapters
  - `adapter.factory.ts` - Factory for service adapters
  - `health.service.ts` - Health check business logic
  - `config/adapter.config.ts` - Adapter configuration
  - `email/` - Email service adapters (SendGrid, SMTP, Mock)
  - `secrets/` - Secrets management adapters (GCP, AWS, Vault, File, Env, Memory)
  - `storage/` - Object storage adapters (GCS, S3, Local)
  - `queue/` - Message queue adapters (Pub/Sub, SQS, Redis, Kafka, Memory)
- **`utils/`** - Utility functions
  - `errors.ts` - Custom error classes
  - `async-handler.ts` - Async route wrapper
  - `pagination-response.ts` - Pagination helpers
  - `query-params.ts` - Query parameter parsing
  - `__tests__/` - Unit tests for utilities

#### Documentation (`docs/`)
- `ADAPTER_PATTERN.md` - Adapter pattern overview
- `ADAPTER_USAGE.md` - How to use adapters
- `ADAPTER_IMPLEMENTATION_PROGRESS.md` - Adapter completion status
- `AUTHENTICATION_DESIGN.md` - Auth system design
- `QUERY_PARAMETER_STANDARDS.md` - Query parameter conventions
- `OAPI_IMPLEMENTATION_PROGRESS.md` - OpenAPI implementation status
- `SECURITY_ASSESSMENT.md` - Security analysis

#### OpenAPI Specifications (`api-docs/`)
- `index.yaml` - Main OpenAPI specification
- `ENDPOINT_STANDARDIZATION_TEMPLATE.md` - Endpoint documentation template
- **`paths/`** - Endpoint definitions by resource
  - `health.yaml`, `auth.yaml`, `users.yaml`
  - `organizations.yaml`, `environments.yaml`, `members.yaml`, `groups.yaml`
  - `events.yaml`, `webhooks.yaml`
  - `admin-*.yaml` - Admin endpoint definitions
- **`components/`** - Reusable OpenAPI components
  - `parameters.yaml` - Common parameters
  - `responses.yaml` - Common responses
  - `security.yaml` - Security schemes
  - `schemas/` - Data models (auth, user, organization, environment, group, member, role, event, webhook, etc.)

#### Database (`migrations/`)
- Empty directory - migrations to be added

#### Testing (`coverage/`)
- Code coverage reports from Jest

### `/infra`
Infrastructure as Code (IaC) definitions - not yet implemented

## Architecture

This repository demonstrates configuration drift reduction patterns across API services and infrastructure. The project is organized to maintain separation between application code (`api/`) and infrastructure definitions (`infra/`).

### Multi-Tenant Architecture

The system implements a comprehensive multi-tenant architecture with the following core entities:

#### Core Entities

**User & Authentication:**
- `user` - Core user entity
- `external_identity` - OAuth/SSO identity providers
- `magic_link_token` - Passwordless authentication tokens
- `user_session` - Active user sessions
- `user_impersonation_session` - Tracks user impersonation sessions with chaining support
  - Fields: `id` (UUID), `original_user_id` (UUID), `impersonated_user_id` (UUID), `parent_session_id` (UUID, nullable for chaining), `environment_id` (UUID), `impersonation_type` (ENUM: 'system' | 'organization'), `permissions` (JSONB), `reason` (TEXT), `ip_address` (TEXT), `user_agent` (TEXT), `started_at` (TIMESTAMP), `expires_at` (TIMESTAMP), `ended_at` (TIMESTAMP, nullable), `is_active` (BOOLEAN), `metadata` (JSONB)
  - Constraint: `original_user_id <> impersonated_user_id` (cannot impersonate self)

**Organization & Tenancy:**
- `organization` - Tenant entity with `default_env_id`
- `environment` - Organizational spaces/environments (Live, Test)
  - Each org gets 2 default environments: 'Live' (type=live), 'Test' (type=sandbox)
- `organization_member` - User membership in organizations (tracks `last_org_id`, `last_env_id` for JWT context)
- `group` - Hierarchical groups with `parent_id` and `hierarchy_level` (0=root, increments down)
- `group_member` - User membership in groups

**RBAC & Permissions:**
- `role` - Named roles (e.g., "Admin", "Member", "Viewer")
- `permission` - Granular permissions (e.g., "devices:read", "devices:manage", "sessions:read", "sessions:manage")
- `role_permission` - Maps permissions to roles
- `environment_role_assignment` - Assigns roles to groups or organization members within environment context

**Event Logging & Webhooks:**
- `event` - Activity log following W3C Open Social Activity Streams model
  - Fields: `id` (UUID), `environment_id` (UUID), `verb` (VARCHAR), `actor_type` (ENUM: 'User' | 'System'), `actor` (JSONB), `object` (JSONB), `target` (JSONB), `audit` (JSONB), `description` (TEXT), `timestamp`, `organization_id` (denormalized), `organization_name` (denormalized), `environment_name` (denormalized), `is_webhook_event` (BOOLEAN)
  - Audit field includes: HTTP request/response/headers/IP (including X-Forwarded-For)/user agent and other available data
  - Published to message queue in CloudEvents 1.0.2 standard format
- `event_type` - Maps API endpoints (path, method) to event verbs (e.g., "auth.logout", "device.update", "auth.register")
- `webhook` - Webhook configurations
- `webhook_delivery` - Webhook delivery history

**Future Entities (prepared but not priority):**
- `partner` - Partner organizations
- `partner_user` - Partner user associations
- `partner_branding` - Partner customization
- `billing_account`, `billing_contract`, `plan`, `invoice`, `invoice_line_item`, `usage_record`

#### API Endpoint Structure

**Tenant-Scoped Endpoints:**
- Pattern: `/orgs/{orgId}/envs/{envId}/[resource]`
- Middleware validates `orgId` and `envId` from path against JWT token values
- Protected by RBAC with permissions like "devices:read", "devices:manage", "sessions:read", "sessions:manage"

**Administration Endpoints:**
- Pattern: `/admin/[resource]`
- Protected by system-level permissions: "system:admin", "system:support"
- Separation of concerns maintained:
  - OAPI specs: `admin-[name].yaml`
  - Controllers: `admin.[category].controller.ts`
  - Routes: `admin.[category].route.ts`
  - Services: `admin.[category].service.ts`
- Enables easy factoring out into separate service if needed

#### JWT Token Structure

**Standard Token (Non-Impersonation):**
```json
{
  "sub": "userId",
  "orgId": "organizationId",
  "envId": "environmentId",
  "user": {
    "fullName": "User Full Name",
    "email": "user@example.com"
  },
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Impersonation Token:**
```json
{
  "sub": "effectiveUserId",
  "orgId": "organizationId",
  "envId": "environmentId",
  "user": {
    "fullName": "Impersonated User Name",
    "email": "impersonated@example.com"
  },
  "iat": 1234567890,
  "exp": 1234654290,
  "impersonation": {
    "originalUserId": "impersonatorUserId",
    "effectiveUserId": "impersonatedUserId",
    "impersonationChain": [
      {
        "sessionId": "uuid",
        "userId": "impersonatedUserId",
        "startedAt": "2025-10-03T03:44:10.592Z",
        "impersonationType": "system|organization",
        "permissions": null
      }
    ]
  }
}
```

**Token Fields:**
- `sub` - User ID (effective/impersonated user ID when impersonating)
- `orgId` - Organization ID (from user's `last_org_id`)
- `envId` - Environment ID (from user's `last_env_id`)
- `user` - Object with `fullName` and `email` (of effective user)
- `iat` - Issued at timestamp (Unix epoch)
- `exp` - Expiration timestamp (Unix epoch)
- `impersonation` (optional) - Present only when impersonating:
  - `originalUserId` - ID of the user performing impersonation
  - `effectiveUserId` - ID of the impersonated user (same as `sub`)
  - `impersonationChain` - Array of impersonation session objects tracking the chain:
    - `sessionId` - UUID of the impersonation session
    - `userId` - User ID for this level of the chain
    - `startedAt` - ISO 8601 timestamp when impersonation started
    - `impersonationType` - Either 'system' or 'organization'
    - `permissions` - Reserved for future permission overrides (currently null)

#### User Impersonation

The system supports hierarchical user impersonation with full audit trails for compliance and security:

**Impersonation Types:**
1. **System Impersonation** (`impersonation_type: 'system'`):
   - Users with `system:admin` permission can impersonate ANY user across ANY organization/environment
   - No hierarchy restrictions apply

2. **Organization Impersonation** (`impersonation_type: 'organization'`):
   - Users with `members:manage` permission can impersonate users in subordinate groups only
   - Hierarchy rules enforced: Can only impersonate users in child groups (lower `hierarchy_level`)
   - Cannot impersonate self, peers (same level), or superiors (higher level)

**Impersonation Operations:**
- **Start Impersonation**: Creates new `user_impersonation_session` with required `reason`, configurable `expires_at`, captures `ip_address`, `user_agent`
- **Pop Impersonation**: Supports chained impersonation via `parent_session_id` - ends current session and reverts to parent impersonator
- **End Impersonation**: Terminates active impersonation session(s), sets `ended_at`, `is_active = false`

**Session Chaining:**
- Multi-level impersonation supported: Admin → Manager → User
- Each level tracked via `parent_session_id` forming a chain
- `chainDepth` increments with each level
- Pop operation ends current session and reissues JWT for parent session
- Full chain preserved in `impersonationChain` array for audit trail

**Event & Audit Integration:**
- Event `actor` JSONB includes full `impersonationContext` showing the chain
- CloudEvents 1.0.2 published to message queue include complete impersonation metadata
- Event records capture `originalUserId` (impersonator) and `effectiveUserId` (impersonated)
- All HTTP context preserved in `audit` field: request/response/headers/IP/user agent
- `actor_type` remains 'User' (not 'System') during impersonation
- `operationMetadata` tracks `requiredPermissions` and `grantedPermissions` for the operation

**Security & Compliance:**
- `reason` field required for all impersonation sessions (audit compliance)
- Configurable session duration with system-enforced maximum
- Cannot impersonate self (database constraint enforced)
- Complete audit trail maintained in both `event` table and message queue
- IP address and user agent captured for forensic analysis

#### Database Conventions

- Entity names: Singular, snake_case (e.g., `organization_member`, `group_member`)
- Field names: All lowercase, snake_case
- Denormalization strategy: Denormalize for read performance where write frequency is lower to achieve <200ms SLO

### Adapter Pattern for External Services

The application implements the adapter pattern to eliminate cloud provider lock-in and reduce configuration drift:

- **Email Service**: `services/email/` - SendGrid, AWS SES, or mock adapters
- **Secrets Management**: `services/secrets/` - GCP Secret Manager, AWS Secrets Manager, or environment variables
- **Object Storage**: `services/storage/` - GCS, S3, or local filesystem
- **Message Queues**: `services/queue/` - Pub/Sub, SQS, Redis, Kafka, or in-memory

All adapters implement provider-agnostic interfaces, allowing seamless switching between cloud providers via environment variables. See `api/docs/ADAPTER_PATTERN.md` and `api/docs/ADAPTER_USAGE.md` for details.

## API Query Parameter Standards

All list/collection endpoints follow standardized query parameter conventions documented in `api/docs/QUERY_PARAMETER_STANDARDS.md`.

### Standard Query Parameters

- **Pagination:**
  - Offset-based (standard endpoints): `limit` (1-100, default 20), `offset` (default 0)
  - Cursor-based (high-volume endpoints with 10M+ records): `limit`, `cursor`
- **Sorting:** `sort=field1,-field2` (prefix `-` for descending, supports multi-field)
- **Filtering:** `filter[field]=value` or `filter[field][operator]=value`
  - Operators: eq, ne, gt, gte, lt, lte, in, nin, contains, startsWith, endsWith, exists
- **Search:** `search=query` (full-text search, fields vary by endpoint)
- **Field Selection:** `fields=field1,field2,field3` (return only specified fields, `id` always included)

### High-Volume Endpoints (Cursor Pagination Required)

These endpoints use cursor-based pagination for optimal performance with 10M+ records:
- `GET /api/v1/orgs/{orgId}/envs/{envId}/events`
- `GET /api/v1/admin/events`
- (Future) `GET /api/v1/orgs/{orgId}/envs/{envId}/media`
- (Future) `GET /api/v1/orgs/{orgId}/envs/{envId}/messages`

### Endpoint Documentation Requirements

Every list endpoint MUST document in its OpenAPI description:
1. **Filterable fields** - Fields that support filtering with operators and value constraints
2. **Sortable fields** - Fields that support sorting with default sort and index status
3. **Searchable fields** - Fields included in full-text search
4. **Selectable fields** - All fields available via `fields` parameter
5. **Examples** - 2-3 realistic query examples

See `api/api-docs/ENDPOINT_STANDARDIZATION_TEMPLATE.md` for the complete template.

### Response Format

All list endpoints return:
```json
{
  "data": [...],
  "pagination": {
    // Offset-based:
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true

    // OR Cursor-based:
    "limit": 100,
    "nextCursor": "eyJpZCI6...",
    "hasMore": true
  }
}
```

## Development Notes

### File Organization
- When adding new components, maintain the separation between API and infrastructure concerns
- Place database migrations in `api/migrations/`
- Keep API-specific documentation in `api/docs/`
- Keep OpenAPI specifications in `api/api-docs/paths/` and `api/api-docs/components/`
- Reference STANDARDS.md files in each component directory (`routes/`, `controllers/`, `middleware/`) for consistency

### API Design
- All list endpoints must follow the standardization template in `api/api-docs/ENDPOINT_STANDARDIZATION_TEMPLATE.md`
- Use adapter pattern for external services (email, secrets, storage, queue)
- Maintain provider-agnostic interfaces to avoid cloud vendor lock-in
- Factor out reusable OpenAPI schemas to `api/api-docs/components/schemas/`

### Code Quality
- Run `npm run typecheck` before committing
- Run `npm run lint` and fix issues with `npm run lint:fix`
- Format code with `npm run format`
- Write tests for new utilities in `__tests__/` directories
- Maintain test coverage with `npm run test:coverage`

## API Scripts (from /api/package.json)

### Development & Build
- `npm run dev` - Start development server with nodemon and ts-node
- `npm run build` - Compile TypeScript to JavaScript (outputs to `dist/`)
- `npm start` - Run production server from compiled code

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Run Jest in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Code Quality
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Run ESLint and auto-fix issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking without emitting files

## API Endpoints

All API routes are versioned under `/api/v1` (except api-docs). Groupings match OpenAPI tags in `api/api-docs/index.yaml`.

### Documentation
- `GET /api-docs` - Swagger UI API documentation (no version prefix)

### Root
- `GET /` - API info (name, version, status, environment)

### Core - Health
- `GET /api/v1/health` - Basic health check (fast, <5ms)

### Core - Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/request-token` - Request magic link token
- `POST /api/v1/auth/verify-token` - Verify magic link and get JWT
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - Logout and invalidate session
- `POST /api/v1/auth/switch-context` - Switch organization/environment context (with device fingerprinting)

### Core - Users
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update current user profile
- `GET /api/v1/users/me/organizations` - List user's organizations
- `GET /api/v1/users/me/permissions` - Get user's permissions in current context
- `GET /api/v1/users/me/devices` - List user's devices
- `PUT /api/v1/users/me/devices/{deviceId}` - Update device
- `DELETE /api/v1/users/me/devices/{deviceId}` - Revoke device
- `GET /api/v1/users/me/sessions` - List user's active sessions
- `DELETE /api/v1/users/me/sessions/{sessionId}` - Revoke specific session
- `DELETE /api/v1/users/me/sessions/all` - Revoke all sessions

### Core - Organizations
- `GET /api/v1/orgs/{orgId}` - Get organization details
- `PATCH /api/v1/orgs/{orgId}` - Update organization details (tenant self-service for contact info, branding, etc.)

### Core - Environments
- `GET /api/v1/orgs/{orgId}/envs` - List environments
- `POST /api/v1/orgs/{orgId}/envs` - Create environment
- `GET /api/v1/orgs/{orgId}/envs/{envId}` - Get environment details
- `PUT /api/v1/orgs/{orgId}/envs/{envId}` - Update environment
- `DELETE /api/v1/orgs/{orgId}/envs/{envId}` - Delete environment

### Core - Members
- `GET /api/v1/orgs/{orgId}/members` - List organization members
- `POST /api/v1/orgs/{orgId}/members` - Invite member
- `GET /api/v1/orgs/{orgId}/members/{memberId}` - Get member details
- `PUT /api/v1/orgs/{orgId}/members/{memberId}` - Update member
- `DELETE /api/v1/orgs/{orgId}/members/{memberId}` - Remove member
- `GET /api/v1/orgs/{orgId}/members/{memberId}/organizations` - Get member's organizations
- `GET /api/v1/orgs/{orgId}/members/{memberId}/permissions` - Get member's permissions
- `POST /api/v1/orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate` - Start org-scoped impersonation (requires `members:manage` or `members:impersonate`)
- `DELETE /api/v1/orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate` - End org-scoped impersonation
- `GET /api/v1/orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate` - Get impersonation status

### Core - Groups
- `GET /api/v1/orgs/{orgId}/groups` - List groups
- `POST /api/v1/orgs/{orgId}/groups` - Create group
- `GET /api/v1/orgs/{orgId}/groups/{groupId}` - Get group details
- `PUT /api/v1/orgs/{orgId}/groups/{groupId}` - Update group
- `DELETE /api/v1/orgs/{orgId}/groups/{groupId}` - Delete group
- `GET /api/v1/orgs/{orgId}/groups/{groupId}/members` - List group members
- `POST /api/v1/orgs/{orgId}/groups/{groupId}/members` - Add member to group
- `DELETE /api/v1/orgs/{orgId}/groups/{groupId}/members/{userId}` - Remove member from group
- `GET /api/v1/orgs/{orgId}/groups/{groupId}/children` - Get child groups

### Core - Events
- `GET /api/v1/orgs/{orgId}/envs/{envId}/events` - List events with filters (requires `events:read`)
- `GET /api/v1/orgs/{orgId}/envs/{envId}/events/{eventId}` - Get event details (requires `events:read`)

### Core - Webhooks
- `GET /api/v1/orgs/{orgId}/envs/{envId}/webhooks` - List webhooks (requires `webhooks:read`)
- `POST /api/v1/orgs/{orgId}/envs/{envId}/webhooks` - Create webhook (requires `webhooks:manage`)
- `GET /api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Get webhook (requires `webhooks:read`)
- `PUT /api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Update webhook (requires `webhooks:manage`)
- `DELETE /api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Delete webhook (requires `webhooks:manage`)
- `GET /api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries` - List deliveries (requires `webhooks:read`)
- `GET /api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries/{deliveryId}` - Get delivery (requires `webhooks:read`)
- `POST /api/v1/orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries/{deliveryId}/retry` - Retry delivery (requires `webhooks:manage`)

### Admin - Users
- `GET /api/v1/admin/users` - List all users (requires `admin:users:read`)
- `GET /api/v1/admin/users/{userId}` - Get user details (requires `admin:users:read`)
- `PUT /api/v1/admin/users/{userId}` - Update user (requires `admin:users:manage`)
- `DELETE /api/v1/admin/users/{userId}` - Delete user (requires `admin:users:manage`)

### Admin - Organizations
- `GET /api/v1/admin/organizations` - List all organizations (requires `admin:organizations:read`)
- `GET /api/v1/admin/organizations/{orgId}` - Get organization details (requires `admin:organizations:read`)
- `PUT /api/v1/admin/organizations/{orgId}` - Update organization (requires `admin:organizations:manage`)
- `DELETE /api/v1/admin/organizations/{orgId}` - Delete organization (requires `admin:organizations:manage`)

### Admin - Environments
- `GET /api/v1/admin/environments` - List all environments (requires `admin:environments:read`)
- `GET /api/v1/admin/environments/{envId}` - Get environment details (requires `admin:environments:read`)
- `PUT /api/v1/admin/environments/{envId}` - Update environment (requires `admin:environments:manage`)
- `DELETE /api/v1/admin/environments/{envId}` - Delete environment (requires `admin:environments:manage`)

### Admin - Members
- `GET /api/v1/admin/organizations/{orgId}/members` - List organization members (requires `admin:members:read`)
- `GET /api/v1/admin/organizations/{orgId}/members/{memberId}` - Get organization member details (requires `admin:members:read`)
- `PUT /api/v1/admin/organizations/{orgId}/members/{memberId}` - Update organization member (requires `admin:members:manage`)
- `DELETE /api/v1/admin/organizations/{orgId}/members/{memberId}` - Remove organization member (requires `admin:members:manage`)
- `GET /api/v1/admin/groups/{groupId}/members` - List group members (requires `admin:members:read`)
- `POST /api/v1/admin/groups/{groupId}/members` - Add member to group (requires `admin:members:manage`)
- `DELETE /api/v1/admin/groups/{groupId}/members/{userId}` - Remove member from group (requires `admin:members:manage`)

### Admin - Groups
- `GET /api/v1/admin/groups` - List all groups (requires `admin:groups:read`)
- `GET /api/v1/admin/groups/{groupId}` - Get group details (requires `admin:groups:read`)
- `PUT /api/v1/admin/groups/{groupId}` - Update group (requires `admin:groups:manage`)
- `DELETE /api/v1/admin/groups/{groupId}` - Delete group (requires `admin:groups:manage`)

### Admin - Roles & Permissions
- `GET /api/v1/admin/roles` - List all roles (requires `admin:roles:read`)
- `POST /api/v1/admin/roles` - Create role (requires `admin:roles:manage`)
- `GET /api/v1/admin/roles/{roleId}` - Get role details (requires `admin:roles:read`)
- `PUT /api/v1/admin/roles/{roleId}` - Update role (requires `admin:roles:manage`)
- `DELETE /api/v1/admin/roles/{roleId}` - Delete role (requires `admin:roles:manage`)
- `GET /api/v1/admin/roles/{roleId}/permissions` - List role permissions (requires `admin:roles:read`)
- `POST /api/v1/admin/roles/{roleId}/permissions` - Add permission to role (requires `admin:roles:manage`)
- `DELETE /api/v1/admin/roles/{roleId}/permissions/{permissionId}` - Remove permission from role (requires `admin:roles:manage`)
- `GET /api/v1/admin/permissions` - List all permissions (requires `admin:permissions:read`)

### Admin - Role Assignments
- `GET /api/v1/admin/role-assignments` - List all role assignments (requires `admin:assignments:read`)
- `POST /api/v1/admin/role-assignments` - Create role assignment (requires `admin:assignments:manage`)
- `DELETE /api/v1/admin/role-assignments/{assignmentId}` - Delete role assignment (requires `admin:assignments:manage`)

### Admin - Devices
- `GET /api/v1/admin/devices` - List all devices (requires `admin:devices:read`)
- `GET /api/v1/admin/devices/{deviceId}` - Get device details (requires `admin:devices:read`)
- `PUT /api/v1/admin/devices/{deviceId}` - Update device (requires `admin:devices:manage`)
- `DELETE /api/v1/admin/devices/{deviceId}` - Revoke device (requires `admin:devices:manage`)

### Admin - Sessions
- `GET /api/v1/admin/sessions` - List all sessions (requires `admin:sessions:read`)
- `GET /api/v1/admin/sessions/{sessionId}` - Get session details (requires `admin:sessions:read`)
- `DELETE /api/v1/admin/sessions/{sessionId}` - Revoke session (requires `admin:sessions:manage`)
- `DELETE /api/v1/admin/sessions/user/{userId}` - Revoke all sessions for user (requires `admin:sessions:manage`)

### Admin - Impersonation
- `POST /api/v1/admin/users/{userId}/impersonate` - Start system-wide impersonation (requires `admin:users:impersonate`)
- `DELETE /api/v1/admin/impersonation/end` - End impersonation (pop or terminate) (requires `admin:users:impersonate`)
- `GET /api/v1/admin/impersonation/active` - Get active impersonation sessions for current user (requires `admin:impersonation:read`)
- `GET /api/v1/admin/impersonation-sessions` - List all impersonation sessions (history) (requires `admin:impersonation:read`)
- `DELETE /api/v1/admin/impersonation-sessions/{sessionId}` - Force-end impersonation session (requires `admin:impersonation:manage`)

### Admin - Events
- `GET /api/v1/admin/events` - List all events system-wide (requires `admin:events:read`)
- `GET /api/v1/admin/events/{eventId}` - Get event details (requires `admin:events:read`)

### Admin - Webhooks
- `GET /api/v1/admin/webhooks` - List all webhooks system-wide (requires `admin:webhooks:read`)
- `GET /api/v1/admin/webhooks/{webhookId}` - Get webhook (requires `admin:webhooks:read`)
- `PUT /api/v1/admin/webhooks/{webhookId}` - Update webhook (requires `admin:webhooks:manage`)
- `DELETE /api/v1/admin/webhooks/{webhookId}` - Delete webhook (requires `admin:webhooks:manage`)
- `GET /api/v1/admin/webhooks/{webhookId}/deliveries` - List deliveries (requires `admin:webhooks:read`)
- `POST /api/v1/admin/webhooks/{webhookId}/deliveries/{deliveryId}/retry` - Retry delivery (requires `admin:webhooks:manage`)
