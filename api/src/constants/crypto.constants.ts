/**
 * Cryptography Constants
 * Token generation and encryption values
 */

export const CRYPTO_DEFAULTS = {
  REFRESH_TOKEN_BYTES: 32,
  MAGIC_TOKEN_BYTES: 32,
} as const;

export const MAGIC_CODE = {
  MIN: 10000000, // 8 digits (was 6 digits)
  MAX: 99999999,  // 8 digits (was 6 digits)
  RANGE: 90000000, // MAX - MIN (increased from 900,000 to 90,000,000 = 100x larger keyspace)
} as const;
