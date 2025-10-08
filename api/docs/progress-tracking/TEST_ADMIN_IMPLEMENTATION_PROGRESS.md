# Admin Endpoints - Test Implementation Progress

**Date Started:** 2025-10-07
**Last Updated:** 2025-10-08 19:00 UTC
**Status:** In Progress - 55/62 endpoints complete (88.7%)
**Strategy:** Test-Driven Development (TDD)

---

## Overall Progress Summary

**Total Admin Endpoints:** 62
**Endpoints Complete:** 55/62 (88.7%)
**Tests Written:** 491/533 (92.1%)
**Tests Passing:** 423/491 (86.1%) - 68 tests in RED phase (webhooks batch 6.13)

### Completed Sub-Batches:
- ✅ **6.1 - Admin Users:** 4 endpoints, 31 tests (100%)
- ✅ **6.2 - Admin Organizations:** 4 endpoints, 31 tests (100%)
- ✅ **6.3 - Admin Environments:** 4 endpoints, 33 tests (100%)
- ✅ **6.4 - Admin Members:** 7 endpoints, 41 tests (100%)
- ✅ **6.5 - Admin Groups:** 4 endpoints, 34 tests (100%)
- ✅ **6.6 - Admin Roles & Permissions:** 9 endpoints, 69 tests (100%)
- ✅ **6.7 - Admin Role Assignments:** 3 endpoints, 33 tests (100%)
- ✅ **6.8 - Admin Devices:** 4 endpoints, 31 tests (100%)
- ✅ **6.9 - Admin Sessions:** 4 endpoints, 26 tests (100%)
- ✅ **6.10 - Admin Impersonation:** 5 endpoints, 32 tests (100%)
- ✅ **6.11 - Admin Events:** 2 endpoints, 19 tests (100%)
- ✅ **6.12 - Admin Event Types:** 5 endpoints, 43 tests (100%)
- 🔧 **6.12.1 - Event Type Subscription Helper:** Schema/spec only (implementation in 6.13)

### Remaining Sub-Batches:
- 🔧 **6.13 - Admin Webhooks (Part 1):** 6 endpoints, 68 tests (RED phase complete, implementing GREEN phase)
- ⏭️ **6.14 - Admin Webhooks (Part 2):** 3 endpoints (delivery management), ~18 tests

---

## Admin Endpoint Structure

All admin endpoints follow the pattern:
- **Path:** `/api/v1/admin/{resource}`
- **Permissions:** `admin:{resource}:read` or `admin:{resource}:manage`
- **Scope:** System-wide (not tenant-scoped)
- **Separation:** Easy to factor into separate microservice

---

## Completed Sub-Batches ✅

### 6.1 Admin Users (4 endpoints) ✅
**File:** `admin/users.test.ts`
**Date Completed:** 2025-10-07
**Tests:** 31/31 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/users` - List all users
2. ✅ `GET /admin/users/{userId}` - Get user details
3. ✅ `PUT /admin/users/{userId}` - Update user
4. ✅ `DELETE /admin/users/{userId}` - Delete user (soft)

#### Implementation:
- [x] Test file: `admin/users.test.ts`
- [x] Constants: `user.constants.ts`
- [x] Validation: `admin-user.schemas.ts`
- [x] Service: `admin-user.service.ts`
- [x] Controller: `admin-user.controller.ts`
- [x] Routes: `admin-user.routes.ts`
- [x] Wired into main router

#### Key Features:
- **Filtering:** isActive, organizationId, emailVerified, createdAt, updatedAt
- **Sorting:** Multiple fields with direction support
- **Search:** Full-text across email, givenName, familyName
- **Field Selection:** Optimized responses
- **Security:** Never expose fingerprintHash

#### Test Coverage:
- List (11 tests): pagination, filters, sorting, search, field selection, auth, errors
- Get (5 tests): success, auth, authorization, not found, database error
- Update (10 tests): various fields, validation, auth, errors
- Delete (5 tests): soft delete, auth, authorization, not found, error

---

### 6.2 Admin Organizations (4 endpoints) ✅
**File:** `admin/organizations.test.ts`
**Date Completed:** 2025-10-07
**Tests:** 31/31 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/organizations` - List all organizations
2. ✅ `GET /admin/organizations/{orgId}` - Get organization details
3. ✅ `PUT /admin/organizations/{orgId}` - Update organization
4. ✅ `DELETE /admin/organizations/{orgId}` - Delete organization (soft)

#### Implementation:
- [x] Test file: `admin/organizations.test.ts`
- [x] Constants: `organization.constants.ts`
- [x] Validation: `admin-organization.schemas.ts`
- [x] Service: `admin-organization.service.ts`
- [x] Controller: `admin-organization.controller.ts`
- [x] Routes: `admin-organization.routes.ts`
- [x] Error constant: `ORGANIZATION_SLUG_EXISTS`
- [x] Wired into main router

#### Key Features:
- **Filtering:** isActive, createdAt, updatedAt
- **Sorting:** name, createdAt, updatedAt, slug
- **Search:** Full-text across name and slug
- **Field Selection:** Optimized responses
- **Duplicate Detection:** Slug uniqueness (409 Conflict)
- **Note:** Uses `isActive` (boolean), not `status` (enum)

#### Test Coverage:
- List (11 tests): pagination, filters, sorting, search, field selection, auth, errors
- Get (5 tests): success, auth, authorization, not found, database error
- Update (10 tests): name, slug, isActive, validation, duplicate slug (409), auth, errors
- Delete (5 tests): soft delete, auth, authorization, not found, error

---

