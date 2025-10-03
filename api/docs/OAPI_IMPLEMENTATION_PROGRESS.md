# OpenAPI Specification Implementation Progress

## File Structure & Naming Convention

### Pattern
- **Paths**: `api/api-docs/paths/{tag-name}.yaml` (tenant-scoped) or `api/api-docs/paths/admin-{category}.yaml` (admin)
- **Schemas**: `api/api-docs/components/schemas/{tag-name}.yaml` or `admin.yaml`
- **Index**: Only `$ref` entries, no inline definitions

### Alignment
Each tag group has corresponding files:
- Tag → `paths/{tag}.yaml` + `components/schemas/{tag}.yaml`
- Admin tags → `paths/admin-{category}.yaml` + `components/schemas/admin.yaml`

## Completed ✅

### Files Created/Updated
- ✅ `index.yaml` - Main spec with $ref only (updated with all tags and paths, reorganized for intuitive grouping)
- ✅ `components/parameters.yaml` - Reusable path/query parameters (updated with deliveryId)
- ✅ `components/responses.yaml` - Common HTTP responses
- ✅ `components/schemas/common.yaml` - Common schemas (updated with PaginationInfo)
- ✅ `components/schemas/auth.yaml` - Authentication schemas
- ✅ `components/schemas/user.yaml` - User schemas (OIDC/PortableContacts/Schema.org compliant)
- ✅ `components/schemas/device.yaml` - Device schemas
- ✅ `components/schemas/session.yaml` - Session schemas
- ✅ `components/schemas/organization.yaml` - Organization schemas
- ✅ `components/schemas/environment.yaml` - Environment schemas
- ✅ `components/schemas/member.yaml` - Organization member schemas
- ✅ `components/schemas/group.yaml` - Hierarchical group schemas
- ✅ `components/schemas/role.yaml` - Role and permission schemas (admin-scoped)
- ✅ `components/schemas/role-assignment.yaml` - Role assignment schemas
- ✅ `components/schemas/event.yaml` - Event schemas (W3C Activity Streams format)
- ✅ `components/schemas/webhook.yaml` - **NEW**: Webhook and delivery schemas (CloudEvents 1.0.2 format)
- ✅ `paths/health.yaml` - Health endpoints
- ✅ `paths/auth.yaml` - Auth endpoints
- ✅ `paths/organizations.yaml` - Organization endpoints
- ✅ `paths/environments.yaml` - Environment endpoints
- ✅ `paths/members.yaml` - Organization member endpoints
- ✅ `paths/groups.yaml` - Hierarchical group endpoints
- ✅ `paths/users.yaml` - Tenant-scoped user endpoints
- ✅ `paths/events.yaml` - Tenant-scoped event/audit endpoints
- ✅ `paths/webhooks.yaml` - **NEW**: Tenant-scoped webhook endpoints
- ✅ `paths/admin-roles.yaml` - Admin role and permission endpoints
- ✅ `paths/admin-role-assignments.yaml` - Admin role assignments management endpoints
- ✅ `paths/admin-users.yaml` - Admin user management endpoints
- ✅ `paths/admin-organizations.yaml` - Admin organization management endpoints
- ✅ `paths/admin-environments.yaml` - Admin environment management endpoints
- ✅ `paths/admin-groups.yaml` - Admin group management endpoints
- ✅ `paths/admin-devices.yaml` - Admin device management endpoints
- ✅ `paths/admin-sessions.yaml` - Admin session management endpoints
- ✅ `paths/admin-impersonation.yaml` - Admin impersonation session monitoring endpoints
- ✅ `paths/admin-events.yaml` - Admin event/audit endpoints
- ✅ `paths/admin-webhooks.yaml` - **NEW**: Admin webhook management endpoints

### Tags Implemented (Reorganized for Intuitive Navigation)

**Core API:**
- **Health** - Health checks
- **Authentication** - Register, login, logout, token management

**Tenant-Scoped Resources:**
- **Users** - Current user profile and preferences
- **Organizations** - Multi-tenant organization management
- **Environments** - Environment management within organizations
- **Members** - Organization member management, invitations, and organization-scoped impersonation
- **Groups** - Hierarchical group management for RBAC
- **Events** - Activity log and audit trail for environment-scoped events
- **Webhooks** - Webhook management and delivery tracking (CloudEvents 1.0.2 format)

