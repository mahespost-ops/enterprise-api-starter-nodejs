# Query Parameter Standards

This document defines the standardized query parameter conventions for all list/collection endpoints in the API.

## Overview

All list endpoints MUST support a consistent set of query parameters for pagination, filtering, sorting, field selection, and search. This ensures a predictable and developer-friendly API experience.

## 1. Pagination

### 1.1 Offset-Based Pagination (Default)

**Use for:** Most list endpoints with moderate data volumes (<10M records)

**Parameters:**
- `limit` - Number of items to return (default: 20, min: 1, max: 100)
- `offset` - Number of items to skip (default: 0, min: 0)

**Example:**
```
GET /api/v1/orgs/{orgId}/members?limit=50&offset=100
```

**Response Structure:**
```json
{
  "data": [...],
  "pagination": {
    "limit": 50,
    "offset": 100,
    "total": 1234,
    "hasMore": true
  }
}
```

### 1.2 Cursor-Based Pagination

**Use for:** High-volume endpoints (events, media, messages, audit logs) with 10M+ records

**Parameters:**
- `limit` - Number of items to return (default: 20, min: 1, max: 100)
- `cursor` - Opaque cursor string from previous response (optional, if not provided returns first page)

**Example:**
```
GET /api/v1/orgs/{orgId}/envs/{envId}/events?limit=50&cursor=eyJpZCI6IjEyMyIsInRzIjoxNjk...
```

**Response Structure:**
```json
{
  "data": [...],
  "pagination": {
    "limit": 50,
    "nextCursor": "eyJpZCI6IjQ1NiIsInRzIjoxNjk...",
    "hasMore": true
  }
}
```

**Cursor Format:**
- Base64-encoded JSON containing sort field values and ID
- Example decoded: `{"id": "uuid", "ts": 1234567890}`
- MUST include primary key to ensure uniqueness
- Opaque to clients (internal structure may change)

## 2. Filtering

### 2.1 Filter Syntax

**Format:** `filter[field]=value` or `filter[field][operator]=value`

**Default Operator:** Equals (`eq`) when no operator specified

**Supported Operators:**
- `eq` - Equals (default)
- `ne` - Not equals
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `in` - In array (comma-separated values)
- `nin` - Not in array (comma-separated values)
- `contains` - String contains (case-insensitive)
- `startsWith` - String starts with (case-insensitive)
- `endsWith` - String ends with (case-insensitive)
- `exists` - Field exists/is not null (value: true/false)

**Examples:**
```
# Exact match (default operator)
GET /api/v1/orgs/{orgId}/members?filter[status]=active

# Not equals
GET /api/v1/orgs/{orgId}/members?filter[status][ne]=suspended

# Greater than or equal
GET /api/v1/orgs/{orgId}/envs/{envId}/events?filter[timestamp][gte]=2025-10-01T00:00:00Z

# Date range
GET /api/v1/orgs/{orgId}/envs/{envId}/events?filter[timestamp][gte]=2025-10-01T00:00:00Z&filter[timestamp][lte]=2025-10-31T23:59:59Z

# In array
GET /api/v1/orgs/{orgId}/members?filter[status][in]=active,pending

# String contains
GET /api/v1/admin/users?filter[email][contains]=@example.com

# Multiple filters (AND logic)
GET /api/v1/orgs/{orgId}/envs/{envId}/events?filter[verb]=auth.login&filter[actorType]=User
```

### 2.2 Filter Capabilities Per Endpoint

Each endpoint MUST document:
1. **Filterable fields** - List of fields that support filtering
2. **Supported operators per field** - Which operators work with each field
3. **Field data types** - To inform valid operator choices

**Example Documentation:**
```yaml
# In OpenAPI spec
parameters:
  - name: filter[status]
    in: query
    description: |
      Filter by member status
      Operators: eq, ne, in, nin
      Values: active, inactive, suspended, pending
    schema:
      type: string
    example: 'active'
```

## 3. Sorting

### 3.1 Sort Syntax

**Format:** `sort=field1,-field2,field3`