### 6.3 Admin Environments (4 endpoints) ✅
**File:** `admin/environments.test.ts`
**Date Completed:** 2025-10-07
**Tests:** 33/33 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/environments` - List all environments
2. ✅ `GET /admin/environments/{envId}` - Get environment details
3. ✅ `PUT /admin/environments/{envId}` - Update environment
4. ✅ `DELETE /admin/environments/{envId}` - Delete environment (soft)

#### Implementation:
- [x] Test file: `admin/environments.test.ts`
- [x] Model: Added `findWithFilters` static method to `Environment.model.ts`
- [x] Validation: `admin-environment.schemas.ts`
- [x] Service: `admin-environment.service.ts`
- [x] Controller: `admin-environment.controller.ts`
- [x] Routes: `admin-environment.routes.ts`
- [x] Wired into main router
- [x] Updated CLAUDE.md with SOC rule (no Op/sequelize in services)

#### Key Features:
- **Filtering:** organizationId, type, isActive, isDefault, createdAt, updatedAt
- **Sorting:** name, type, createdAt, updatedAt, isDefault, isActive
- **Search:** Full-text across name
- **Field Selection:** Optimized responses
- **Separation of Concerns:** All DB logic in model layer (no Op imports in service)

#### Test Coverage:
- List (11 tests): pagination, filters (5 types), sorting, search, field selection, auth, errors
- Get (5 tests): success, auth, authorization, not found, database error
- Update (12 tests): name, description, isDefault, isActive, type, multiple fields, validation (3), auth, errors (2)
- Delete (5 tests): soft delete, auth, authorization, not found, error

---

## Remaining Sub-Batches ⏭️

---

### 6.4 Admin Members (7 endpoints) ✅
**File:** `admin/members.test.ts`
**Date Completed:** 2025-10-07
**Tests:** 41/41 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/organizations/{orgId}/members` - List org members
2. ✅ `GET /admin/organizations/{orgId}/members/{memberId}` - Get member details
3. ✅ `PUT /admin/organizations/{orgId}/members/{memberId}` - Update member
4. ✅ `DELETE /admin/organizations/{orgId}/members/{memberId}` - Remove member
5. ✅ `GET /admin/groups/{groupId}/members` - List group members
6. ✅ `POST /admin/groups/{groupId}/members` - Add member to group
7. ✅ `DELETE /admin/groups/{groupId}/members/{userId}` - Remove member from group

#### Implementation:
- [x] Test file: `admin/members.test.ts`
- [x] Constants: `member.constants.ts` (added filterable/sortable/searchable fields)
- [x] Test constants: Added MEMBER_1, MEMBER_2, GROUP_1, USER_REGULAR_2, ORG_TEST_2, etc.
- [x] Model: `OrganizationMember.findWithFilters()` for advanced filtering/search
- [x] Model: `GroupMember.findByGroupWithUsers()` for group members with user data
- [x] Validation: `admin-member.schemas.ts`
- [x] Service: `admin-member.service.ts`
- [x] Controller: `admin-member.controller.ts`
- [x] Routes: `admin-member.routes.ts`
- [x] Wired into main router (mounted at `/admin`)
- [x] Error constant: `GROUP_MEMBER_EXISTS`

#### Key Features:
- **Organization Members:**
  - Filtering: status, createdAt, joinedAt
  - Sorting: Multiple fields with direction support
  - Search: Full-text across user fields (email, givenName, familyName)
  - Field selection: Optimized responses
  - Status management: invited → active (sets joinedAt), suspended
  - Soft delete support
- **Group Members:**
  - Simple pagination (limit/offset)
  - Add/remove members from groups
  - Duplicate detection (409 Conflict)
  - Includes user details in response

#### Test Coverage (41 tests):
**Organization Members (27 tests):**
- List (11 tests): pagination, filters (status, createdAt, joinedAt), sorting, search, field selection, auth, errors
- Get (5 tests): success, auth, authorization, not found, database error
- Update (7 tests): status change, invited→active (sets joinedAt), validation, auth, errors
- Delete (4 tests): soft delete, auth, authorization, not found

**Group Members (14 tests):**
- List (4 tests): pagination, auth, authorization, not found
- Add (6 tests): success (201), auth, authorization, not found group, duplicate (409), validation
- Remove (4 tests): success (204), auth, authorization, not found group/member

#### Architectural Patterns:
- **Separation of Concerns:** All DB operations in model layer (no Op imports in service)
- **Field Naming:** Consistent camelCase across all layers
- **Security:** Never expose invitationToken or internal fields
- **TDD Workflow:** RED (failing tests) → GREEN (implementation) → All passing

---

### 6.5 Admin Groups (4 endpoints) ✅
**File:** `admin/groups.test.ts`
**Date Completed:** 2025-10-07
**Tests:** 34/34 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/groups` - List all groups
2. ✅ `GET /admin/groups/{groupId}` - Get group details
3. ✅ `PUT /admin/groups/{groupId}` - Update group
4. ✅ `DELETE /admin/groups/{groupId}` - Delete group

#### Implementation:
- [x] Test file: `admin/groups.test.ts`
- [x] Constants: `group.constants.ts` (added filterable/sortable/searchable fields)
- [x] Model: `Group.findWithFilters()` for advanced filtering/search
- [x] Validation: `admin-group.schemas.ts`
- [x] Service: `admin-group.service.ts`
- [x] Controller: `admin-group.controller.ts`
- [x] Routes: `admin-group.routes.ts`
- [x] Wired into main router (mounted at `/admin/groups`)

#### Key Features:
- **Filtering:** organizationId, parentId (supports "null" for root groups), hierarchyLevel, isActive, createdAt, updatedAt
- **Sorting:** name, createdAt, updatedAt, hierarchyLevel, memberCount
- **Search:** Full-text across name and description
- **Field Selection:** Optimized responses
- **Hierarchical Support:** Filter by hierarchy level and parent relationships

#### Test Coverage (34 tests):
**List (13 tests):**
- Pagination, filters (5 types: organizationId, parentId null, hierarchyLevel, isActive), sorting (name ASC, memberCount DESC), search (name, description), field selection, auth, errors

**Get (5 tests):**
- Success, auth, authorization, not found, database error

**Update (11 tests):**
- Name, description, isActive, multiple fields, validation (3 tests), auth, authorization, not found, database error

**Delete (5 tests):**
- Soft delete, auth, authorization, not found, database error

#### Architectural Patterns:
- **Separation of Concerns:** All DB operations in model layer (no Op imports in service)
- **Field Naming:** Consistent camelCase across all layers
- **TDD Workflow:** RED (failing tests) → GREEN (implementation) → All passing
- **Hierarchical Groups:** Supports parentId filtering with "null" string for root groups

---

### 6.6 Admin Roles & Permissions (9 endpoints) ✅
**File:** `admin/roles.test.ts`
**Date Completed:** 2025-10-07
**Tests:** 69/69 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/roles` - List all roles
2. ✅ `POST /admin/roles` - Create role
3. ✅ `GET /admin/roles/{roleId}` - Get role details
4. ✅ `PUT /admin/roles/{roleId}` - Update role
5. ✅ `DELETE /admin/roles/{roleId}` - Delete role
6. ✅ `GET /admin/roles/{roleId}/permissions` - List role permissions
7. ✅ `POST /admin/roles/{roleId}/permissions` - Add permission to role
8. ✅ `DELETE /admin/roles/{roleId}/permissions/{permissionId}` - Remove permission
9. ✅ `GET /admin/permissions` - List all permissions

