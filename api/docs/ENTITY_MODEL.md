# Entity Model & Database Schema

**Last Updated:** 2025-10-04

This document provides comprehensive details on the database schema, entity relationships, and multi-tenant architecture.

---

## Core Entities

### User & Authentication

#### `user`
Core user entity with authentication and context tracking.

**Key Fields:**
- `id` (UUID, PK)
- `email` (VARCHAR, unique, indexed)
- `phone` (VARCHAR, unique, nullable, E.164 format)
- `given_name`, `family_name` (VARCHAR)
- `password_hash` (VARCHAR, nullable - for future OAuth)
- `email_verified`, `phone_verified` (BOOLEAN)
- `last_org_id`, `last_env_id` (UUID, nullable - for JWT context)
- `is_active`, `is_suspended` (BOOLEAN)
- `created_at`, `updated_at`, `deleted_at` (TIMESTAMP)

**Indexes:**
- Unique: `email`, `phone`
- Foreign keys: `last_org_id`, `last_env_id`

#### `external_identity`
OAuth/SSO identity provider associations.

**Key Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → user)
- `provider` (ENUM: google, github, microsoft, etc.)
- `provider_user_id` (VARCHAR)
- `email` (VARCHAR)
- `profile_data` (JSONB)

**Indexes:**
- Unique: `(provider, provider_user_id)`
- Foreign key: `user_id`

#### `magic_link_token`
Passwordless authentication tokens.

**Key Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → user)
- `token` (VARCHAR, unique, indexed - secure random)
- `code` (VARCHAR - 6-digit code for email display)
- `delivery_method` (ENUM: email, sms)
- `expires_at` (TIMESTAMP)
- `used_at` (TIMESTAMP, nullable)
- `ip_address` (VARCHAR)
- `user_agent` (TEXT)

**Lifecycle:**
- Created on auth request
- Expires in 15 minutes (configurable)
- Single-use (marked `used_at` on verification)

#### `user_session`
Active user sessions with device tracking.

**Key Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → user)
- `device_id` (UUID, FK → device)
- `refresh_token` (VARCHAR, unique, indexed)
- `expires_at` (TIMESTAMP)
- `last_activity_at` (TIMESTAMP)
- `ip_address` (VARCHAR)
- `user_agent` (TEXT)
- `revoked_at` (TIMESTAMP, nullable)

**Lifecycle:**
- Created on successful authentication
- Updated on token refresh
- Revoked on logout or admin action

#### `device`
Trusted device tracking with fingerprinting.

**Key Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → user)
- `fingerprint_hash` (VARCHAR - bcrypt hash of client fingerprint)
- `device_name` (VARCHAR, nullable - user-provided)
- `device_type` (VARCHAR - extracted from user agent)
- `browser` (VARCHAR - extracted from user agent)
- `os` (VARCHAR - extracted from user agent)
- `trust_status` (ENUM: trusted, pending, revoked)
- `last_used_at` (TIMESTAMP)
- `revoked_at` (TIMESTAMP, nullable)

**Security Notes:**
- `fingerprint_hash` is bcrypt hash (NEVER exposed in API)
- Fingerprint generated client-side (FingerprintJS/ThumbmarkJS)
- `trust_status` is system-managed (not user-modifiable)

#### `user_impersonation_session`
Tracks user impersonation with chaining support.

**Key Fields:**
- `id` (UUID, PK)
- `original_user_id` (UUID, FK → user)
- `impersonated_user_id` (UUID, FK → user)
- `parent_session_id` (UUID, FK → user_impersonation_session, nullable)
- `environment_id` (UUID, FK → environment)
- `impersonation_type` (ENUM: system, organization)
- `permissions` (JSONB, nullable - for future permission overrides)
- `reason` (TEXT - required for audit compliance)
- `ip_address` (VARCHAR)
- `user_agent` (TEXT)
- `started_at`, `expires_at`, `ended_at` (TIMESTAMP)
- `is_active` (BOOLEAN)
- `metadata` (JSONB)

**Constraints:**
- `original_user_id <> impersonated_user_id` (cannot impersonate self)

**Chaining:**
- `parent_session_id` links to parent impersonation session
- Supports multi-level: Admin → Manager → User
- Pop operation ends current session, reverts to parent

---

### Organization & Tenancy

#### `organization`
Tenant entity in multi-tenant architecture.

