# JWT Token Structure

**Last Updated:** 2025-10-04

This document provides comprehensive details on JWT token structure for both standard and impersonation scenarios.

---

## Standard JWT Token (Non-Impersonation)

Used for normal user authentication and authorization.

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

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `sub` | UUID | User ID (subject of the token) |
| `orgId` | UUID | Organization ID from user's `last_org_id` |
| `envId` | UUID | Environment ID from user's `last_env_id` |
| `user` | Object | User display information |
| `user.fullName` | String | User's full name (given + family) |
| `user.email` | String | User's email address |
| `iat` | Number | Issued at timestamp (Unix epoch seconds) |
| `exp` | Number | Expiration timestamp (Unix epoch seconds) |

---

## Impersonation JWT Token

Used when one user is impersonating another. Includes full chain tracking for nested impersonation.

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

### Impersonation Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `sub` | UUID | **Effective user ID** (impersonated user, not impersonator) |
| `impersonation` | Object | Present only during active impersonation |
| `impersonation.originalUserId` | UUID | ID of the user performing impersonation |
| `impersonation.effectiveUserId` | UUID | ID of the impersonated user (same as `sub`) |
| `impersonation.impersonationChain` | Array | Chain of impersonation sessions (supports nesting) |

### Impersonation Chain Entry

Each entry in the `impersonationChain` array represents one level of impersonation:

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | UUID | Impersonation session ID for audit trail |
| `userId` | UUID | User ID at this level of the chain |
| `startedAt` | ISO 8601 | Timestamp when impersonation started |
| `impersonationType` | Enum | `'system'` or `'organization'` |
| `permissions` | JSONB | Reserved for future permission overrides (currently null) |

---

## Impersonation Types

### System Impersonation

**Permission Required:** `system:admin` or `admin:users:impersonate`

**Scope:** ANY user across ANY organization/environment

**Use Cases:**
- Customer support troubleshooting
- System administration
- Security investigations

**Restrictions:**
- None (full system access)
- Cannot impersonate self (database constraint)
- Requires audit trail (`reason` field mandatory)

### Organization Impersonation

**Permission Required:** `members:manage` or `members:impersonate`

**Scope:** Users in subordinate groups only

**Use Cases:**
- Manager assisting team member
- Department head troubleshooting user issues
- Hierarchical delegation

**Restrictions:**
- Can only impersonate users in child groups (lower `hierarchy_level`)
- Cannot impersonate self, peers (same level), or superiors (higher level)
- Limited to organization/environment context
- Requires audit trail (`reason` field mandatory)

---

## Session Chaining

Multi-level impersonation is supported for complex organizational scenarios:

**Example Chain:** Admin → Manager → User

```
Admin (Original)
  ↓ starts system impersonation
Manager (Level 1)
  ↓ starts organization impersonation
User (Level 2 - Effective)
```

### Chain Tracking

Each level is tracked via `parent_session_id` in the `user_impersonation_session` table:

| Session | Original User | Effective User | Parent Session |
|---------|---------------|----------------|----------------|
| Session A | Admin | Manager | NULL |
| Session B | Manager | User | Session A |

### Pop Operation

The **pop** operation ends the current impersonation level and reverts to the parent:

1. Ends Session B (Manager → User)
2. Reactivates Session A (Admin → Manager)
3. Issues new JWT with Manager as effective user
4. Preserves full chain in `impersonationChain` array

---

## Token Usage in Requests

### Standard Request

```http
GET /api/v1/users/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Middleware Behavior

1. **Authentication Middleware** (`authenticate`):
   - Verifies JWT signature
   - Checks expiration
   - Attaches decoded payload to `req.user`

2. **Context Validation** (`validateTenantContext`):
   - Verifies `orgId` in URL matches `req.user.orgId`
   - Verifies `envId` in URL matches `req.user.envId`
   - Prevents cross-tenant access

3. **Authorization Middleware** (`authorize`):
   - Checks effective user permissions
   - During impersonation, checks `effectiveUserId` permissions
   - Respects permission overrides in impersonation context

---

## Event Logging & Audit Trail

All operations during impersonation are logged with full context:

### Event Actor Field (JSONB)

```json
{
  "id": "effectiveUserId",
  "type": "User",
  "name": "Impersonated User Name",
  "email": "impersonated@example.com",
  "impersonationContext": {
    "isImpersonated": true,
    "originalUserId": "impersonatorUserId",
    "originalUserName": "Impersonator Name",
    "originalUserEmail": "impersonator@example.com",
    "impersonationType": "system",
    "sessionId": "uuid",
    "chainDepth": 1,
    "fullChain": [
      {
        "sessionId": "uuid",
        "userId": "userId",
        "startedAt": "2025-10-03T03:44:10.592Z",
        "impersonationType": "system",
        "permissions": null
      }
    ]
  }
}
```

### CloudEvents 1.0.2 Message Queue

All events are published to the message queue with complete impersonation metadata:

- `originalUserId` - Who initiated the action
- `effectiveUserId` - Whose account was used
- `impersonationChain` - Complete audit trail
- HTTP context (request/response/headers/IP/user agent)

---

## Security & Compliance

### Required Fields

All impersonation sessions require:
- `reason` (TEXT) - Justification for audit compliance
- `ip_address` (TEXT) - Captured from request
- `user_agent` (TEXT) - Captured from request headers

### Session Duration

- Default: 1 hour (configurable)
- System maximum: 8 hours (enforced)
- Can be terminated early by:
  - User ending session
  - Admin force-terminating session
  - Session expiration

### Database Constraints

- Cannot impersonate self: `original_user_id <> impersonated_user_id`
- Parent session must exist for chained impersonation
- Session marked inactive on termination (`is_active = false`, `ended_at` timestamp)

---

## Token Generation & Refresh

### Initial Token Generation

1. User authenticates (magic link or OAuth)
2. Device fingerprint verified/created
3. Session created in database
4. JWT issued with user's `last_org_id` and `last_env_id`

### Token Refresh

1. Client sends refresh token (from cookie or body)
2. Server verifies refresh token against active session
3. Session updated with new `last_activity_at`
4. New JWT issued with updated expiration
5. New refresh token issued (optional rotation)

### Context Switching

1. User requests switch to different org/env
2. Server validates access (membership check)
3. User record updated (`last_org_id`, `last_env_id`)
4. New JWT issued with new context
5. Old JWT remains valid until expiration (revoke if needed)

---

## Reference Implementation

See the following files for implementation details:

- **Middleware:** `src/middleware/auth.middleware.ts`
- **Service:** `src/services/auth/jwt.service.ts`
- **Model:** `src/models/UserImpersonationSession.model.ts`
- **Event Logging:** `src/services/event.service.ts`
- **Tests:** `src/__tests__/integration/auth.test.ts`