#### Implementation:
- [x] Test file: `admin/roles.test.ts`
- [x] Constants: `role.constants.ts` (filterable/sortable/searchable fields)
- [x] Error constants: `ROLE_NAME_EXISTS`, `ROLE_PERMISSION_EXISTS`, `CANNOT_MODIFY_SYSTEM_ROLE`, `CANNOT_DELETE_SYSTEM_ROLE`
- [x] Model: `Role.findWithFilters()` for advanced filtering/search
- [x] Model: `RolePermission.addPermissionToRole()` with transaction handling
- [x] Model: `RolePermission.removePermissionFromRole()` with transaction handling
- [x] Validation: `admin-role.schemas.ts`
- [x] Service: `admin-role.service.ts`
- [x] Controller: `admin-role.controller.ts`
- [x] Routes: `admin-role.routes.ts` and `admin-permission.routes.ts`
- [x] Wired into main router (mounted at `/admin`)
- [x] Standards audit: Fixed magic strings → ERROR_MESSAGES constants
- [x] Standards audit: Fixed service error handling (errors bubble up from model)

#### Key Features:
- **Filtering:** isSystem, createdAt, updatedAt
- **Sorting:** name, createdAt, updatedAt, permissionCount
- **Search:** Full-text across name and description
- **Field Selection:** Optimized responses
- **System Role Protection:** Cannot modify/delete system-defined roles (409 Conflict)
- **Permission Count:** Denormalized field automatically maintained via transactions
- **Transaction Safety:** Model layer owns transaction logic with automatic rollback

#### Test Coverage (69 tests):
**Roles - List (13 tests):**
- Pagination, filters (isSystem, createdAt range), sorting (name ASC, permissionCount DESC), search (name, description), field selection, auth, errors

**Roles - Create (7 tests):**
- Success (201), duplicate name (409), validation (name required, max length, description max length), auth, errors

**Roles - Get (5 tests):**
- Success, auth, authorization, not found, database error

**Roles - Update (8 tests):**
- Name, description, multiple fields, system role protection (409), duplicate name (409), validation (2), auth, errors

**Roles - Delete (6 tests):**
- Soft delete, system role protection (409), auth, authorization, not found, database error

**Role Permissions - List (6 tests):**
- Success with permissions, empty array, auth, authorization, not found, database error

**Role Permissions - Add (7 tests):**
- Success (201), system role protection (409), duplicate permission (409), validation, auth, not found (2), errors

**Role Permissions - Remove (7 tests):**
- Success (204), system role protection (409), permission not assigned (404), auth, authorization, not found role, database error

**Permissions - List (7 tests):**
- All permissions, filter by resource, filter by action, filter by both, auth, authorization, database error

#### Architectural Patterns:
- **Separation of Concerns:** All DB operations in model layer (no Op imports in service)
- **Transaction Handling:** Model methods own transaction logic (create, commit, rollback)
- **Error Propagation:** Services let errors bubble up naturally (no try/catch re-throw)
- **DRY Principle:** All error messages use ERROR_MESSAGES constants (no magic strings)
- **Field Naming:** Consistent camelCase across all layers
- **System Protection:** Business rules prevent modification of system-defined roles
- **Denormalization:** permissionCount maintained automatically for <200ms SLO

---