**Admin - System-Wide Management:**
- **Admin - Users** - System-wide user management
- **Admin - Organizations** - System-wide organization management
- **Admin - Environments** - System-wide environment management
- **Admin - Members** - System-wide member management
- **Admin - Groups** - System-wide group management
- **Admin - Roles & Permissions** - System-wide role and permission management
- **Admin - Role Assignments** - System-wide role assignment management
- **Admin - Devices** - System-wide device management
- **Admin - Sessions** - System-wide session management
- **Admin - Impersonation** - System-wide user impersonation and session monitoring
- **Admin - Events** - System-wide event and audit trail management
- **Admin - Webhooks** - System-wide webhook management and delivery monitoring

### Endpoints Implemented
**Health:**
- `GET /health` - Health check

**Authentication:**
- `POST /auth/register` - Register user
- `POST /auth/request-token` - Request magic link
- `POST /auth/verify-token` - Verify and login
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/logout` - Logout

**Organizations:**
- `GET /orgs` - List user's organizations
- `POST /orgs` - Create organization
- `GET /orgs/{orgId}` - Get organization
- `PUT /orgs/{orgId}` - Update organization
- `DELETE /orgs/{orgId}` - Delete organization
- `POST /orgs/{orgId}/switch` - Switch context (updates JWT with new orgId/envId)

**Environments:**
- `GET /orgs/{orgId}/envs` - List environments
- `POST /orgs/{orgId}/envs` - Create environment
- `GET /orgs/{orgId}/envs/{envId}` - Get environment
- `PUT /orgs/{orgId}/envs/{envId}` - Update environment
- `DELETE /orgs/{orgId}/envs/{envId}` - Delete environment

**Members:**
- `GET /orgs/{orgId}/members` - List members
- `GET /orgs/{orgId}/members/{memberId}` - Get member
- `POST /orgs/{orgId}/members` - Invite member
- `PUT /orgs/{orgId}/members/{memberId}` - Update member
- `DELETE /orgs/{orgId}/members/{memberId}` - Remove member
- `GET /orgs/{orgId}/members/{memberId}/organizations` - Get member's organizations
- `GET /orgs/{orgId}/members/{memberId}/permissions` - Get member's permissions
- `POST /orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate` - Start member impersonation
- `DELETE /orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate` - End member impersonation
- `GET /orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate` - Get impersonation status

**Groups:**
- `GET /orgs/{orgId}/groups` - List groups (hierarchical)
- `GET /orgs/{orgId}/groups/{groupId}` - Get group
- `POST /orgs/{orgId}/groups` - Create group
- `PUT /orgs/{orgId}/groups/{groupId}` - Update group
- `DELETE /orgs/{orgId}/groups/{groupId}` - Delete group
- `GET /orgs/{orgId}/groups/{groupId}/members` - List group members
- `POST /orgs/{orgId}/groups/{groupId}/members` - Add member
- `DELETE /orgs/{orgId}/groups/{groupId}/members/{userId}` - Remove member
- `GET /orgs/{orgId}/groups/{groupId}/children` - Get child groups

**Users:**
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update current user profile
- `GET /users/me/organizations` - Get user's organizations
- `GET /users/me/permissions` - Get user's effective permissions
- `GET /users/me/devices` - Get current user's devices
- `PUT /users/me/devices/{deviceId}` - Update current user's device
- `DELETE /users/me/devices/{deviceId}` - Revoke current user's device
- `GET /users/me/sessions` - Get current user's sessions
- `DELETE /users/me/sessions/{sessionId}` - Revoke current user's session
- `DELETE /users/me/sessions/all` - Revoke all current user's sessions

**Admin - Role Assignments:**
- `GET /admin/role-assignments` - List all role assignments
- `POST /admin/role-assignments` - Create role assignment
- `DELETE /admin/role-assignments/{assignmentId}` - Delete assignment

**Admin - Users:**
- `GET /admin/users` - List all users
- `GET /admin/users/{userId}` - Get user
- `PUT /admin/users/{userId}` - Update user
- `DELETE /admin/users/{userId}` - Delete user

**Admin - Organizations:**
- `GET /admin/organizations` - List all organizations
- `GET /admin/organizations/{orgId}` - Get organization
- `PUT /admin/organizations/{orgId}` - Update organization
- `DELETE /admin/organizations/{orgId}` - Delete organization

**Admin - Roles & Permissions:**
- `GET /admin/roles` - List roles
- `GET /admin/roles/{roleId}` - Get role
- `POST /admin/roles` - Create role
- `PUT /admin/roles/{roleId}` - Update role
- `DELETE /admin/roles/{roleId}` - Delete role
- `GET /admin/roles/{roleId}/permissions` - List role permissions
- `POST /admin/roles/{roleId}/permissions` - Add permission
- `DELETE /admin/roles/{roleId}/permissions/{permissionId}` - Remove permission
- `GET /admin/permissions` - List all permissions

**Admin - Environments:**
- `GET /admin/environments` - List all environments
- `GET /admin/environments/{envId}` - Get environment
- `PUT /admin/environments/{envId}` - Update environment
- `DELETE /admin/environments/{envId}` - Delete environment

**Admin - Groups:**
- `GET /admin/groups` - List all groups
- `GET /admin/groups/{groupId}` - Get group
- `PUT /admin/groups/{groupId}` - Update group
- `DELETE /admin/groups/{groupId}` - Delete group
- `GET /admin/groups/{groupId}/members` - List group members

**Admin - Devices:**
- `GET /admin/devices` - List all devices
- `GET /admin/devices/{deviceId}` - Get device
- `PUT /admin/devices/{deviceId}` - Update device
- `DELETE /admin/devices/{deviceId}` - Revoke device

**Admin - Sessions:**
- `GET /admin/sessions` - List all sessions
- `GET /admin/sessions/{sessionId}` - Get session
- `DELETE /admin/sessions/{sessionId}` - Revoke session
- `DELETE /admin/sessions/user/{userId}` - Revoke all user sessions

**Admin - Impersonation:**
- `POST /admin/users/{userId}/impersonate` - Start system-level user impersonation
- `DELETE /admin/impersonation/end` - End impersonation session
- `GET /admin/impersonation/active` - Get all active impersonation sessions
- `GET /admin/impersonation-sessions` - List all impersonation sessions
- `DELETE /admin/impersonation-sessions/{sessionId}` - Force end session

**Events:**
- `GET /orgs/{orgId}/envs/{envId}/events` - List events with filters (verb, actorType, actorId, date range, isWebhookEvent)
- `GET /orgs/{orgId}/envs/{envId}/events/{eventId}` - Get event details

**Admin - Events:**
- `GET /admin/events` - List all events system-wide with filters (verb, actorType, actorId, orgId, envId, date range, isWebhookEvent)
- `GET /admin/events/{eventId}` - Get event details

**Webhooks:**
- `GET /orgs/{orgId}/envs/{envId}/webhooks` - List webhooks
- `POST /orgs/{orgId}/envs/{envId}/webhooks` - Create webhook
- `GET /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Get webhook
- `PUT /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Update webhook
- `DELETE /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Delete webhook
- `GET /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries` - List deliveries
- `GET /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries/{deliveryId}` - Get delivery
- `POST /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries/{deliveryId}/retry` - Retry delivery

