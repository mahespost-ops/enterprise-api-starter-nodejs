# Endpoint Standardization Template

This template provides a standardized format for all list/collection endpoints in the OpenAPI specification.

## Required Sections for List Endpoints

Every list endpoint MUST include the following standardized sections in its `description`:

### 1. Filterable Fields

Document all fields that support filtering with their supported operators and value constraints:

```yaml
**Filterable fields:**
- `fieldName` (operators) - Description/constraints
- `status` (eq, ne, in, nin) - Values: active, inactive, suspended
- `createdAt` (eq, ne, gt, gte, lt, lte) - ISO 8601 timestamp
```

### 2. Sortable Fields

Document all fields that support sorting, default sort, and index status:

```yaml
**Sortable fields:**
- `createdAt` (default: -createdAt, indexed)
- `updatedAt` (indexed)
- `name` (not indexed, may be slow for large datasets)
- `status` (indexed)
```

### 3. Searchable Fields

Document which fields are included in full-text search:

```yaml
**Searchable fields:**
- Full-text search across fieldA, fieldB, fieldC (case-insensitive)
```

### 4. Selectable Fields

List all fields available for field selection via `?fields=`:

```yaml
**Selectable fields:**
- All fields: id, field1, field2, field3, createdAt, updatedAt
```

### 5. Examples

Provide 2-3 realistic query examples:

```yaml
**Examples:**
```
# Example 1: Basic filtering and sorting
?filter[status]=active&sort=-createdAt&limit=50

# Example 2: Date range filtering
?filter[createdAt][gte]=2025-01-01T00:00:00Z&filter[status][in]=active,pending

# Example 3: Search with field selection
?search=keyword&fields=id,name,email&limit=20
```
```

## Standard Parameters

Every list endpoint MUST include these parameters in the specified order:

```yaml
parameters:
  # Path parameters (if applicable)
  - $ref: '../components/parameters.yaml#/orgId'
  - $ref: '../components/parameters.yaml#/envId'

  # Pagination (choose ONE pagination style)
  ## For standard endpoints (offset-based):
  - $ref: '../components/parameters.yaml#/limit'
  - $ref: '../components/parameters.yaml#/offset'

  ## For high-volume endpoints (cursor-based):
  - $ref: '../components/parameters.yaml#/limit'
  - $ref: '../components/parameters.yaml#/cursor'

  # Sorting
  - $ref: '../components/parameters.yaml#/sort'

  # Search
  - $ref: '../components/parameters.yaml#/search'

  # Field Selection
  - $ref: '../components/parameters.yaml#/fields'

  # Filters (endpoint-specific)
  - name: filter[fieldName]
    in: query
    required: false
    description: |
      Filter by fieldName (supports: eq, ne, in, nin)
      Values: value1, value2, value3
    schema:
      type: string
    example: 'value1'

  - name: filter[dateField][gte]
    in: query
    required: false
    description: Filter items created/updated on or after this date (ISO 8601, UTC)
    schema:
      type: string
      format: date-time
    example: '2025-01-01T00:00:00Z'
```

## Response Schema

### For Offset Pagination (Standard Endpoints)

```yaml
responses:
  '200':
    description: Items retrieved successfully
    content:
      application/json:
        schema:
          type: object
          required:
            - data
            - pagination
          properties:
            data:
              type: array
              items:
                $ref: '../components/schemas/resource.yaml#/ResourceType'
            pagination:
              $ref: '../components/schemas/common.yaml#/OffsetPaginationInfo'
        examples:
          default:
            summary: Standard list response
            value:
              data:
                - id: 'uuid-1'
                  fieldA: 'valueA'
                  fieldB: 'valueB'
                  createdAt: '2025-10-02T14:45:00Z'
              pagination:
                limit: 20
                offset: 0
                total: 150
                hasMore: true
          fieldSelection:
            summary: With field selection
            value:
              data:
                - id: 'uuid-1'
                  fieldA: 'valueA'
              pagination:
                limit: 20
                offset: 0
                total: 150
                hasMore: true
  '400':
    $ref: '../index.yaml#/components/responses/BadRequestError'
  '401':
    $ref: '../index.yaml#/components/responses/UnauthorizedError'
  '403':
    $ref: '../index.yaml#/components/responses/ForbiddenError'
  '500':
    $ref: '../index.yaml#/components/responses/InternalServerError'
```

### For Cursor Pagination (High-Volume Endpoints)