### 6.7 Admin Role Assignments (3 endpoints) ✅
**File:** `admin/role-assignments.test.ts`
**Date Completed:** 2025-10-07
**Tests:** 33/33 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/role-assignments` - List all role assignments
2. ✅ `POST /admin/role-assignments` - Create role assignment
3. ✅ `DELETE /admin/role-assignments/{assignmentId}` - Delete role assignment

#### Implementation:
- [x] Test file: `admin/role-assignments.test.ts`
- [x] Constants: `role-assignment.constants.ts`
- [x] Validation: `admin-role-assignment.schemas.ts`
- [x] Model: Added `findWithFilters` static method to `EnvironmentRoleAssignment.model.ts`
- [x] Service: `admin-role-assignment.service.ts`
- [x] Controller: `admin-role-assignment.controller.ts`
- [x] Routes: `admin-role-assignment.routes.ts`
- [x] Error constants: `ROLE_ASSIGNMENT_EXISTS`, `ROLE_ASSIGNMENT_NOT_FOUND`
- [x] Wired into main router (mounted at `/admin/role-assignments`)
- [x] Test constants: Added ASSIGNMENT_1, ASSIGNMENT_2, ASSIGNMENT_3, GROUP_2, GROUP_3

#### Key Features:
- **Filtering:** organizationId, environmentId, membershipId, groupId, roleId, assigneeType, createdAt, updatedAt
- **Sorting:** createdAt (default DESC), updatedAt, organizationId, environmentId, assigneeType
- **Search:** Full-text across role.name, organization.name, environment.name (via associations)
- **Field Selection:** Supported (all fields returned for complex associations)
- **Polymorphic Assignments:** Assigns roles to either members OR groups (mutually exclusive)
- **Duplicate Detection:** Prevents duplicate role assignments (409 Conflict)
- **Virtual Field:** `assigneeType` calculated from membershipId/groupId (member or group)

#### Test Coverage (33 tests):
**List (14 tests):**
- Pagination, filters (6 types: organizationId, environmentId, assigneeType=member, assigneeType=group, roleId, createdAt range), sorting (2 tests), search, field selection, auth, authorization, errors

**Create (15 tests):**
- Member assignment (201), group assignment (201), duplicate member (409), duplicate group (409), role not found (404), environment not found (404), member not found (404), group not found (404), validation (4 tests: roleId missing, environmentId missing, both provided, neither provided), auth, authorization

**Delete (4 tests):**
- Soft delete (204), auth (401), authorization (403), not found (404), database error (422)

#### Architectural Patterns:
- **Separation of Concerns:** All DB operations in model layer (no Op/sequelize imports in service)
- **Field Naming:** Consistent camelCase across all layers
- **Association Mapping:** Maps `membership` to `member` in response for API consistency
- **TDD Workflow:** RED (failing tests) → GREEN (implementation) → All passing
- **Polymorphic Relations:** Validates exactly one of membershipId or groupId via Joi .xor()

---

### 6.8 Admin Devices (4 endpoints) ✅
**File:** `admin/devices.test.ts`
**Date Completed:** 2025-10-08
**Tests:** 31/31 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/devices` - List all devices
2. ✅ `GET /admin/devices/{deviceId}` - Get device details
3. ✅ `PUT /admin/devices/{deviceId}` - Update device
4. ✅ `DELETE /admin/devices/{deviceId}` - Revoke device

#### Implementation:
- [x] Test file: `admin/devices.test.ts`
- [x] Constants: `device.constants.ts` (added filterable/sortable/searchable fields)
- [x] Model: `Device.findWithFilters()` for advanced filtering/search
- [x] Validation: `admin-device.schemas.ts`
- [x] Service: `admin-device.service.ts`
- [x] Controller: `admin-device.controller.ts`
- [x] Routes: `admin-device.routes.ts`
- [x] Wired into main router (mounted at `/admin/devices`)
- [x] Test constants: Added DEVICE_1, DEVICE_2, DEVICE_3

#### Key Features:
- **Filtering:** userId, trustStatus, deviceType, isRevoked, createdAt, lastUsedAt
- **Sorting:** name (deviceName), deviceType, trustStatus, createdAt, lastUsedAt
- **Search:** Full-text across deviceName, os, browser
- **Field Selection:** Optimized responses with API-to-DB field mapping
- **Security:** NEVER expose `fingerprintHash` (bcrypt hash - server-side only)
- **Device Revocation:** Soft delete via `revokedAt` timestamp (not hard delete)

#### Test Coverage (31 tests):
**List (13 tests):**
- Pagination, filters (5 types: userId, trustStatus, deviceType, isRevoked, createdAt range), sorting (name ASC, lastUsedAt DESC), search (deviceName), field selection, auth, authorization, errors

**Get (5 tests):**
- Success, auth, authorization, not found, database error

**Update (9 tests):**
- Update name, trustStatus, multiple fields, validation (2 tests: name too long, invalid trustStatus), auth, authorization, not found, database error

**Delete (4 tests):**
- Revoke (soft delete), auth, authorization, not found

#### Architectural Patterns:
- **Separation of Concerns:** All DB operations in model layer (no Op imports in service)
- **Field Naming:** Consistent camelCase across all layers (API `name` maps to DB `deviceName`)
- **Security Critical:** Never expose `fingerprintHash` in any API response
- **TDD Workflow:** RED (failing tests) → GREEN (implementation) → All passing
- **Field Mapping:** Controller maps API field names to DB field names for field selection

---

