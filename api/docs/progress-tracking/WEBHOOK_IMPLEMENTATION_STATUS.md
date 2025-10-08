# Webhook Implementation Status - Batch 6.13

**Date:** 2025-10-08
**Status:** RED Phase Complete, Ready for GREEN Phase Implementation
**Progress:** 4/14 components complete (28.6%)

---

## Summary

Successfully completed RED phase (TDD) for Admin Webhooks batch 6.13 following all STANDARDS.md patterns. All foundational components are in place:

- ✅ 68 comprehensive tests written (currently failing - expected RED phase)
- ✅ Webhook model enhanced with `findWithFilters()` method
- ✅ EventTypeSubscription model created with full lifecycle management
- ✅ Constants updated with all filterable/sortable/searchable fields
- ✅ Test UUIDs added for webhook testing

---

## Completed Components ✅

### 1. Test File (`admin/webhooks.test.ts`)
**68 tests covering 6 endpoints:**

#### GET /admin/webhooks (13 tests)
- Pagination with limit/offset
- Filters: environmentId, isActive, authMethod, createdAt range
- Sorting: createdAt DESC (default), url ASC
- Search: url text search
- Field selection
- Auth (401), Authorization (403), Database error (422)

#### POST /admin/webhooks (12 tests)
- Success with all fields (201)
- Success with defaults (201)
- Validation errors (422):
  - name missing
  - url missing
  - url not HTTPS
  - eventTypes empty
  - authMethod invalid
  - retryConfig.maxAttempts exceeds limit
- Environment not found (404)
- Auth (401), Authorization (403)

#### GET /admin/webhooks/{webhookId} (5 tests)
- Success (200)
- Auth (401), Authorization (403), Not found (404), Database error (422)

#### PUT /admin/webhooks/{webhookId} (11 tests)
- Update name, url, eventTypes, isActive
- Update multiple fields
- Validation errors (422): url not HTTPS, eventTypes empty
- Auth (401), Authorization (403), Not found (404), Database error (422)

#### DELETE /admin/webhooks/{webhookId} (4 tests)
- Soft delete (204)
- Auth (401), Authorization (403), Not found (404)

#### GET /admin/event-type-subscriptions (11 tests)
- Pagination
- Filters: eventTypeVerb, webhookId, isActive
- Sorting: eventTypeVerb
- Search: webhookUrl
- Field selection
- Auth (401), Authorization (403 - requires admin:event-types:read), Database error (422)

### 2. Constants (`webhook.constants.ts`)
Added comprehensive field definitions:

```typescript
// Webhook query fields
WEBHOOK_FILTERABLE_FIELDS = [
  'environmentId', 'isActive', 'authMethod',
  'createdAt', 'updatedAt', 'lastSuccessAt', 'lastFailureAt'
]

WEBHOOK_SORTABLE_FIELDS = [
  'createdAt', 'updatedAt', 'lastSuccessAt', 'lastFailureAt',
  'failureCount', 'url', 'name'
]

WEBHOOK_SEARCHABLE_FIELDS = ['url', 'name', 'eventTypes']

WEBHOOK_SELECTABLE_FIELDS = [
  'id', 'environmentId', 'name', 'url', 'eventTypes',
  'authMethod', 'authConfig', 'retryConfig', 'isActive',
  'failureCount', 'lastSuccessAt', 'lastFailureAt',
  'metadata', 'createdAt', 'updatedAt'
]

// Subscription query fields
SUBSCRIPTION_FILTERABLE_FIELDS = [
  'eventTypeId', 'eventTypeVerb', 'webhookId',
  'webhookName', 'webhookUrl', 'isActive',
  'createdAt', 'updatedAt'
]

SUBSCRIPTION_SORTABLE_FIELDS = [
  'eventTypeVerb', 'webhookName', 'webhookUrl',
  'createdAt', 'updatedAt', 'isActive'
]

SUBSCRIPTION_SEARCHABLE_FIELDS = [
  'eventTypeVerb', 'webhookName', 'webhookUrl'
]
```

### 3. Webhook Model Enhancement (`Webhook.model.ts`)
Added `findWithFilters()` static method:

- Supports all filter operators: eq, ne, gt, gte, lt, lte for date fields
- Multi-field search with `Op.or` pattern
- Dynamic sorting with direction support (-, +)
- Field selection with automatic id inclusion
- Paranoid queries (soft delete aware)
- Follows SOC: All DB logic in model layer

### 4. EventTypeSubscription Model (`EventTypeSubscription.model.ts`)
**New model for reverse-lookup table (event → webhooks):**

