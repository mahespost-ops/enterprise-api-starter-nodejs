/**
 * Role Assignment Constants
 * Centralized constants for role assignment management
 */

/**
 * Filterable fields for role assignment queries
 * Used in admin list endpoints for filtering
 */
export const ROLE_ASSIGNMENT_FILTERABLE_FIELDS = {
  ORGANIZATION_ID: 'organizationId',
  ENVIRONMENT_ID: 'environmentId',
  MEMBERSHIP_ID: 'membershipId',
  GROUP_ID: 'groupId',
  ROLE_ID: 'roleId',
  ASSIGNEE_TYPE: 'assigneeType',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const;

/**
 * Sortable fields for role assignment queries
 * Used in admin list endpoints for sorting
 */
export const ROLE_ASSIGNMENT_SORTABLE_FIELDS = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  ORGANIZATION_ID: 'organizationId',
  ENVIRONMENT_ID: 'environmentId',
  ASSIGNEE_TYPE: 'assigneeType',
} as const;

/**
 * Searchable fields for role assignment queries
 * Used in admin list endpoints for full-text search
 * Note: These are nested fields accessed via associations
 */
export const ROLE_ASSIGNMENT_SEARCHABLE_FIELDS = [
  'role.name',
  'organization.name',
  'environment.name',
] as const;

/**
 * Selectable fields for role assignment responses
 * Controls which fields can be returned in API responses
 */
export const ROLE_ASSIGNMENT_SELECTABLE_FIELDS = [
  'id',
  'environmentId',
  'membershipId',
  'groupId',
  'roleId',
  'assigneeType',
  'role',
  'member',
  'group',
  'organization',
  'environment',
  'createdAt',
  'updatedAt',
] as const;

/**
 * Valid assignee types for role assignments
 */
export const ASSIGNEE_TYPES = {
  MEMBER: 'member',
  GROUP: 'group',
} as const;