### 6.9 Admin Sessions (4 endpoints) ✅
**File:** `admin/sessions.test.ts`
**Date Completed:** 2025-10-08
**Tests:** 26/26 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/sessions` - List all sessions
2. ✅ `GET /admin/sessions/{sessionId}` - Get session details
3. ✅ `DELETE /admin/sessions/{sessionId}` - Revoke session
4. ✅ `DELETE /admin/sessions/user/{userId}` - Revoke all sessions for user

#### Implementation:
- [x] Test file: `admin/sessions.test.ts`
- [x] Constants: `session.constants.ts` (filterable/sortable/searchable fields)
- [x] Test constants: Added SESSION_1, SESSION_2, SESSION_3
- [x] Model: Added `findWithFilters` static method to `UserSession.model.ts`
- [x] Validation: `admin-session.schemas.ts`
- [x] Service: `admin-session.service.ts`
- [x] Controller: `admin-session.controller.ts`
- [x] Routes: `admin-session.routes.ts`
- [x] Wired into main router (mounted at `/admin/sessions`)

#### Key Features:
- **Filtering:** userId, deviceId, isActive, isRevoked, createdAt, lastAccessedAt, expiresAt
- **Sorting:** createdAt (default DESC), lastAccessedAt, expiresAt, requestCount, isActive
- **Search:** Full-text across userAgent, lastActivityType (excludes ipAddress due to INET type)
- **Field Selection:** Optimized responses
- **Security:** NEVER expose refreshTokenHash (bcrypt hash - server-side only)
- **Bulk Revocation:** Revoke all sessions for a user with single endpoint

#### Test Coverage (26 tests):
**List (13 tests):**
- Pagination, filters (5 types: userId, deviceId, isActive, isRevoked, createdAt range), sorting (2 tests: createdAt DESC, lastAccessedAt ASC), search (userAgent), field selection, auth, authorization, errors

**Get (5 tests):**
- Success, auth, authorization, not found, database error

**Revoke (4 tests):**
- Soft revoke, auth, authorization, not found

**Revoke All User Sessions (4 tests):**
- Success with count, auth, authorization, not found user

#### Architectural Patterns:
- **Separation of Concerns:** All DB operations in model layer (no Op imports in service)
- **Field Naming:** Consistent camelCase across all layers
- **Security Critical:** Never expose `refreshTokenHash` in any API response
- **TDD Workflow:** RED (failing tests) → GREEN (implementation) → All passing
- **Search Optimization:** Excluded INET type field (ipAddress) from search to avoid type casting issues

---

### 6.10 Admin Impersonation (5 endpoints) ✅
**File:** `admin/impersonation.test.ts`
**Date Completed:** 2025-10-08
**Tests:** 32/32 passing (100%)

#### Endpoints:
1. ✅ `POST /admin/users/{userId}/impersonate` - Start system-wide impersonation
2. ✅ `DELETE /admin/impersonation/end` - End impersonation (pop or terminate)
3. ✅ `GET /admin/impersonation/active` - Get active impersonation sessions
4. ✅ `GET /admin/impersonation-sessions` - List all impersonation sessions (history)
5. ✅ `DELETE /admin/impersonation-sessions/{sessionId}` - Force-end session

#### Implementation:
- [x] Test file: `admin/impersonation.test.ts`
- [x] Constants: `impersonation.constants.ts` (duration limits, filterable/sortable/searchable fields)
- [x] Model: Added `findWithFilters` static method to `UserImpersonationSession.model.ts`
- [x] Validation: `admin-impersonation.schemas.ts`
- [x] Service: `admin-impersonation.service.ts`
- [x] Controller: `admin-impersonation.controller.ts`
- [x] Routes: `admin-impersonation.routes.ts`
- [x] Wired into main router (mounted at `/admin`)
- [x] Test helper: Added `clearUserPermissions()` to `auth.helpers.ts`

#### Key Features:
- **Filtering:** originalUserId, impersonatedUserId, environmentId, impersonationType, isActive, date ranges (startedAt, expiresAt, endedAt)
- **Sorting:** startedAt (default DESC), expiresAt, endedAt, impersonationType
- **Search:** Full-text across reason field
- **Field Selection:** API-to-DB field mapping (sessionId → id)
- **Duration Limits:** MIN (5 minutes), DEFAULT (60 minutes), MAX (480 minutes/8 hours)
- **Impersonation Types:** system (admin-initiated), organization (org-scoped)
- **Security:** Full audit trail with reason, IP address, user agent

#### Test Coverage (32 tests):
**POST /admin/users/{userId}/impersonate (9 tests):**
- Success (201), default duration, missing reason (422), invalid duration (422), duration too short (422), self-impersonation (400), non-existent user (404), unauthenticated (401), unauthorized (403)

**DELETE /admin/impersonation/end (3 tests):**
- Success with session end (200), not impersonating (400), unauthenticated (401)

**GET /admin/impersonation/active (4 tests):**
- Active sessions (200), empty array when none active (200), unauthenticated (401), unauthorized (403)

**GET /admin/impersonation-sessions (11 tests):**
- Pagination (200), filter by type (200), filter by isActive (200), filter by originalUserId (200), filter by impersonatedUserId (200), filter by date range (200), sort by startedAt DESC (200), search in reason (200), field selection (200), unauthenticated (401), unauthorized (403), database error (500)

**DELETE /admin/impersonation-sessions/{sessionId} (4 tests):**
- Force-end success (204), unauthenticated (401), unauthorized (403), non-existent session (404)

#### Architectural Patterns:
- **Separation of Concerns:** All DB operations in model layer (no Op imports in service)
- **Field Naming:** Consistent camelCase across all layers
- **TDD Workflow:** RED (failing tests) → GREEN (implementation) → All passing
- **Date Range Filtering:** Fixed Symbol key detection bug in Object.keys() - used Object.getOwnPropertySymbols()
- **Field Selection:** Proper API-to-DB field mapping for Sequelize attributes

#### Bug Fixes During Implementation:
1. **Date Range Filters Not Working:** Fixed `Object.keys()` not detecting Sequelize Op symbols - added `Object.getOwnPropertySymbols()` check
2. **Authorization Tests Failing:** Fixed `clearAllPermissions()` preserving admin user permissions - used `clearUserPermissions(userId)` instead
3. **Field Selection 500 Error:** Added API-to-DB field mapping (sessionId → id) before passing to Sequelize
4. **Transform Function Crash:** Made `transformSessionResponse()` handle partial field selection gracefully

---

### 6.11 Admin Events (2 endpoints) ✅
**File:** `admin/events.test.ts`
**Date Completed:** 2025-10-08
**Tests:** 19/19 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/events` - List all events system-wide (cursor pagination)
2. ✅ `GET /admin/events/{eventId}` - Get event details

#### Implementation:
- [x] Test file: `admin/events.test.ts`
- [x] Constants: `event.constants.ts` (filterable/sortable/searchable fields)
- [x] Model: Added `findWithFilters` static method to `Event.model.ts`
- [x] Validation: `admin-event.schemas.ts`
- [x] Service: `admin-event.service.ts`
- [x] Controller: `admin-event.controller.ts`
- [x] Routes: `admin-event.routes.ts`
- [x] Wired into main router (mounted at `/admin/events`)
- [x] Test constants: Added EVENT_1, EVENT_2, EVENT_3, EVENT_NONEXISTENT

#### Key Features:
- **Cursor Pagination:** Designed for high-volume scenarios (10M+ records)
- **Filtering:** verb (eq, in), actorType, actorId, organizationId (eq, in), environmentId (eq, in), isWebhookEvent, timestamp range (gte, lte, gt, lt, eq, ne)
- **Sorting:** timestamp (default DESC), verb, actorType
- **Search:** Full-text across description and verb fields
- **Field Selection:** Optimized responses
- **Security:** Read-only endpoint (no modification of events)
- **Denormalized Fields:** organizationName, environmentName always included for context

