/**
 * Cryptography Constants
 * Token generation and encryption values
 */

export const CRYPTO_DEFAULTS = {
  REFRESH_TOKEN_BYTES: 32,
  MAGIC_TOKEN_BYTES: 32,
} as const;

export const MAGIC_CODE = {
  MIN: 100000,
  MAX: 999999,
  RANGE: 900000, // MAX - MIN
} as const;