**Key Fields:**
- `id` (UUID, PK)
- `name` (VARCHAR)
- `slug` (VARCHAR, unique, indexed)
- `default_env_id` (UUID, FK → environment, nullable)
- `contact_email` (VARCHAR, nullable)
- `settings` (JSONB - org-specific configuration)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at`, `deleted_at` (TIMESTAMP)

**Relationships:**
- Has many: `environment`, `organization_member`, `group`
- Default environment: `default_env_id` (typically "Live")

#### `environment`
Organizational spaces/environments (Live, Test, Sandbox).

**Key Fields:**
- `id` (UUID, PK)
- `organization_id` (UUID, FK → organization)
- `name` (VARCHAR)
- `type` (ENUM: live, sandbox, development)
- `slug` (VARCHAR)
- `description` (TEXT, nullable)
- `is_default` (BOOLEAN - one per org)
- `is_active` (BOOLEAN)
- `settings` (JSONB)
- `created_at`, `updated_at`, `deleted_at` (TIMESTAMP)

**Indexes:**
- Unique: `(organization_id, slug)`
- Unique: `(organization_id, is_default=true)` - one default per org

**Default Environments:**
Each org gets 2 environments on creation:
1. **Live** (type=live, is_default=true)
2. **Test** (type=sandbox, is_default=false)

#### `organization_member`
User membership in organizations.

**Key Fields:**
- `id` (UUID, PK)
- `organization_id` (UUID, FK → organization)
- `user_id` (UUID, FK → user)
- `status` (ENUM: invited, active, suspended, removed)
- `invited_by` (UUID, FK → user, nullable)
- `invitation_token` (VARCHAR, unique, nullable)
- `invitation_expires_at` (TIMESTAMP, nullable)
- `joined_at` (TIMESTAMP, nullable - null until user becomes active)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- Unique: `(organization_id, user_id)`
- Index: `invitation_token`

**Lifecycle:**
1. Created with `status=invited` when user invited
2. `joined_at` set when user accepts invitation (status → active)
3. `status=suspended` for temporary access removal
4. `status=removed` for permanent removal (soft delete alternative)

#### `group`
Hierarchical groups for RBAC and organizational structure.

**Key Fields:**
- `id` (UUID, PK)
- `organization_id` (UUID, FK → organization)
- `parent_id` (UUID, FK → group, nullable)
- `name` (VARCHAR)
- `slug` (VARCHAR)
- `description` (TEXT, nullable)
- `hierarchy_level` (INTEGER - 0=root, increments down)
- `settings` (JSONB)
- `created_at`, `updated_at`, `deleted_at` (TIMESTAMP)

**Indexes:**
- Unique: `(organization_id, slug)`
- Foreign keys: `parent_id`, `organization_id`

**Hierarchy Rules:**
- Root groups: `parent_id = NULL`, `hierarchy_level = 0`
- Child groups: `hierarchy_level = parent.hierarchy_level + 1`
- Used for impersonation restrictions (can only impersonate lower levels)

#### `group_member`
User membership in groups.

**Key Fields:**
- `id` (UUID, PK)
- `group_id` (UUID, FK → group)
- `user_id` (UUID, FK → user)
- `created_at` (TIMESTAMP)

**Indexes:**
- Unique: `(group_id, user_id)`

---

### RBAC & Permissions

#### `role`
Named roles for permission bundling.

**Key Fields:**
- `id` (UUID, PK)
- `name` (VARCHAR, unique)
- `slug` (VARCHAR, unique)
- `description` (TEXT, nullable)
- `is_system` (BOOLEAN - system roles cannot be deleted)
- `created_at`, `updated_at` (TIMESTAMP)

**Examples:**
- Admin, Manager, Member, Viewer
- Device Manager, Report Viewer, API User

#### `permission`
Granular permissions for RBAC.

**Key Fields:**
- `id` (UUID, PK)
- `name` (VARCHAR, unique)
- `slug` (VARCHAR, unique)
- `description` (TEXT, nullable)
- `category` (VARCHAR - grouping: devices, users, sessions, etc.)
- `is_system` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMP)

**Naming Convention:**
- Pattern: `{resource}:{action}`
- Examples:
  - `devices:read`, `devices:manage`
  - `sessions:read`, `sessions:manage`
  - `events:read`
  - `admin:users:read`, `admin:users:manage`

**Permission Categories:**
- Tenant-scoped: `devices:*`, `sessions:*`, `events:*`, `webhooks:*`
- Admin-scoped: `admin:*:*`
- System: `system:admin`, `system:support`

#### `role_permission`
Many-to-many mapping of roles to permissions.

**Key Fields:**
- `id` (UUID, PK)
- `role_id` (UUID, FK → role)
- `permission_id` (UUID, FK → permission)
- `created_at` (TIMESTAMP)

**Indexes:**
- Unique: `(role_id, permission_id)`

#### `environment_role_assignment`
Assigns roles to groups or organization members within environment context.

**Key Fields:**
- `id` (UUID, PK)
- `environment_id` (UUID, FK → environment)
- `assignee_type` (ENUM: group, organization_member)
- `assignee_id` (UUID - polymorphic to group or organization_member)
- `role_id` (UUID, FK → role)
- `granted_by` (UUID, FK → user)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- Unique: `(environment_id, assignee_type, assignee_id, role_id)`

**Polymorphic Relationship:**
- When `assignee_type = 'group'`: `assignee_id` → group.id
- When `assignee_type = 'organization_member'`: `assignee_id` → organization_member.id

**Permission Resolution:**
1. Get user's groups in environment
2. Get role assignments for user and groups
3. Get all permissions from assigned roles
4. Combine and deduplicate
5. Check if required permission exists

---

### Event Logging & Webhooks

#### `event`
Activity log following W3C Open Social Activity Streams model.

**Key Fields:**
- `id` (UUID, PK)
- `environment_id` (UUID, FK → environment)
- `verb` (VARCHAR - action: auth.login, device.update, etc.)
- `actor_type` (ENUM: User, System)
- `actor` (JSONB - who performed the action)
- `object` (JSONB - what was acted upon)
- `target` (JSONB - where the action occurred)
- `audit` (JSONB - HTTP context: request/response/headers/IP/user agent)
- `description` (TEXT - human-readable summary)
- `timestamp` (TIMESTAMP)
- `organization_id` (UUID, denormalized from environment)
- `organization_name` (VARCHAR, denormalized)
- `environment_name` (VARCHAR, denormalized)
- `is_webhook_event` (BOOLEAN - should this trigger webhooks?)

**Indexes:**
- `(environment_id, timestamp DESC)` - for cursor pagination
- `(organization_id, timestamp DESC)` - for admin queries
- `verb` - for filtering by action type

**Denormalization:**
- `organization_id`, `organization_name`, `environment_name` denormalized for read performance
- Achieves <200ms SLO for event queries without joins

**Actor JSONB Structure:**
```json
{
  "id": "userId",
  "type": "User",
  "name": "User Full Name",
  "email": "user@example.com",
  "impersonationContext": {
    "isImpersonated": true,
    "originalUserId": "...",
    "originalUserName": "...",
    "originalUserEmail": "...",
    "impersonationType": "system|organization",
    "sessionId": "...",
    "chainDepth": 1,
    "fullChain": [...]
  }
}
```

**CloudEvents 1.0.2:**
All events published to message queue in CloudEvents format:
- `id`, `source`, `specversion`, `type`
- `subject`, `time`, `datacontenttype`
- `data` - full event payload with impersonation metadata

#### `event_type`
Maps API endpoints to event verbs.

**Key Fields:**
- `id` (UUID, PK)
- `path` (VARCHAR - API path pattern)
- `method` (VARCHAR - HTTP method)
- `verb` (VARCHAR - event verb to log)
- `description` (TEXT)
- `is_active` (BOOLEAN)

**Examples:**
| Path | Method | Verb |
|------|--------|------|
| `/auth/logout` | POST | `auth.logout` |
| `/devices/{id}` | PUT | `device.update` |
| `/auth/register` | POST | `auth.register` |

#### `webhook`
Webhook configurations for CloudEvents delivery.

**Key Fields:**
- `id` (UUID, PK)
- `environment_id` (UUID, FK → environment)
- `name` (VARCHAR)
- `url` (VARCHAR - delivery endpoint)
- `secret` (VARCHAR - HMAC signing secret)
- `events` (JSONB - array of event verbs to subscribe to)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMP)
- `created_by` (UUID, FK → user)

**Indexes:**
- `(environment_id, is_active)` - for active webhook queries

#### `webhook_delivery`
Webhook delivery history and retry tracking.

**Key Fields:**
- `id` (UUID, PK)
- `webhook_id` (UUID, FK → webhook)
- `event_id` (UUID, FK → event)
- `attempt_number` (INTEGER - 1, 2, 3, etc.)
- `status` (ENUM: pending, success, failed, retrying)
- `http_status_code` (INTEGER, nullable)
- `request_headers` (JSONB)
- `request_body` (JSONB - CloudEvents payload)
- `response_headers` (JSONB, nullable)
- `response_body` (TEXT, nullable)
- `error_message` (TEXT, nullable)
- `delivered_at` (TIMESTAMP, nullable)
- `created_at` (TIMESTAMP)

**Indexes:**
- `(webhook_id, created_at DESC)` - delivery history queries
- `(status, created_at)` - retry queue processing

**Retry Strategy:**
- Exponential backoff: 1min, 5min, 15min, 1hr, 6hr
- Max 5 attempts
- Manual retry available via API

---

## Future Entities (Prepared, Not Priority)

These entities are planned for future implementation:

### Partner Management
- `partner` - Partner organizations
- `partner_user` - Partner user associations
- `partner_branding` - Partner customization

### Billing & Usage
- `billing_account` - Billing accounts
- `billing_contract` - Service contracts
- `plan` - Subscription plans
- `invoice` - Invoices
- `invoice_line_item` - Invoice line items
- `usage_record` - Usage tracking for metered billing

---

## Database Conventions

### Naming
- **Tables:** Singular, snake_case (e.g., `organization_member`, `group_member`)
- **Columns:** Lowercase, snake_case (e.g., `created_at`, `is_active`)
- **Primary Keys:** Always `id` (UUID)
- **Foreign Keys:** `{table}_id` (e.g., `user_id`, `organization_id`)

### Standard Columns
All tables include:
- `id` (UUID, PK)
- `created_at` (TIMESTAMP, default NOW())
- `updated_at` (TIMESTAMP, default NOW(), auto-update)
- `deleted_at` (TIMESTAMP, nullable - for soft deletes)

### API Transformation
- **Database:** snake_case (e.g., `organization_id`, `is_active`)
- **API:** camelCase (e.g., `organizationId`, `isActive`)
- **Transformation:** Handled by Sequelize field mapping

### Denormalization Strategy

**Principle:** Denormalize for read performance when writes are less frequent.

**Examples:**
1. **Event table:** Denormalize `organization_id`, `organization_name`, `environment_name`
   - Avoids joins on high-volume event queries
   - Achieves <200ms SLO

2. **Device count:** Store `device_count` on user record (future)
   - Updated on device create/delete
   - Faster than `COUNT(*)` query

**When to Denormalize:**
- ✅ Read:Write ratio > 100:1
- ✅ Join eliminates <200ms SLO achievement
- ✅ Data rarely changes (org name, env name)

**When NOT to Denormalize:**
- ❌ Frequent updates
- ❌ Complex write logic required
- ❌ Data consistency critical (financial data)

---

## Entity Relationships Diagram (Textual)

```
user
  ├─ has many → organization_member
  ├─ has many → external_identity
  ├─ has many → magic_link_token
  ├─ has many → user_session
  ├─ has many → device
  ├─ belongs to → organization (via last_org_id)
  └─ belongs to → environment (via last_env_id)