**Admin - Webhooks:**
- `GET /admin/webhooks` - List all webhooks system-wide
- `GET /admin/webhooks/{webhookId}` - Get webhook
- `PUT /admin/webhooks/{webhookId}` - Update webhook
- `DELETE /admin/webhooks/{webhookId}` - Delete webhook
- `GET /admin/webhooks/{webhookId}/deliveries` - List deliveries
- `POST /admin/webhooks/{webhookId}/deliveries/{deliveryId}/retry` - Retry delivery

### User Schema Standards Compliance
The User schema now follows industry standards for maximum OAuth/SSO compatibility:
- **OpenID Connect (OIDC)**: Standard claims (sub, email, email_verified, phone_number, given_name, family_name, name, picture, profile, etc.)
- **PortableContacts**: Compatible field naming and structure
- **Schema.org Person**: Aligned with Person type properties
- Future-ready for external identity providers (Google, Microsoft, Auth0, Okta, etc.)

## In Progress 🔄

None currently.

## Bug Fixes 🐛

- ✅ Fixed circular reference in `GroupWithChildren` schema (removed self-referencing `$ref`)
- ✅ Fixed endpoint reference format for `/orgs/{orgId}/groups/{groupId}/children`
- ✅ Enhanced error logging in `app.ts` to show full stack traces for Swagger errors
- ✅ API documentation now loads successfully at `/api-docs`

## Permission Model

### Scope-Based Permissions
The API uses a scope-based permission model where permissions are prefixed by their scope:

**User-Scoped Permissions** (org/env context required):
- `users:read` - Read own user profile
- `devices:manage` - Manage own devices
- `sessions:manage` - Manage own sessions
- `members:read`, `members:manage` - Organization members
- `members:impersonate` - Impersonate subordinate members (with hierarchy check)
- `groups:read`, `groups:manage` - Groups within org
- `organizations:read`, `organizations:manage` - Own organizations
- `environments:read`, `environments:manage` - Environments within org
- `roles:assign` - Assign roles within org/env
- `events:read` - Read events within org/env

**Admin-Scoped Permissions** (global, no org/env context):
- `admin:users:read`, `admin:users:manage` - All users
- `admin:users:impersonate` - Impersonate any user (system-level, no hierarchy restrictions)
- `admin:organizations:read`, `admin:organizations:manage` - All organizations
- `admin:environments:read`, `admin:environments:manage` - All environments
- `admin:groups:read`, `admin:groups:manage` - All groups
- `admin:devices:read`, `admin:devices:manage` - All devices
- `admin:sessions:read`, `admin:sessions:manage` - All sessions
- `admin:roles:read`, `admin:roles:manage` - All roles
- `admin:permissions:read` - List all permissions
- `admin:assignments:read`, `admin:assignments:manage` - All role assignments
- `admin:impersonation:read`, `admin:impersonation:manage` - Monitor and manage impersonation sessions
- `admin:events:read` - Read all events system-wide

### Key Differences:
- **User permissions** operate within org/env context and only affect user's own resources or resources they have access to
- **Admin permissions** bypass org/env restrictions and provide global access across all tenants
- Same resource (e.g., devices) can have both user-scoped (`devices:manage`) and admin-scoped (`admin:devices:manage`) permissions

### Impersonation Architecture

The API supports two types of impersonation with distinct permission models:

**System-Level Impersonation** (`admin:users:impersonate`):
- **Path**: `POST /admin/users/{userId}/impersonate`
- **Permission**: `admin:users:impersonate`
- **Type**: `system`
- **Restrictions**: None - can impersonate ANY user in ANY organization/environment
- **Use Case**: System administrators troubleshooting across all tenants

**Organization-Level Impersonation** (`members:impersonate`):
- **Path**: `POST /orgs/{orgId}/envs/{envId}/members/{memberId}/impersonate`
- **Permission**: `members:impersonate`
- **Type**: `organization`
- **Restrictions**:
  - Can only impersonate members in subordinate groups (lower `hierarchy_level`)
  - Cannot impersonate self, peers (same level), or superiors (higher level)
  - Hierarchy validation enforced at group membership level
- **Use Case**: Department managers impersonating their team members

**Common Features**:
- Required `reason` field for audit compliance
- Configurable session duration (default 60min, max 480min)
- Returns new JWT with impersonation context
- Full audit trail in `event` table and CloudEvents message queue
- Session chaining support via `parent_session_id`
- IP address and user agent captured for forensics

## Endpoint Architecture

### Admin-Scoped Tags (System-Level Management)
Protected by `admin:*` scoped permissions:
- **Admin - Organizations** - Manage all organizations
- **Admin - Environments** - Manage all environments
- **Admin - Groups** - Manage all groups across organizations
- **Admin - Members** - Manage all members across organizations
- **Admin - Users** - Manage all user accounts
- **Admin - Devices** - Manage all devices
- **Admin - Sessions** - Manage all sessions
- **Admin - Roles & Permissions** - Manage global roles and permissions

### Tenant-Scoped Tags (Organization/Environment Context)
Protected by context-specific permissions (e.g., `members:read`, `groups:manage`):
- **Authentication** - Register, login, logout, token management
- **Users** - Current user profile (`/users/me/*`)
- **Members** - Organization member management (`/orgs/{orgId}/members/*`) - requires `members:manage`
- **Groups** - Hierarchical groups (`/orgs/{orgId}/groups/*`) - requires `groups:manage`

**Note:** Members and Groups may be consolidated as they both manage member associations with `members:manage` permission scope.

## Pending 📋

**Summary:** Phase 2 (Webhooks) ✅ COMPLETED

**Out of Scope:**
- ❌ Tenant-scoped Role Assignments, Roles (read-only), Devices, Sessions
- ❌ Custom Roles (tenant-defined) - Future consideration

**Clarifications:**
1. **Roles/Permissions:** Admin-scoped only (no tenant endpoints needed)
2. **Event Filtering:** Verb implies resource type; filter by `actor_type`, `actor.id`, `isWebhookEvent`
3. **Webhook Authentication:** Support `none`, `hmac`, `jwt`, `basic`, `digest` methods
4. **Event Type Configuration:** Dynamic per `event_type` table with `name`, `status`, `path_pattern`, `http_method`, `is_mutation`, `is_webhook_event`, priority, and actor/object/target metadata