#### Test Coverage (19 tests):
**List (14 tests):**
- Pagination with cursor (limit, nextCursor, hasMore)
- Filters (7 types: verb, verbIn, actorType, organizationId, environmentId, isWebhookEvent, timestamp range)
- Sorting (timestamp DESC)
- Search (description)
- Field selection
- Auth (401)
- Authorization (403)
- Database errors

**Get (5 tests):**
- Success with full event details (actor, object, target, audit, denormalized fields)
- Auth (401)
- Authorization (403)
- Not found (404)
- Database errors

#### Architectural Patterns:
- **Separation of Concerns:** All DB operations in model layer (no Op imports in service)
- **Field Naming:** Consistent camelCase across all layers
- **Cursor Pagination:** Uses timestamp + id for deterministic ordering
- **TDD Workflow:** RED (failing tests) → GREEN (implementation) → All passing
- **Cleanup:** Explicit model destroy instead of sequelize.truncate for test isolation

#### Notes:
- Events are **read-only** - no create, update, or delete endpoints (system-generated only)
- Uses UUIDV1 for event IDs (time-based for chronological ordering)
- Audit trail includes HTTP metadata (IP, user agent, method, path, status, response time)
- Actor field includes impersonation context when applicable
- Tests run with `--runInBand` for isolation (parallel execution causes PK conflicts)

---

### 6.12 Admin Event Types (5 endpoints) ✅
**File:** `admin/event-types.test.ts`
**Date Completed:** 2025-10-08
**Tests:** 43/43 passing (100%)

#### Endpoints:
1. ✅ `GET /admin/event-types` - List all event types
2. ✅ `POST /admin/event-types` - Create event type
3. ✅ `GET /admin/event-types/{eventTypeId}` - Get event type details
4. ✅ `PUT /admin/event-types/{eventTypeId}` - Update event type
5. ✅ `DELETE /admin/event-types/{eventTypeId}` - Delete event type

#### Implementation:
- [x] Test file: `admin/event-types.test.ts`
- [x] Constants: `event-type.constants.ts` (filterable/sortable/searchable fields)
- [x] Model: `EventType.findWithFilters()` for advanced filtering/search
- [x] Validation: `admin-event-type.schemas.ts`
- [x] Service: `admin-event-type.service.ts`
- [x] Controller: `admin-event-type.controller.ts`
- [x] Routes: `admin-event-type.routes.ts`
- [x] Error constant: `EVENT_TYPE_EXISTS`
- [x] Wired into main router (mounted at `/admin/event-types`)
- [x] Migration: Updated webhook and webhook_delivery schema (verb → event_type_id FK)

#### Key Features:
- **Filtering:** organizationId, verb, isActive, isWebhookEvent, createdAt, updatedAt
- **Sorting:** name, verb, createdAt, updatedAt, isActive
- **Search:** Full-text across name, description, verb
- **Field Selection:** Optimized responses
- **Duplicate Detection:** Prevents duplicate org+verb combinations (409 Conflict)
- **Schema Migration:** Updated webhook tables to reference event_type_id instead of verb string

#### Test Coverage (43 tests):
**List (13 tests):**
- Pagination, filters (5 types: organizationId, verb, isActive, isWebhookEvent, createdAt range), sorting (name ASC, createdAt DESC), search (name, description), field selection, auth, authorization, database errors

**Create (10 tests):**
- Success (201), duplicate org+verb (409), validation (5 tests: name required, verb required, name max length, description max length, invalid verb format), auth, authorization, database error

**Get (5 tests):**
- Success, auth, authorization, not found, database error

**Update (10 tests):**
- Update name, description, isActive, isWebhookEvent, multiple fields, duplicate verb (409), validation (2 tests), auth, authorization, not found, database error

**Delete (5 tests):**
- Soft delete, auth, authorization, not found, database error

#### Architectural Patterns:
- **Separation of Concerns:** All DB operations in model layer (no Op imports in service)
- **Field Naming:** Consistent camelCase across all layers
- **TDD Workflow:** RED (failing tests) → GREEN (implementation) → All passing
- **Composite Unique Constraint:** organizationId + verb (enforced at DB level)
- **Schema Evolution:** Migration updated webhook tables to use event_type_id FK for data integrity

---

## Test Pattern Template

Each admin endpoint follows this test structure (6 tests per endpoint):

1. **Success case** (200/201/204) - Happy path
2. **Authentication** (401) - No/invalid token
3. **Authorization** (403) - Lacks admin permission
4. **Not Found** (404) - Resource doesn't exist (if applicable)
5. **Validation** (422) - Invalid input
6. **Server Error** (500) - Database/system error

Additional tests for:
- Pagination, filtering, sorting, search (list endpoints)
- Field selection (list endpoints)
- Conflict errors (409) - Duplicate unique fields
- Business logic validation

---

## Architecture Patterns

### Service Layer Pattern
```typescript
// Admin service separated from tenant service
class AdminResourceService {
  async listResources(options: ListOptions) {
    // System-wide queries (no tenant filtering)
    // Pagination, filtering, sorting, search
  }

  async getResourceById(id: string) {
    // Direct lookup by ID
  }

  async updateResource(id: string, data: UpdateDto) {
    // Validation, conflict detection
  }

  async deleteResource(id: string) {
    // Soft delete (paranoid mode)
  }
}
```

### Controller Pattern
```typescript
// Extract params, delegate to service, transform response
export const listResources = asyncHandler(async (req, res) => {
  const { limit, offset, sort, search, fields } = parseQuery(req.query);
  const filters = parseFilters(req.query);

  const { resources, total } = await service.listResources({
    limit, offset, sort, search, fields, filters
  });

  res.status(200).json({
    data: resources.map(transformResponse),
    pagination: { limit, offset, total, hasMore: offset + limit < total }
  });
});
```

### Validation Pattern
```typescript
// Query params for list endpoints
export const listResourcesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sort: Joi.string().optional(),
  search: Joi.string().min(1).max(200).optional(),
  fields: Joi.string().optional(),
  // Filters with operators
  'filter[fieldName]': Joi.string().optional(),
  'filter[createdAt][gte]': Joi.date().iso().optional(),
  // ... more filters
}).options({ allowUnknown: false });
```

