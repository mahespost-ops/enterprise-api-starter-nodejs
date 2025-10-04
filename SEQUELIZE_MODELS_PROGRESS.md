# Sequelize Models Implementation Progress

**Status:** Partial completion - 14 of 19 models created
**Last Updated:** 2025-10-04
**Next Steps:** Complete remaining 5 models, create associations, update service layer

---

## ✅ Completed Models (14/19)

### Authentication & Identity (5/5)
- [x] **User.model.ts** - OIDC-compliant core identity
  - Fields: email, phoneNumber, givenName, familyName, profile fields
  - Methods: `findByEmail()`, `findByPhone()`, `findByIdentifier()`
  - Features: Soft deletes, E.164 phone validation, fullName getter

- [x] **ExternalIdentity.model.ts** - OAuth/SSO providers
  - Providers: Google, Microsoft, Okta, Auth0, GitHub, SAML
  - Token storage: encrypted access/refresh tokens, ID token
  - Relationship: belongsTo User (CASCADE delete)

- [x] **MagicLinkToken.model.ts** - Passwordless authentication
  - Fields: tokenHash, codeHash, fingerprint, expiresAt, usedAt
  - Methods: `findByTokenHash()`, `findByCodeHash()`, `markAsUsed()`
  - Features: Unique index on token_hash, expiration checking

- [x] **Device.model.ts** - Device fingerprinting & trust
  - Fields: fingerprintHash, deviceType, os, browser, trustStatus
  - Trust statuses: trusted, pending, revoked
  - Geolocation: firstSeenIp, lastSeenIp, country, region, city

- [x] **UserSession.model.ts** - Active sessions
  - Fields: refreshTokenHash, ipAddress, geoLocation (JSONB), requestCount
  - Methods: `findByRefreshTokenHash()`, `revoke()`, `updateActivity()`
  - Features: Activity tracking, revocation with reason

### Multi-Tenancy (3/3)
- [x] **Organization.model.ts** - Tenant entity
  - Fields: name, slug, contact info, address, metadata (JSONB)
  - Methods: `findBySlug()`
  - Validation: ISO 3166-1 alpha-2 country, E.164 phone
  - Circular FK: defaultEnvId ↔ environment.id

- [x] **Environment.model.ts** - Org environments
  - Types: live, sandbox
  - Fields: name, type, description, isDefault, metadata (JSONB)
  - Unique constraint: (organization_id, name)

- [x] **OrganizationMember.model.ts** - User-org membership
  - Fields: lastOrgId, lastEnvId (for JWT context)
  - Statuses: active, invited, suspended
  - Features: Invitation tokens with expiration
  - Unique constraint: (organization_id, user_id)

### RBAC (6/6)
- [x] **Group.model.ts** - Hierarchical groups
  - Fields: parentId, hierarchyLevel, memberCount
  - Self-parent validation: `noSelfParent()` check
  - Features: Denormalized member count for performance

- [x] **GroupMember.model.ts** - User-group membership
  - Fields: groupId, userId, addedBy
  - Unique constraint: (group_id, user_id)

- [x] **Role.model.ts** - RBAC roles
  - Fields: name, description, isSystem, permissionCount
  - Features: Denormalized permission count
  - System roles: Cannot be deleted if isSystem=true

- [x] **Permission.model.ts** - Granular permissions
  - Fields: key, name, resource, action
  - Actions: read, manage, assign
  - Key format: `{resource}:{action}` (e.g., "devices:read")

- [x] **RolePermission.model.ts** - M:N role-permission
  - Junction table between roles and permissions
  - Unique constraint: (role_id, permission_id)

- [x] **EnvironmentRoleAssignment.model.ts** - Polymorphic assignments
  - Assigns roles to either membershipId OR groupId (XOR constraint)
  - Scoped by environmentId
  - Validation: `memberOrGroupOnly()` check

---

## ⏳ Remaining Models (5/19)

### Impersonation (1/1)
- [ ] **UserImpersonationSession.model.ts**
  - Fields: originalUserId, impersonatedUserId, parentSessionId
  - Types: system (admin), organization (hierarchy-restricted)
  - Features: Chained impersonation, reason tracking
  - Constraint: Cannot impersonate self

