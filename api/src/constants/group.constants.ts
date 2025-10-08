/**
 * Group Constants
 * Group-related values and defaults
 */

/**
 * Filterable fields for admin group list endpoint
 */
export const GROUP_FILTERABLE_FIELDS = {
  ORGANIZATION_ID: 'organizationId',
  PARENT_ID: 'parentId',
  HIERARCHY_LEVEL: 'hierarchyLevel',
  IS_ACTIVE: 'isActive',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const;

/**
 * Sortable fields for admin group list endpoint
 */
export const GROUP_SORTABLE_FIELDS = {
  NAME: 'name',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  HIERARCHY_LEVEL: 'hierarchyLevel',
  MEMBER_COUNT: 'memberCount',
} as const;

/**
 * Searchable fields for admin group list endpoint
 * Full-text search across these fields
 */
export const GROUP_SEARCHABLE_FIELDS = ['name', 'description'] as const;
