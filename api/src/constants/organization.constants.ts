/**
 * Organization Constants
 *
 * Centralized constants for organization-related logic to avoid magic strings
 * Note: Organizations use isActive (boolean) not status (enum)
 */

/**
 * Organization Sortable Fields
 */
export const ORGANIZATION_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'name',
  'status',
  'slug',
] as const;

/**
 * Organization Searchable Fields (for full-text search)
 */
export const ORGANIZATION_SEARCHABLE_FIELDS = ['name', 'slug'] as const;

/**
 * Organization Selectable Fields (for field selection)
 */
export const ORGANIZATION_SELECTABLE_FIELDS = [
  'id',
  'name',
  'slug',
  'status',
  'defaultEnvId',
  'metadata',
  'createdAt',
  'updatedAt',
] as const;

/**
 * Organization Filterable Fields
 */
export const ORGANIZATION_FILTERABLE_FIELDS = {
  IS_ACTIVE: 'isActive',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const;

/**
 * Default Pagination Values for Organization Lists
 */
export const ORGANIZATION_LIST_DEFAULTS = {
  LIMIT: 20,
  OFFSET: 0,
  SORT: '-createdAt',
} as const;