### Events & Webhooks (4/4)
- [ ] **EventType.model.ts**
  - Maps HTTP endpoints (method + path) to event verbs
  - Fields: verb, httpMethod, httpPath, isWebhookEvent

- [ ] **Event.model.ts** - W3C Activity Streams
  - Fields: verb, actor (JSONB), object (JSONB), target (JSONB), audit (JSONB)
  - Denormalized: organizationId, organizationName, environmentName
  - Indexes: GIN on JSONB, cursor pagination (timestamp DESC, id DESC)
  - Scale target: 100M+ records

- [ ] **Webhook.model.ts** - CloudEvents 1.0.2
  - Fields: url, eventTypes (ARRAY), authMethod, retryConfig (JSONB)
  - Auth methods: none, hmac, jwt, basic, digest
  - Features: Delivery tracking, retry configuration

- [ ] **WebhookDelivery.model.ts** - Delivery tracking
  - Fields: status, attempt, httpStatusCode, requestPayload (JSONB)
  - Statuses: pending, success, failed, retrying
  - Features: Retry scheduling, response tracking

---

## 🔧 Pending Tasks

### 1. Model Associations (High Priority)
Create `src/models/associations.ts` to define all relationships:

**User relationships:**
- User.hasMany(ExternalIdentity)
- User.hasMany(MagicLinkToken)
- User.hasMany(Device)
- User.hasMany(UserSession)
- User.belongsToMany(Organization, through: OrganizationMember)
- User.belongsToMany(Group, through: GroupMember)

**Organization relationships:**
- Organization.hasMany(Environment)
- Organization.belongsTo(Environment, as: 'defaultEnvironment')
- Organization.hasMany(OrganizationMember)
- Organization.hasMany(Group)

**Environment relationships:**
- Environment.belongsTo(Organization)
- Environment.hasMany(EnvironmentRoleAssignment)

**RBAC relationships:**
- Role.belongsToMany(Permission, through: RolePermission)
- Permission.belongsToMany(Role, through: RolePermission)
- Group.belongsTo(Group, as: 'parent')
- Group.hasMany(Group, as: 'children')

### 2. Model Hooks (Medium Priority)
Add hooks for denormalization and counter maintenance:

**Group hooks:**
- `afterCreate/afterDestroy` on GroupMember → update Group.memberCount

**Role hooks:**
- `afterCreate/afterDestroy` on RolePermission → update Role.permissionCount

**Event hooks:**
- `beforeCreate` → denormalize org/env names from foreign keys

### 3. Scopes & Query Helpers (Medium Priority)
Add default scopes and query methods:

**User scopes:**
- `defaultScope`: exclude deleted, only active
- `withProfile`: include external identities
- `withSessions`: include active sessions

**Organization scopes:**
- `active`: isActive = true, not deleted
- `withMembers`: include organization_member count

**Event scopes:**
- `recent`: order by timestamp DESC
- `byVerb(verb)`: filter by event type
- `webhook`: only webhook events

### 4. Index File (High Priority)
Create `src/models/index.ts` to export all models:
```typescript
export { User } from './User.model';
export { ExternalIdentity } from './ExternalIdentity.model';
// ... etc
export { default as sequelize } from '../config/database';
```

### 5. Service Layer Updates (Critical)
Update services to use Sequelize API instead of mock API:

**auth.service.ts:**
- ✅ Model imports updated (User, MagicLinkToken, UserSession, etc.)
- ❌ Method calls need refactoring:
  - `MagicLinkToken.findByToken()` → needs implementation
  - `MagicLinkToken.delete()` → use `destroy()`
  - `MagicLinkToken.markAsUsed()` → method exists, needs token lookup first
  - `UserSession.findAll()` → avoid in production (use findByRefreshTokenHash)
  - `Organization.exists()` → use `findByPk()` instead
  - `Environment.exists()` → use `findByPk()` instead
  - Field name mappings: `firstName` → `givenName`, `phone` → `phoneNumber`

---

## 📊 Database Schema Coverage