**Rules:**
- Comma-separated list of field names
- Prefix with `-` for descending order
- No prefix or `+` for ascending order
- Applied in order specified (first field primary sort, etc.)
- Default sort MUST be documented per endpoint

**Examples:**
```
# Sort by createdAt descending (most recent first)
GET /api/v1/orgs/{orgId}/members?sort=-createdAt

# Sort by status ascending, then name ascending
GET /api/v1/orgs/{orgId}/members?sort=status,name

# Sort by status descending, then createdAt descending
GET /api/v1/orgs/{orgId}/members?sort=-status,-createdAt
```

### 3.2 Sortable Fields Per Endpoint

Each endpoint MUST document:
1. **Sortable fields** - List of fields that support sorting
2. **Default sort** - What sort is applied when not specified
3. **Performance notes** - Which sorts use indexes vs require table scans

**Example Documentation:**
```yaml
# In OpenAPI spec
parameters:
  - name: sort
    in: query
    description: |
      Sort results. Prefix with '-' for descending order.

      Sortable fields:
      - createdAt (default: -createdAt, indexed)
      - updatedAt (indexed)
      - email (indexed)
      - name (not indexed, may be slow)
      - status (indexed)
    schema:
      type: string
    example: '-createdAt'
```

## 4. Field Selection

### 4.1 Fields Syntax

**Format:** `fields=field1,field2,field3`

**Rules:**
- Comma-separated list of field names
- Only specified fields returned in response
- Primary identifier (e.g., `id`) ALWAYS included
- Invalid field names return 400 Bad Request
- If not specified, returns all fields (default behavior)

**Examples:**
```
# Return only id, email, and name
GET /api/v1/orgs/{orgId}/members?fields=email,name

# Combine with other params
GET /api/v1/orgs/{orgId}/members?fields=id,email,status&filter[status]=active&sort=-createdAt
```

**Benefits:**
- Reduces payload size
- Improves response time
- Reduces bandwidth usage
- Client controls data received

### 4.2 Selectable Fields Per Endpoint

Each endpoint SHOULD document:
1. **Available fields** - All fields that can be selected
2. **Always included** - Fields always returned (e.g., `id`)
3. **Computed fields** - Fields that are expensive to compute

## 5. Search

### 5.1 Search Syntax

**Format:** `search=query`

**Rules:**
- Full-text search across predefined searchable fields
- Case-insensitive
- Search implementation endpoint-specific (database full-text, Elasticsearch, etc.)
- Each endpoint MUST document which fields are searched
- Should NOT be combined with filter params on searchable fields

**Examples:**
```
# Search members by name or email
GET /api/v1/orgs/{orgId}/members?search=john

# Search with pagination and sorting
GET /api/v1/orgs/{orgId}/members?search=acme&limit=50&sort=-createdAt
```

### 5.2 Search vs Filter

- **Use `search`** - When user needs fuzzy/full-text search across multiple fields
- **Use `filter`** - When user needs exact/operator-based filtering on specific fields

## 6. OpenAPI Schema Standards

### 6.1 Reusable Parameter Components

All query parameters MUST be defined in `api-docs/components/parameters.yaml` and referenced via `$ref`.

**Categories:**
1. **Pagination** - `limit`, `offset`, `cursor`
2. **Sorting** - `sort`
3. **Filtering** - Common filters as reusable components
4. **Field Selection** - `fields`
5. **Search** - `search`

### 6.2 Response Schema Components

All list responses MUST use standardized response schemas in `api-docs/components/schemas/common.yaml`:

1. **OffsetPaginationInfo** - For offset-based pagination
2. **CursorPaginationInfo** - For cursor-based pagination

## 7. Implementation Standards

### 7.1 Backend Query Building

Services MUST:
1. Validate all query parameters
2. Return 400 Bad Request for invalid params
3. Sanitize inputs to prevent SQL injection
4. Apply filters, search, sort, and pagination in correct order:
   - Search/Filter → Sort → Paginate
5. Use parameterized queries or ORM
6. Log expensive queries (>200ms) for optimization

### 7.2 Performance Considerations

