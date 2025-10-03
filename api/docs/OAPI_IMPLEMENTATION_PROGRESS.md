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
- ✅ `index.yaml` - Main spec with $ref only (updated with Organizations & Environments)
- ✅ `components/parameters.yaml` - **NEW**: Reusable path/query parameters
- ✅ `components/responses.yaml` - Common HTTP responses
- ✅ `components/schemas/common.yaml` - Common schemas (updated with PaginationInfo)
- ✅ `components/schemas/auth.yaml` - Authentication schemas
- ✅ `components/schemas/user.yaml` - **UPDATED**: User schemas (OIDC/PortableContacts/Schema.org compliant)
- ✅ `components/schemas/device.yaml` - Device schemas
- ✅ `components/schemas/session.yaml` - Session schemas
- ✅ `components/schemas/organization.yaml` - **NEW**: Organization schemas
- ✅ `components/schemas/environment.yaml` - **NEW**: Environment schemas
- ✅ `components/schemas/member.yaml` - **NEW**: Organization member schemas
- ✅ `components/schemas/group.yaml` - **NEW**: Hierarchical group schemas
- ✅ `components/schemas/role.yaml` - **NEW**: Role and permission schemas (admin-scoped)
- ✅ `paths/health.yaml` - Health endpoints
- ✅ `paths/auth.yaml` - Auth endpoints
- ✅ `paths/devices.yaml` - Device endpoints
- ✅ `paths/sessions.yaml` - Session endpoints
- ✅ `paths/organizations.yaml` - **NEW**: Organization endpoints
- ✅ `paths/environments.yaml` - **NEW**: Environment endpoints
- ✅ `paths/members.yaml` - **NEW**: Organization member endpoints
- ✅ `paths/groups.yaml` - **NEW**: Hierarchical group endpoints
- ✅ `paths/users.yaml` - **NEW**: Tenant-scoped user endpoints
- ✅ `paths/admin-roles.yaml` - **NEW**: Admin role and permission endpoints
- ✅ `paths/role-assignments.yaml` - **NEW**: Environment-scoped role assignments
- ✅ `components/schemas/role-assignment.yaml` - **NEW**: Role assignment schemas

### Tags Implemented
- **Health** - Health checks
- **Authentication** - Register, login, logout, token management
- **Organizations** - Multi-tenant organization management
- **Environments** - Environment management within organizations
- **Members** - Organization member management and invitations
- **Groups** - Hierarchical group management for RBAC
- **Users** - Tenant-scoped user profile and permissions
- **Admin - Roles & Permissions** - System-wide role and permission management
- **Role Assignments** - Environment-scoped role assignments to members and groups
- **Devices** - Device management with fingerprinting
- **Sessions** - Session management and revocation

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

**Role Assignments:**
- `GET /orgs/{orgId}/envs/{envId}/assignments` - List role assignments
- `POST /orgs/{orgId}/envs/{envId}/assignments` - Create role assignment
- `DELETE /orgs/{orgId}/envs/{envId}/assignments/{assignmentId}` - Delete assignment

**Devices:**
- `GET /devices` - List devices
- `PUT /devices/{id}` - Update device
- `DELETE /devices/{id}` - Revoke device

**Sessions:**
- `GET /sessions` - List sessions
- `GET /sessions/{id}` - Get session
- `DELETE /sessions/{id}` - Revoke session
- `DELETE /sessions/device/{deviceId}` - Revoke device sessions
- `DELETE /sessions/all` - Revoke all except current
- `DELETE /sessions/all/force` - Force revoke all

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

## Endpoint Architecture

### Admin-Scoped Tags (System-Level Management)
Protected by `system:admin` or `system:support` permissions:
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

### Impersonation Tag
**Files to create:**
- `paths/impersonation.yaml`
- `components/schemas/impersonation.yaml`

**Endpoints:**
- `POST /impersonation/start` - Start impersonating
- `POST /impersonation/pop` - Pop to parent impersonator
- `POST /impersonation/end` - End all impersonation
- `GET /impersonation/current` - Get current context

**Permissions:** `system:admin` (system), `members:manage` (org with hierarchy check)
**Note:** Returns JWT with `impersonation` claim including `impersonationChain`

### Events Tag
**Files to create:**
- `paths/events.yaml`
- `components/schemas/event.yaml`

**Endpoints:**
- `GET /orgs/{orgId}/envs/{envId}/events` - List events (paginated)
- `GET /orgs/{orgId}/envs/{envId}/events/{eventId}` - Get event

**Permissions:** `events:read`
**Note:** W3C Open Social Activity Streams model

### Webhooks Tag
**Files to create:**
- `paths/webhooks.yaml`
- `components/schemas/webhook.yaml`

**Endpoints:**
- `GET /orgs/{orgId}/envs/{envId}/webhooks` - List webhooks
- `GET /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Get webhook
- `POST /orgs/{orgId}/envs/{envId}/webhooks` - Create webhook
- `PUT /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Update webhook
- `DELETE /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}` - Delete webhook
- `GET /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/deliveries` - List deliveries
- `POST /orgs/{orgId}/envs/{envId}/webhooks/{webhookId}/test` - Test webhook

**Permissions:** `webhooks:read`, `webhooks:manage`

### Admin Tag
**Files to create:**
- `paths/admin-users.yaml` - User management
- `paths/admin-organizations.yaml` - Org management
- `paths/admin-impersonation.yaml` - Impersonation monitoring
- `components/schemas/admin.yaml` - All admin schemas

**Endpoints (Users):**
- `GET /admin/users` - List all users
- `GET /admin/users/{userId}` - Get user
- `PUT /admin/users/{userId}` - Update user
- `DELETE /admin/users/{userId}` - Delete user

**Endpoints (Organizations):**
- `GET /admin/organizations` - List all orgs
- `GET /admin/organizations/{orgId}` - Get org
- `PUT /admin/organizations/{orgId}` - Update org
- `DELETE /admin/organizations/{orgId}` - Delete org

**Endpoints (Impersonation):**
- `GET /admin/impersonation-sessions` - List all sessions
- `GET /admin/impersonation-sessions/active` - List active
- `DELETE /admin/impersonation-sessions/{sessionId}` - Force end

**Permissions:** `system:admin`, `system:support`

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