---

### Phase 1: Audit & Compliance (Events) ✅ COMPLETED

✅ **Events (Tenant-Scoped)** - Implemented
- `GET /orgs/{orgId}/envs/{envId}/events` - List events with filters
- `GET /orgs/{orgId}/envs/{envId}/events/{eventId}` - Get event details
- Permission: `events:read`
- Files: `paths/events.yaml`, `components/schemas/event.yaml`

✅ **Admin - Events (System-Wide)** - Implemented
- `GET /admin/events` - List all events system-wide with filters
- `GET /admin/events/{eventId}` - Get event details
- Permission: `admin:events:read`
- Files: `paths/admin-events.yaml` (reuses `components/schemas/event.yaml`)

---

### Phase 2: Webhook Integration ✅ COMPLETED

✅ **Webhooks (Tenant-Scoped)** - Implemented
- `GET /orgs/{orgId}/envs/{envId}/webhooks` - List webhooks
- `POST /orgs/{orgId}/envs/{envId}/webhooks` - Create webhook
- `GET /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Get webhook details
- `PUT /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Update webhook
- `DELETE /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Delete webhook
- `GET /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries` - List webhook deliveries
- `GET /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries/{deliveryId}` - Get delivery details
- `POST /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries/{deliveryId}/retry` - Retry failed delivery
- **Permissions:** `webhooks:read`, `webhooks:manage`
- **Files:** `paths/webhooks.yaml`, `components/schemas/webhook.yaml`

**Webhook Features:**
- CloudEvents 1.0.2 format for payload delivery
- Retry logic with exponential backoff (configurable maxRetries, initialDelaySeconds, maxDelaySeconds, backoffMultiplier)
- Event type filtering: `event_types` array (e.g., `["user.login", "device.revoked"]`)
- Authentication methods: `authMethod` enum (`none` | `hmac` | `jwt` | `basic` | `digest`)
- Custom headers support
- Configurable timeout (1-30 seconds)
- Delivery tracking with status (pending, success, failed, retrying)
- Full request/response logging for debugging

✅ **Admin - Webhooks (System-Wide)** - Implemented
- `GET /admin/webhooks` - List all webhooks system-wide
- `GET /admin/webhooks/{webhookId}` - Get webhook details
- `PUT /admin/webhooks/{webhookId}` - Update webhook
- `DELETE /admin/webhooks/{webhookId}` - Delete webhook
- `GET /admin/webhooks/{webhookId}/deliveries` - List webhook deliveries
- `POST /admin/webhooks/{webhookId}/deliveries/{deliveryId}/retry` - Retry delivery
- **Permissions:** `admin:webhooks:read`, `admin:webhooks:manage`
- **Files:** `paths/admin-webhooks.yaml` (reuses `components/schemas/webhook.yaml`)

## Common Patterns

### Path Parameters (reusable)
- `orgId` - Organization UUID
- `envId` - Environment UUID
- `groupId` - Group UUID
- `roleId` - Role UUID
- `permissionId` - Permission UUID
- `assignmentId` - Assignment UUID
- `eventId` - Event UUID
- `webhookId` - Webhook UUID

### Query Parameters (common)
- Pagination: `limit`, `offset`
- Sorting: `sort`, `order` (asc/desc)
- Filtering: varies by resource

### Response Patterns
All use common responses from `components/responses.yaml`:
- 401 UnauthorizedError
- 403 ForbiddenError
- 404 NotFoundError
- 422 ValidationError
- 429 RateLimitError
- 500 InternalServerError

## Next Steps

1. Create `components/parameters.yaml` for reusable path/query params
2. Start with Organizations tag (foundational)
3. Add Environments tag (depends on Organizations)
4. Add Members tag (depends on Organizations)
5. Add Groups tag (depends on Organizations)
6. Add Roles & Permissions tags
7. Add Role Assignments tag
8. Add Impersonation tag
9. Add Events & Webhooks tags
10. Add Admin tags (separate files per category)
11. Update `index.yaml` with all new references

## Notes

- Files kept under 500 lines, factor at 1000 lines
- Use `$ref` extensively
- All timestamps UTC ISO 8601
- All IDs are UUIDs
- Permission format: `resource:action`
- Multi-tenant path: `/orgs/{orgId}/envs/{envId}/{resource}`
- Admin path: `/admin/{resource}`