```yaml
responses:
  '200':
    description: Items retrieved successfully
    content:
      application/json:
        schema:
          type: object
          required:
            - data
            - pagination
          properties:
            data:
              type: array
              items:
                $ref: '../components/schemas/resource.yaml#/ResourceType'
            pagination:
              $ref: '../components/schemas/common.yaml#/CursorPaginationInfo'
        examples:
          default:
            summary: First page
            value:
              data:
                - id: 'uuid-1'
                  timestamp: '2025-10-03T14:22:10Z'
              pagination:
                limit: 100
                nextCursor: 'eyJpZCI6InV1aWQtMTAwIiwidGltZXN0YW1wIjoiMjAyNS0xMC0wM1QxMDowMDowMFoifQ=='
                hasMore: true
          lastPage:
            summary: Last page
            value:
              data:
                - id: 'uuid-last'
                  timestamp: '2025-10-01T10:00:00Z'
              pagination:
                limit: 100
                hasMore: false
  '400':
    $ref: '../index.yaml#/components/responses/BadRequestError'
  '401':
    $ref: '../index.yaml#/components/responses/UnauthorizedError'
  '403':
    $ref: '../index.yaml#/components/responses/ForbiddenError'
  '500':
    $ref: '../index.yaml#/components/responses/InternalServerError'
```

## Complete Example: Members List Endpoint

See `/api/api-docs/paths/members.yaml#listMembers` for a complete implementation of this template.

## Checklist for New List Endpoints

- [ ] Description includes **Filterable fields** section
- [ ] Description includes **Sortable fields** section with default and index status
- [ ] Description includes **Searchable fields** section
- [ ] Description includes **Selectable fields** section
- [ ] Description includes **Examples** section (2-3 examples)
- [ ] Parameters include pagination (limit + offset OR limit + cursor)
- [ ] Parameters include sort reference
- [ ] Parameters include search reference
- [ ] Parameters include fields reference
- [ ] Parameters include endpoint-specific filters
- [ ] Response uses `OffsetPaginationInfo` or `CursorPaginationInfo`
- [ ] Response includes 2 examples (default and fieldSelection OR default and lastPage)
- [ ] Response includes 400 Bad Request error
- [ ] All field names use camelCase (not snake_case)

## High-Volume Endpoints Requiring Cursor Pagination

The following endpoints MUST use cursor-based pagination due to expected data volumes (10M+ records):

- `GET /api/v1/orgs/{orgId}/envs/{envId}/events`
- `GET /api/v1/admin/events`
- (Future) `GET /api/v1/orgs/{orgId}/envs/{envId}/media`
- (Future) `GET /api/v1/orgs/{orgId}/envs/{envId}/messages`
- (Future) Audit log endpoints

All other list endpoints should use offset-based pagination.

## Field Naming Conventions

- **API Responses:** Use camelCase (`createdAt`, `userId`, `organizationId`)
- **Database:** Use snake_case (`created_at`, `user_id`, `organization_id`)
- **Transformation:** Backend automatically converts between conventions
- **Filter Parameters:** Use camelCase (`filter[createdAt]`, not `filter[created_at]`)
- **Sort Parameters:** Use camelCase (`sort=createdAt`, not `sort=created_at`)

## Common Filterable Fields

These fields are common across many resources and should follow consistent patterns:

| Field | Operators | Example |
|-------|-----------|---------|
| `status` | eq, ne, in, nin | `filter[status]=active` |
| `createdAt` | eq, ne, gt, gte, lt, lte | `filter[createdAt][gte]=2025-01-01T00:00:00Z` |
| `updatedAt` | eq, ne, gt, gte, lt, lte | `filter[updatedAt][lte]=2025-12-31T23:59:59Z` |
| `id` | eq, ne, in, nin | `filter[id][in]=uuid1,uuid2,uuid3` |
| Boolean fields | eq | `filter[isActive]=true` |

## Common Sortable Fields

These fields are common across many resources:

| Field | Index Status | Default |
|-------|--------------|---------|
| `createdAt` | indexed | Most endpoints default to `-createdAt` (newest first) |
| `updatedAt` | indexed | - |
| `name` | may be indexed | - |
| `status` | usually indexed | - |

## References

- Full documentation: `/api/docs/QUERY_PARAMETER_STANDARDS.md`
- Parameter definitions: `/api/api-docs/components/parameters.yaml`
- Response schemas: `/api/api-docs/components/schemas/common.yaml`
- Example implementation: `/api/api-docs/paths/members.yaml#listMembers`