#### Purpose:
Denormalized helper table for fast event delivery without joins. When webhook is created with `eventTypes: ['user.created', 'user.updated']`, creates 2 subscription records with denormalized webhook fields.

#### Static Methods:

```typescript
// Admin queries
findWithFilters(filters, options)
  - Supports all standard filters/sorting/search/field selection

// Webhook delivery
findActiveByEventTypeVerb(eventTypeVerb)
  - Fast lookup: "which webhooks should receive this event?"

// Webhook management
findByWebhookId(webhookId)
  - List all event types a webhook is subscribed to

// Lifecycle management (called by webhook service)
createForWebhook(webhookId, eventTypeVerbs, webhookData)
  - Bulk create subscriptions from event_types array
  - Denormalizes webhook fields for performance

deleteForWebhookEventTypes(webhookId, eventTypeVerbs)
  - Remove subscriptions when event_types removed

updateWebhookFields(webhookId, updates)
  - Sync denormalized fields when webhook changes
```

#### Database Schema:
```sql
CREATE TABLE event_type_subscription (
  id UUID PRIMARY KEY,
  event_type_id UUID NOT NULL,
  event_type_verb VARCHAR(100) NOT NULL,  -- denormalized
  webhook_id UUID NOT NULL,
  webhook_name VARCHAR(255) NOT NULL,     -- denormalized
  webhook_url VARCHAR(2048) NOT NULL,     -- denormalized
  webhook_auth_method VARCHAR(20) NOT NULL, -- denormalized
  webhook_auth_config JSONB,              -- denormalized
  webhook_retry_config JSONB NOT NULL,    -- denormalized
  webhook_metadata JSONB,                 -- denormalized
  is_active BOOLEAN NOT NULL,             -- denormalized
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(event_type_id, webhook_id)
);

-- Partial indexes for fast active lookups
CREATE INDEX idx_event_type_sub_event_type_verb
  ON event_type_subscription(event_type_verb)
  WHERE is_active = TRUE;
```

---

## Remaining Components ⏭️

### 5. Validation Schemas (2 files)
**File:** `admin-webhook.schemas.ts`
- `listWebhooksQuerySchema` - filters, sort, search, fields, pagination
- `createWebhookSchema` - url (HTTPS), eventTypes (min 1), authMethod, retryConfig
- `updateWebhookSchema` - all fields optional
- `webhookIdParamSchema` - UUID validation

**File:** `admin-event-type-subscription.schemas.ts`
- `listSubscriptionsQuerySchema` - filters, sort, search, fields, pagination

### 6. Services (2 files)
**File:** `admin-webhook.service.ts`

**CRITICAL:** Must manage event_type_subscription lifecycle:

```typescript
class AdminWebhookService {
  // List with filters
  async listWebhooks(filters, options)
    → Call Webhook.findWithFilters()

  // Get by ID
  async getWebhookById(webhookId)
    → Call Webhook.findByPk()

  // Create with subscription management
  async createWebhook(data)
    1. Validate environment exists
    2. Create webhook record
    3. Call EventTypeSubscription.createForWebhook() ← CRITICAL
    4. Return webhook

  // Update with subscription sync
  async updateWebhook(webhookId, updates)
    1. Fetch existing webhook
    2. Update webhook record
    3. If eventTypes changed:
       - Compare old vs new eventTypes
       - Call EventTypeSubscription.deleteForWebhookEventTypes() for removed
       - Call EventTypeSubscription.createForWebhook() for added
    4. If other fields changed (name, url, auth, etc.):
       - Call EventTypeSubscription.updateWebhookFields()
    5. Return updated webhook

  // Delete (cascade handled by FK)
  async deleteWebhook(webhookId)
    → Soft delete webhook
    → Subscriptions cascade deleted automatically
}
```

**File:** `admin-event-type-subscription.service.ts`
```typescript
class AdminEventTypeSubscriptionService {
  async listSubscriptions(filters, options)
    → Call EventTypeSubscription.findWithFilters()
}
```

### 7. Controllers (2 files)
**File:** `admin-webhook.controller.ts`
- `listWebhooks` - Extract query params, call service, format response
- `createWebhook` - Extract body, call service, return 201
- `getWebhookById` - Extract params, call service, return 200
- `updateWebhook` - Extract params/body, call service, return 200
- `deleteWebhook` - Extract params, call service, return 204

**File:** `admin-event-type-subscription.controller.ts`
- `listSubscriptions` - Extract query params, call service, format response