| Table | Model Created | Associations | Hooks | Scopes |
|-------|--------------|--------------|-------|--------|
| user | ✅ | ⏳ | ⏳ | ⏳ |
| external_identity | ✅ | ⏳ | N/A | ⏳ |
| magic_link_token | ✅ | ⏳ | N/A | N/A |
| device | ✅ | ⏳ | N/A | ⏳ |
| user_session | ✅ | ⏳ | N/A | ⏳ |
| organization | ✅ | ⏳ | N/A | ⏳ |
| environment | ✅ | ⏳ | N/A | ⏳ |
| organization_member | ✅ | ⏳ | N/A | ⏳ |
| group | ✅ | ⏳ | ✅ (count) | ⏳ |
| group_member | ✅ | ⏳ | N/A | N/A |
| role | ✅ | ⏳ | ✅ (count) | ⏳ |
| permission | ✅ | ⏳ | N/A | N/A |
| role_permission | ✅ | ⏳ | N/A | N/A |
| environment_role_assignment | ✅ | ⏳ | N/A | ⏳ |
| user_impersonation_session | ❌ | ⏳ | N/A | ⏳ |
| event_type | ❌ | ⏳ | N/A | N/A |
| event | ❌ | ⏳ | ✅ (denorm) | ✅ |
| webhook | ❌ | ⏳ | N/A | ⏳ |
| webhook_delivery | ❌ | ⏳ | N/A | ⏳ |

**Legend:** ✅ = Complete | ⏳ = Pending | ❌ = Not Started | N/A = Not Applicable

---

## 🐛 Known Issues

1. **TypeScript Errors in auth.service.ts:**
   - Model method calls need updating for Sequelize API
   - Field names changed (firstName→givenName, phone→phoneNumber)
   - Methods like `.exists()` don't exist in Sequelize (use `findByPk`)

2. **Missing Op Import:**
   - Fixed in User, Organization, Group, EnvironmentRoleAssignment
   - Pattern: `import { Op } from 'sequelize'` for conditional indexes

3. **Circular Dependency:**
   - Organization.defaultEnvId → Environment
   - Environment.organizationId → Organization
   - Handled via deferred constraint in migration

---

## 📝 Notes & Best Practices

### Naming Conventions
- **Database:** snake_case (user_id, created_at, phone_number)
- **TypeScript:** camelCase (userId, createdAt, phoneNumber)
- **Models:** PascalCase files (User.model.ts, MagicLinkToken.model.ts)

### Field Mappings
All models use `field: 'snake_case'` to map TypeScript camelCase to database snake_case.

### Timestamps
- `timestamps: true` → auto createdAt/updatedAt (most models)
- `timestamps: false` → manual management (Device, MagicLinkToken, GroupMember)
- `paranoid: true` → soft deletes with deletedAt (User, Organization, etc.)

### UUID Strategy
- All PKs use `UUIDV1` for time-ordered UUIDs
- Better for index performance than random UUIDs

### Validation
- Sequelize validations: `isEmail`, `is: /regex/` for E.164 phone, ISO country
- Model-level validations: `validate.noSelfParent()`, `validate.memberOrGroupOnly()`

### Indexes
- Partial indexes with `where` clauses for deleted_at, active records
- Unique indexes exclude soft-deleted records
- GIN indexes on JSONB for Event.actor/audit queries

---

## 🚀 Resume Prompt

To resume work after context clear, use:

```
Continue implementing Sequelize models. We've completed 14 of 19 models (all auth, tenancy, and RBAC models).

Remaining tasks:
1. Create the 5 remaining models: UserImpersonationSession, EventType, Event, Webhook, WebhookDelivery
2. Create src/models/index.ts to export all models
3. Create src/models/associations.ts for model relationships
4. Add hooks for denormalization (Event) and counters (Group.memberCount, Role.permissionCount)
5. Update auth.service.ts to use Sequelize API properly (field names, method calls)

Reference SEQUELIZE_MODELS_PROGRESS.md for details. Follow existing model patterns. Use UUIDV1 for PKs, snake_case field mappings, and Op import for conditional indexes.
```

---

**End of Progress Document**