#### Offset Pagination
- **Pros:** Simple, allows jumping to any page, total count available
- **Cons:** Slow for large offsets, inconsistent with concurrent writes
- **Use when:** Data volumes < 10M, total count needed, random access required

#### Cursor Pagination
- **Pros:** Fast for any page, consistent results, scales to billions of records
- **Cons:** No total count, no random access, opaque cursors
- **Use when:** Data volumes > 10M, streaming/infinite scroll, timeline-based data

#### Indexes
- Ensure indexes exist for:
  - All filterable fields
  - All sortable fields
  - Composite indexes for common filter+sort combinations

### 7.3 Rate Limiting

High-volume endpoints SHOULD implement stricter rate limits:
- Standard endpoints: 100 req/min
- High-volume endpoints (events, logs): 20 req/min

## 8. Migration Strategy

### Phase 1: Add Standardized Parameters (Backward Compatible)
1. Add new standardized params alongside existing ones
2. Update OpenAPI specs with new parameters
3. Document deprecation timeline for old params
4. Add deprecation warnings in API responses

### Phase 2: Update Documentation
1. Mark old parameters as deprecated in OpenAPI specs
2. Add migration guide to docs
3. Send email to API consumers

### Phase 3: Remove Deprecated Parameters
1. After 6 months, remove old parameter support
2. Return 400 Bad Request with migration instructions

## 9. Endpoint-Specific Configurations

### 9.1 High-Volume Endpoints (Cursor Pagination Required)

- `GET /api/v1/orgs/{orgId}/envs/{envId}/events`
- `GET /api/v1/admin/events`
- (Future) `GET /api/v1/orgs/{orgId}/envs/{envId}/media`
- (Future) `GET /api/v1/orgs/{orgId}/envs/{envId}/messages`
- (Future) Audit log endpoints

**Configuration:**
- Primary pagination: Cursor-based
- May optionally support offset pagination with warnings
- Default sort: `-createdAt` (newest first)
- Max limit: 100

### 9.2 Standard Endpoints (Offset Pagination)

All other list endpoints

**Configuration:**
- Primary pagination: Offset-based
- Default limit: 20
- Max limit: 100

## 10. Examples

### Example 1: List Members with Filtering and Sorting
```
GET /api/v1/orgs/550e8400-e29b-41d4-a716-446655440000/members?filter[status]=active&sort=-createdAt&limit=50

Response:
{
  "data": [
    {
      "id": "user-uuid-1",
      "email": "john@example.com",
      "name": "John Doe",
      "status": "active",
      "createdAt": "2025-10-02T10:30:00Z"
    },
    ...
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 245,
    "hasMore": true
  }
}
```

### Example 2: List Events with Cursor Pagination
```
GET /api/v1/orgs/550e8400-e29b-41d4-a716-446655440000/envs/7c9e6679-7425-40de-944b-e07fc1f90ae7/events?filter[verb]=auth.login&limit=100

Response:
{
  "data": [
    {
      "id": "event-uuid-1",
      "verb": "auth.login",
      "timestamp": "2025-10-03T14:22:10Z",
      ...
    },
    ...
  ],
  "pagination": {
    "limit": 100,
    "nextCursor": "eyJpZCI6ImV2ZW50LXV1aWQtMTAwIiwidGltZXN0YW1wIjoiMjAyNS0xMC0wM1QxMDowMDowMFoifQ==",
    "hasMore": true
  }
}
```

### Example 3: Field Selection with Search
```
GET /api/v1/orgs/550e8400-e29b-41d4-a716-446655440000/members?search=john&fields=id,email,name

Response:
{
  "data": [
    {
      "id": "user-uuid-1",
      "email": "john@example.com",
      "name": "John Doe"
    },
    {
      "id": "user-uuid-2",
      "email": "johnny@example.com",
      "name": "Johnny Smith"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 2,
    "hasMore": false
  }
}
```

## 11. References

- [JSON:API Specification](https://jsonapi.org/format/#fetching)
- [GraphQL Pagination](https://graphql.org/learn/pagination/)
- [REST API Design Rulebook](https://www.oreilly.com/library/view/rest-api-design/9781449317904/)