### 8. Routes (2 files)
**File:** `admin-webhook.routes.ts`
```typescript
router.get('/',
  authenticate,
  authorize(['admin:webhooks:read']),
  validate.query(schemas.listWebhooksQuery),
  controller.listWebhooks
);

router.post('/',
  authenticate,
  authorize(['admin:webhooks:manage']),
  validate.body(schemas.createWebhook),
  controller.createWebhook
);

router.get('/:webhookId',
  authenticate,
  validate.params(schemas.webhookIdParam),
  authorize(['admin:webhooks:read']),
  controller.getWebhookById
);

router.put('/:webhookId',
  authenticate,
  validate.params(schemas.webhookIdParam),
  authorize(['admin:webhooks:manage']),
  validate.body(schemas.updateWebhook),
  controller.updateWebhook
);

router.delete('/:webhookId',
  authenticate,
  validate.params(schemas.webhookIdParam),
  authorize(['admin:webhooks:manage']),
  controller.deleteWebhook
);
```

**File:** `admin-event-type-subscription.routes.ts`
```typescript
router.get('/',
  authenticate,
  authorize(['admin:event-types:read']),
  validate.query(schemas.listSubscriptionsQuery),
  controller.listSubscriptions
);
```

### 9. Wire into Main Router
**File:** `routes/index.ts`
```typescript
import adminWebhookRoutes from './admin-webhook.routes';
import adminEventTypeSubscriptionRoutes from './admin-event-type-subscription.routes';

router.use('/admin/webhooks', adminWebhookRoutes);
router.use('/admin/event-type-subscriptions', adminEventTypeSubscriptionRoutes);
```

### 10. Run Tests → GREEN Phase
```bash
npm test -- admin/webhooks.test.ts
# All 68 tests should pass
```

---

## Architecture Notes

### Separation of Concerns (SOC)
- **Route:** Wire middleware → controller
- **Controller:** HTTP layer (req/res) → call service
- **Service:** Business logic → call model/adapter
- **Model:** Database operations (ONLY layer with Op/sequelize imports)

### Field Naming Consistency
- **API/Service/Controller:** camelCase (eventTypes, isActive, createdAt)
- **Database/Model:** snake_case (event_types, is_active, created_at)
- **Sequelize:** Auto-maps between conventions

### Subscription Lifecycle
```
Webhook CREATE → EventTypeSubscription.createForWebhook()
  Input: ['user.created', 'device.revoked']
  Output: 2 subscription records with denormalized webhook fields

Webhook UPDATE (eventTypes changed) →
  Removed: ['device.revoked'] → deleteForWebhookEventTypes()
  Added: ['session.started'] → createForWebhook()

Webhook UPDATE (other fields) →
  updateWebhookFields() → sync denormalized fields

Webhook DELETE →
  CASCADE DELETE via FK constraint (automatic)
```

### Performance (<200ms SLO)
- Denormalized subscriptions avoid joins
- Partial indexes on is_active = TRUE
- GIN index on webhook.event_types array
- Cursor pagination for deliveries (future)

---

## Test Data

### Test UUIDs Added:
```typescript
WEBHOOK_1: 'wwwwwwww-wwww-wwww-wwww-wwwwwwwwwww1'
WEBHOOK_2: 'wwwwwwww-wwww-wwww-wwww-wwwwwwwwwww2'
WEBHOOK_3: 'wwwwwwww-wwww-wwww-wwww-wwwwwwwwwww3'
WEBHOOK_NONEXISTENT: '99999999-9999-9999-9999-99999999999w'
ENV_PROD: '33333333-3333-3333-3333-333333333331'
```

### Test Permissions:
- `admin:webhooks:read` - List, get
- `admin:webhooks:manage` - Create, update, delete
- `admin:event-types:read` - List subscriptions

---

## Next Steps

1. **Create validation schemas** (2 files)
2. **Create services** (2 files) - webhook service manages subscription lifecycle
3. **Create controllers** (2 files)
4. **Create routes** (2 files)
5. **Wire into main router**
6. **Run tests** - All 68 tests should pass (GREEN phase)
7. **Update progress tracker** - Mark batch 6.13 complete
8. **Proceed to batch 6.14** - Webhook deliveries (Part 2)

---

## Reference Files

- **Tests:** `src/__tests__/integration/admin/webhooks.test.ts`
- **Model:** `src/models/Webhook.model.ts`
- **Model:** `src/models/EventTypeSubscription.model.ts`
- **Constants:** `src/constants/webhook.constants.ts`
- **Test Constants:** `src/__tests__/helpers/test-constants.ts`
- **Progress Tracker:** `docs/progress-tracking/TEST_ADMIN_IMPLEMENTATION_PROGRESS.md`
- **OAPI Spec:** `api-docs/paths/admin-webhooks.yaml`
- **OAPI Spec:** `api-docs/paths/admin-event-type-subscriptions.yaml`
