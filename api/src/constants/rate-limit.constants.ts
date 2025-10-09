/**
 * Rate Limit Constants
 * Rate limiting configuration values
 */

export const RATE_LIMIT_WINDOWS = {
  AUTH_ENDPOINT: 15 * 60 * 1000, // 15 minutes
  PUBLIC_ENDPOINT: 1 * 60 * 1000, // 1 minute
} as const;

export const RATE_LIMIT_MAX = {
  AUTH_ENDPOINT: 5,
  PUBLIC_ENDPOINT: 30,
} as const;

export const RATE_LIMIT_RETRY = {
  AUTH_ENDPOINT_MINUTES: 15,
} as const;

export const RATE_LIMIT_DEFAULTS = {
  WINDOW_MS: 900000, // 15 minutes
} as const;