---

## Remaining Sub-Batches ⏭️

---

### 6.12.1 Event Type Subscription Helper Table ✅
**Date Completed:** 2025-10-08
**Status:** Schema and OpenAPI spec complete (no implementation yet)

#### Purpose:
Reverse-lookup table to facilitate fast **event → webhook** lookups without expensive joins.
This is a **denormalized helper table** automatically populated by webhook model triggers.

#### How It Works:
When a webhook is created/updated with `event_types = ['user.created', 'user.updated']`:
1. Webhook model creates **2 subscription records** (one per event type)
2. Each record denormalizes webhook fields (name, url, auth config, retry config)
3. When an event occurs, system queries subscriptions by `event_type_verb` to find matching webhooks
4. Avoids N+1 queries and joins for webhook delivery at scale

#### Database Schema:
**Table:** `event_type_subscription`
- **Columns:** id, event_type_id, event_type_verb (denormalized), webhook_id, webhook_name, webhook_url, webhook_auth_method, webhook_auth_config, webhook_retry_config, webhook_metadata, is_active, created_at, updated_at
- **Indexes:** Partial indexes on event_type_id, event_type_verb (WHERE is_active = TRUE), plus indexes on webhook_id, webhook_name, webhook_url
- **Unique Constraint:** (event_type_id, webhook_id) - prevents duplicate subscriptions
- **Foreign Keys:** event_type_id → event_type.id, webhook_id → webhook.id (CASCADE DELETE)

#### OpenAPI Spec:
**Endpoint:** `GET /admin/event-type-subscriptions`
- **Permission:** `admin:event-types:read`
- **Filters:** eventTypeId, eventTypeVerb, webhookId, webhookName, webhookUrl, isActive, createdAt, updatedAt
- **Sorting:** eventTypeVerb, webhookName, webhookUrl, createdAt, updatedAt, isActive
- **Search:** Full-text across eventTypeVerb, webhookName, webhookUrl
- **Pagination:** Offset-based (limit/offset)
- **Purpose:** Monitoring/debugging webhook subscriptions (read-only)

#### Implementation Files:
- [x] Migration: `migrations/20251003235905-create-core-schema.ts` (Table 19)
- [x] OpenAPI Path: `api-docs/paths/admin-event-type-subscriptions.yaml`
- [x] OpenAPI Schema: `api-docs/components/schemas/event-type-subscription.yaml`
- [x] Index.yaml updated with tag and path reference
- [ ] Model: `EventTypeSubscription.model.ts` (to be created in batch 6.13)
- [ ] Service: Auto-managed by Webhook service (no dedicated service needed)
- [ ] Controller: `admin-event-type-subscription.controller.ts` (to be created)
- [ ] Routes: `admin-event-type-subscription.routes.ts` (to be created)
- [ ] Tests: To be added as part of webhook implementation

#### Relationship to Webhooks:
This table is **tightly coupled** with the webhook lifecycle:
- **CREATE webhook:** Webhook service splits `event_types[]` array → creates N subscription records
- **UPDATE webhook:**
  - If `event_types` added: Create new subscriptions
  - If `event_types` removed: Delete subscriptions
  - If webhook fields change: Update all related subscriptions (denormalized fields)
  - If `is_active` changes: Update all subscription.is_active flags
- **DELETE webhook:** CASCADE DELETE removes all subscriptions automatically (FK constraint)

#### Query Pattern (Event Delivery):
```sql
-- When event occurs with verb = 'user.created':
SELECT webhook_id, webhook_url, webhook_auth_method, webhook_auth_config, webhook_retry_config
FROM event_type_subscription
WHERE event_type_verb = 'user.created'
  AND is_active = TRUE;

-- Returns all webhooks subscribed to this event type (denormalized, no joins needed)
```

---

### 6.13 Admin Webhooks - Part 1 (6 endpoints) 🔧
**File:** `admin/webhooks.test.ts`
**Date Started:** 2025-10-08
**Tests:** 68 tests written (RED phase complete)
**Status:** In Progress - RED phase complete, implementing GREEN phase

#### Endpoints (CRUD operations + Subscriptions):
1. ✅ `GET /admin/webhooks` - List all webhooks system-wide (13 tests)
2. ✅ `POST /admin/webhooks` - Create webhook (admin-level) (12 tests)
3. ✅ `GET /admin/webhooks/{webhookId}` - Get webhook details (5 tests)
4. ✅ `PUT /admin/webhooks/{webhookId}` - Update webhook (11 tests)
5. ✅ `DELETE /admin/webhooks/{webhookId}` - Delete webhook (4 tests)
6. ✅ `GET /admin/event-type-subscriptions` - List subscriptions (11 tests)

#### Implementation Checklist:
- [x] Test file: `admin/webhooks.test.ts` (68 tests - RED phase complete)
- [x] Test constants: Added WEBHOOK_1, WEBHOOK_2, WEBHOOK_3, WEBHOOK_NONEXISTENT, ENV_PROD
- [x] Constants: Updated `webhook.constants.ts` with filterable/sortable/searchable fields
- [x] Constants: Added SUBSCRIPTION_* constants for event type subscriptions
- [x] Model: Added `Webhook.findWithFilters()` static method
- [x] Model: Created `EventTypeSubscription.model.ts` with full CRUD methods
  - `findWithFilters()` for admin queries
  - `createForWebhook()` - bulk create subscriptions from event_types array
  - `deleteForWebhookEventTypes()` - cleanup on event_types removal
  - `updateWebhookFields()` - sync denormalized fields
  - `findActiveByEventTypeVerb()` - webhook delivery query
- [ ] Validation: `admin-webhook.schemas.ts`
- [ ] Validation: `admin-event-type-subscription.schemas.ts`
- [ ] Service: `admin-webhook.service.ts`
  - **CRITICAL:** Service must manage event_type_subscription lifecycle
  - On CREATE: Call `EventTypeSubscription.createForWebhook()`
  - On UPDATE: Sync event_types changes (add/remove subscriptions)
  - On DELETE: Cascade handled by FK, but may need explicit cleanup
