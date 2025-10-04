/**
 * Pagination Constants
 * Default values and limits for pagination
 */

export const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  OFFSET: 0,
} as const;

export const PAGINATION_LIMITS = {
  MIN: 1,
  MAX: 100,
} as const;
