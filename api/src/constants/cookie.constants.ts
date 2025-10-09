/**
 * Cookie Constants
 * Centralized constants for cookie configuration
 */

export const COOKIE_NAMES = {
  REFRESH_TOKEN: 'refreshToken',
} as const;

export const COOKIE_OPTIONS = {
  HTTP_ONLY: true,
  SAME_SITE_STRICT: 'strict',
  SAME_SITE_LAX: 'lax',
  SAME_SITE_NONE: 'none',
} as const;

export type SameSiteOption =
  | typeof COOKIE_OPTIONS.SAME_SITE_STRICT
  | typeof COOKIE_OPTIONS.SAME_SITE_LAX
  | typeof COOKIE_OPTIONS.SAME_SITE_NONE;
