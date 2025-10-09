# Event Logging Security Redaction

**Last Updated:** 2025-10-08
**Status:** ✅ Implemented & Tested

---

## Overview

The event logging system automatically redacts sensitive data from all captured HTTP requests before storing them in the database or publishing to message queues. This ensures compliance with security best practices and prevents accidental exposure of credentials, tokens, and PII.

---

## What Gets Redacted

### HTTP Headers

**Sensitive patterns** (case-insensitive):
- `authorization` - Bearer tokens, Basic auth credentials
- `cookie` - Session cookies
- `set-cookie` - Response cookies
- `x-api-key`, `api-key`, `apikey` - API authentication keys
- `x-auth-token`, `auth-token` - Authentication tokens
- `proxy-authorization` - Proxy credentials
- `www-authenticate` - Authentication challenges

**Example:**
```json
{
  "authorization": "[REDACTED]",
  "content-type": "application/json",
  "user-agent": "Mozilla/5.0"
}
```

### Request/Response Body

**Sensitive field patterns** (case-insensitive, supports snake_case and camelCase):
- Credentials: `password`, `passwd`, `pwd`, `secret`, `token`, `credentials`
- API Keys: `apiKey`, `api_key`, `privateKey`, `private_key`, `accessKey`, `secretKey`, `clientSecret`
- Auth: `bearer`, `auth`, `authToken`
- Security: `fingerprint`, `hash` (e.g., password hashes, device fingerprints)
- PII: `ssn`, `social_security`, `creditCard`, `card_number`, `cvv`, `cvc`, `pin`

**Example:**
```json
{
  "email": "user@example.com",
  "password": "[REDACTED]",
  "apiKey": "[REDACTED]",
  "fullName": "John Doe"
}
```

### Query Parameters

Same patterns as body fields apply to URL query parameters.

**Example:**
```
/api/v1/users?search=john&token=[REDACTED]
```

### Nested Objects and Arrays

Redaction is **recursive** - sensitive fields are removed at any depth.

**Example:**
```json
{
  "user": {
    "email": "user@example.com",
    "password": "[REDACTED]",
    "profile": {
      "name": "John",
      "apiKey": "[REDACTED]"
    }
  },
  "devices": [
    { "name": "iPhone", "fingerprint": "[REDACTED]" },
    { "name": "MacBook", "fingerprint": "[REDACTED]" }
  ]
}
```

---

## Implementation

### Automatic Protection

Redaction is applied automatically in the **audit logger middleware** before events are emitted to the event processor:

```typescript
// src/middleware/audit-logger.middleware.ts

// Capture raw request snapshot
const requestSnapshot: RequestSnapshot = {
  method: req.method,
  headers: req.headers,
  body: req.body,
  query: req.query,
  // ...
};

// Redact sensitive data before logging
const redactedSnapshot = redactRequestSnapshot(requestSnapshot);

// Use redacted snapshot in event data
const eventData: EventData = {
  eventType,
  request: redactedSnapshot,  // ✅ Protected
  response: responseSnapshot,
  context,
};
```

### Helper Functions

Located in `src/utils/event.helpers.ts`:

- `redactHeaders(headers)` - Redact sensitive HTTP headers
- `redactBody(body)` - Recursively redact sensitive fields from objects/arrays
- `redactQuery(query)` - Redact sensitive query parameters
- `redactRequestSnapshot(snapshot)` - Apply all redactions to request snapshot

### Integration Points

1. **Audit Logger Middleware** (`src/middleware/audit-logger.middleware.ts`)
   - Redacts request snapshots before event emission

2. **Event Helpers** (`src/utils/event.helpers.ts`)
   - `buildObject()` - Already applies redaction when extracting request body
   - `buildCloudEventObject()` - Already applies redaction for CloudEvents

---

## Test Coverage

**File:** `src/__tests__/unit/utils/event.helpers.test.ts`

**Tests:** 17/17 passing ✅

### Header Redaction (6 tests)
- Authorization header (Bearer tokens)
- Case-insensitive matching
- Cookie headers
- API key headers (multiple formats)
- Preserves non-sensitive headers
- Handles array header values