organization
  ├─ has many → environment
  ├─ has many → organization_member
  ├─ has many → group
  └─ belongs to → environment (default_env_id)

environment
  ├─ belongs to → organization
  ├─ has many → environment_role_assignment
  ├─ has many → event
  ├─ has many → webhook
  └─ has many → user_impersonation_session

group
  ├─ belongs to → organization
  ├─ belongs to → group (parent_id, self-referential)
  ├─ has many → group (children)
  └─ has many → group_member

role
  ├─ has many → role_permission
  └─ has many → environment_role_assignment

permission
  └─ has many → role_permission

event
  ├─ belongs to → environment
  └─ has many → webhook_delivery

webhook
  ├─ belongs to → environment
  └─ has many → webhook_delivery
```

---

## Indexes & Performance

### Critical Indexes for <200ms SLO

1. **Event table:**
   - `(environment_id, timestamp DESC)` - cursor pagination
   - `(organization_id, timestamp DESC)` - admin queries
   - `verb` - event type filtering

2. **User lookup:**
   - Unique: `email`, `phone`
   - `(last_org_id, last_env_id)` - context resolution

3. **Session validation:**
   - Unique: `refresh_token`
   - `(user_id, revoked_at IS NULL)` - active sessions

4. **Device fingerprinting:**
   - `(user_id, fingerprint_hash)` - device lookup

5. **Permission resolution:**
   - `(environment_id, assignee_type, assignee_id)` - role assignments
   - `(role_id, permission_id)` - permission lookup

### Query Optimization Strategies

1. **Eager Loading:** Use Sequelize `include` to avoid N+1 queries
2. **Pagination:** Always use `LIMIT` and `OFFSET` (or cursor)
3. **Covering Indexes:** Include commonly queried fields in index
4. **Partial Indexes:** Index only active records (e.g., `WHERE deleted_at IS NULL`)

---

## Migration Strategy

Migrations managed by Sequelize CLI:

```bash
npm run db:migrate        # Apply pending migrations
npm run db:migrate:undo   # Rollback last migration
npm run db:migrate:reset  # Reset database (dev only)
```

**Migration Naming:**
- Pattern: `YYYYMMDDHHMMSS-description.ts`
- Example: `20251003235905-create-core-schema.ts`

**Migration Best Practices:**
- Always include both `up` and `down` methods
- Use transactions for multi-step migrations
- Test rollback before deploying
- Never modify existing migrations (create new ones)

---

## Reference Implementation

See the following for complete implementation:

- **Models:** `src/models/*.model.ts`
- **Migrations:** `migrations/*.ts`
- **Sequelize Config:** `src/config/database.ts`
- **Tests:** `src/__tests__/integration/*.test.ts`
