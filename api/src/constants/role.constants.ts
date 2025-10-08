/**
 * Role Constants
 * Centralized constants for role management
 */

/**
 * Filterable fields for role queries
 * Used in admin list endpoints for filtering
 */
export const ROLE_FILTERABLE_FIELDS = {
  IS_SYSTEM: 'isSystem',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const;

/**
 * Sortable fields for role queries
 * Used in admin list endpoints for sorting
 */
export const ROLE_SORTABLE_FIELDS = {
  NAME: 'name',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  PERMISSION_COUNT: 'permissionCount',
} as const;

/**
 * Searchable fields for role queries
 * Used in admin list endpoints for full-text search
 */
export const ROLE_SEARCHABLE_FIELDS = ['name', 'description'] as const;

/**
 * Selectable fields for role responses
 * Controls which fields can be returned in API responses
 */
export const ROLE_SELECTABLE_FIELDS = [
  'id',
  'name',
  'description',
  'isSystem',
  'permissionCount',
  'createdAt',
  'updatedAt',
  'deletedAt',
] as const;