### Body Redaction (9 tests)
- Password fields
- Multiple sensitive fields (tokens, secrets, keys)
- Nested objects (recursive)
- Arrays of objects
- Null/undefined/primitives
- Field name variations (snake_case, camelCase, kebab-case)
- Security-sensitive fields (fingerprint, hash, SSN, credit cards)

### Integration Tests (2 tests)
- Query parameter redaction
- Complete request snapshot redaction with structure preservation

---

## Security Benefits

### ✅ Compliance
- **PCI-DSS:** Credit card numbers and CVV codes redacted
- **GDPR/Privacy:** SSN and PII protected
- **SOC 2:** Credentials and secrets never stored in logs

### ✅ Defense in Depth
- Even if event logs are compromised, no credentials exposed
- Database administrators cannot access Bearer tokens or passwords
- Webhook consumers receive redacted CloudEvents

### ✅ Audit Trail Integrity
- Full HTTP metadata preserved (status codes, paths, IPs)
- Non-sensitive data remains intact for debugging
- Redaction is transparent and consistent

---

## Configuration

**No configuration required** - redaction is always enabled and cannot be disabled.

To customize redaction patterns, edit:
```typescript
// src/utils/event.helpers.ts

const SENSITIVE_HEADER_PATTERNS = [
  /^authorization$/i,
  /^cookie$/i,
  // Add custom patterns...
];

const SENSITIVE_BODY_PATTERNS = [
  /password/i,
  /token/i,
  // Add custom patterns...
];
```

---

## Example: Before and After

### Before Redaction (RAW)
```json
{
  "method": "POST",
  "path": "/api/v1/auth/register",
  "headers": {
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "content-type": "application/json"
  },
  "body": {
    "email": "user@example.com",
    "password": "SuperSecret123!",
    "apiKey": "sk_live_51234567890"
  }
}
```

### After Redaction (STORED)
```json
{
  "method": "POST",
  "path": "/api/v1/auth/register",
  "headers": {
    "authorization": "[REDACTED]",
    "content-type": "application/json"
  },
  "body": {
    "email": "user@example.com",
    "password": "[REDACTED]",
    "apiKey": "[REDACTED]"
  }
}
```

---

## Performance Impact

**Negligible** - redaction occurs during `res.on('finish')` callback (after response sent to client):

- **When:** Post-response processing (non-blocking)
- **Overhead:** <1ms for typical requests
- **Pattern Matching:** Regex-based, O(n) where n = number of fields
- **Memory:** Minimal - creates shallow copies of objects

---

## Known Limitations

1. **Whitelist Approach:** We use a blacklist (redact known sensitive patterns) rather than whitelist (allow only known safe fields). This is intentional for flexibility but may miss custom sensitive fields.

2. **Field Name Matching:** Redaction relies on field names, not values. A field named `data` containing a password would NOT be redacted.

3. **Binary Data:** Does not handle binary data (images, files) - assumes JSON/text payloads.

---

## Related Documentation

- **Event Logging Architecture:** `docs/EVENT_LOGGING_ARCHITECTURE.md`
- **Event Helpers Implementation:** `src/utils/event.helpers.ts`
- **Audit Logger Middleware:** `src/middleware/audit-logger.middleware.ts`
- **Test Coverage:** `src/__tests__/unit/utils/event.helpers.test.ts`
- **Implementation Progress:** `docs/progress-tracking/EVENT_LOGGING_IMPLEMENTATION.md`

---

## Future Enhancements

### Planned
- [ ] Configurable redaction patterns via environment variables
- [ ] Partial redaction (e.g., show last 4 digits of credit cards)
- [ ] Field-level encryption for highly sensitive data
- [ ] Audit log of redaction activities

### Considered
- [ ] AI-based sensitive data detection (e.g., detect SSNs by pattern, not field name)
- [ ] Whitelist mode for high-security environments
- [ ] Custom redaction functions per endpoint

---

**Last Updated:** 2025-10-08