- [ ] Service: `admin-event-type-subscription.service.ts`
- [ ] Controller: `admin-webhook.controller.ts`
- [ ] Controller: `admin-event-type-subscription.controller.ts`
- [ ] Routes: `admin-webhook.routes.ts`
- [ ] Routes: `admin-event-type-subscription.routes.ts`
- [ ] Wire into main router

#### Key Features Implemented:
- **Filtering:** environmentId, isActive, authMethod, createdAt, updatedAt, lastSuccessAt, lastFailureAt
- **Sorting:** createdAt (default DESC), updatedAt, lastSuccessAt, lastFailureAt, failureCount, url, name
- **Search:** Full-text across url, name, eventTypes
- **Field Selection:** Optimized responses
- **Subscription Management:** Denormalized reverse-lookup table for fast event → webhook queries
- **Model Layer:** All DB operations isolated per SOC (no Op imports in service)

#### Test Coverage (68 tests):
**GET /admin/webhooks (13 tests):**
- Pagination, filters (5 types: environmentId, isActive, authMethod, createdAt range), sorting (2 tests), search, field selection, auth (401), authorization (403), database error (422)

**POST /admin/webhooks (12 tests):**
- Success (201), defaults, validation (6 tests: name missing, url missing, url not HTTPS, eventTypes empty, authMethod invalid, retryConfig.maxAttempts exceeds limit), environment not found (404), auth (401), authorization (403)

**GET /admin/webhooks/{webhookId} (5 tests):**
- Success, auth (401), authorization (403), not found (404), database error (422)

**PUT /admin/webhooks/{webhookId} (11 tests):**
- Update name, url, eventTypes, isActive, multiple fields, validation (2 tests: url not HTTPS, eventTypes empty), auth (401), authorization (403), not found (404), database error (422)

**DELETE /admin/webhooks/{webhookId} (4 tests):**
- Soft delete (204), auth (401), authorization (403), not found (404)

**GET /admin/event-type-subscriptions (11 tests):**
- Pagination, filters (3 types: eventTypeVerb, webhookId, isActive), sorting, search, field selection, auth (401), authorization (403), database error (422)

#### Architectural Patterns:
- **TDD Workflow:** RED phase complete (tests written and failing) → GREEN phase next (implementation)
- **Separation of Concerns:** All DB operations in model layer (no Op/sequelize imports in service)
- **Field Naming:** Consistent camelCase across all layers
- **Denormalization:** EventTypeSubscription table for <200ms SLO (avoid joins)
- **Subscription Lifecycle:** Model provides static methods for webhook service to manage subscriptions

---

### 6.14 Admin Webhooks - Part 2 (3 endpoints)
**File:** `admin/webhook-deliveries.test.ts` or combined with Part 1
**Estimated Tests:** ~18

#### Endpoints (Delivery management):
1. `GET /admin/webhooks/{webhookId}/deliveries` - List webhook deliveries
2. `GET /admin/webhook-deliveries/{deliveryId}` - Get delivery details
3. `POST /admin/webhook-deliveries/{deliveryId}/retry` - Retry failed delivery

**Status:** Not started

#### Implementation Checklist:
- [ ] Test file: `admin/webhook-deliveries.test.ts`
- [ ] Constants: `webhook-delivery.constants.ts` (if not exists)
- [ ] Model: Add `WebhookDelivery.findWithFilters()` if needed
- [ ] Validation: `admin-webhook-delivery.schemas.ts`
- [ ] Service: Update `admin-webhook.service.ts` or create separate service
- [ ] Controller: Update `admin-webhook.controller.ts` or create separate controller
- [ ] Routes: Add delivery routes to `admin-webhook.routes.ts`
- [ ] Wire into main router

#### Key Features (Expected):
- **Filtering:** webhookId, eventId, status, httpStatusCode, createdAt, deliveredAt
- **Sorting:** createdAt (default DESC), deliveredAt, responseTimeMs, httpStatusCode
- **Search:** Full-text across requestUrl
- **Field Selection:** Optimized responses
- **Retry Logic:** Re-queue failed deliveries with exponential backoff
- **Delivery Status:** pending, success, failed, retrying

---

## Next Steps

**Current Focus:** Admin Webhooks (Batches 6.13 & 6.14) - FINAL BATCHES

**Planning Notes:**
- ✅ **Helper table added:** event_type_subscription (reverse-lookup for event → webhook)
- Webhooks split into 2 batches for easier code review
- Part 1: Core webhook CRUD operations + event_type_subscription GET endpoint + subscription lifecycle management
- Part 2: Delivery tracking and retry functionality

**Estimated Remaining Effort:**
- 7 endpoints remaining:
  - 5 webhook CRUD endpoints
  - 1 event_type_subscription GET endpoint
  - 3 delivery management endpoints (Part 2)
- ~42 tests to write
- Estimated: 2-3 hours of implementation

**Progress:** 88.7% complete (55/62 endpoints)

**IMPORTANT for Webhook Implementation:**
The webhook service must manage the event_type_subscription table lifecycle:
1. **On webhook CREATE:** Parse `event_types[]` array, create one subscription record per event type
2. **On webhook UPDATE:** Compare old vs new `event_types[]`, add/remove subscriptions as needed, sync denormalized fields
3. **On webhook DELETE:** CASCADE DELETE handles subscriptions via FK constraint
4. **Query optimization:** Use subscriptions table for fast event → webhook lookups (no joins)

---

## Reference Files

- **Tenant Progress:** `TEST_TENANT_IMPLEMENTATION_PROGRESS.md`
- **Standards:** `src/{component}/STANDARDS.md`
- **API Spec:** `api-docs/index.yaml`
- **Entity Model:** `docs/ENTITY_MODEL.md`
- **JWT Structure:** `docs/JWT_TOKEN_STRUCTURE.md`
