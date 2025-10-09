/**
 * Validation Constants
 * Field limits and validation patterns
 */

export const FIELD_LIMITS = {
  // Names
  NAME_MAX: 50,
  FULL_NAME_MAX: 100,
  ORG_NAME_MAX: 100,
  ENV_NAME_MAX: 50,

  // Text fields
  DESCRIPTION_MAX: 500,
  URL_MAX: 500,
} as const;

export const FINGERPRINT_VALIDATION = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
} as const;

export const VALIDATION_PATTERNS = {
  SIX_DIGIT_CODE: /^\d{6}$/,
} as const;

export const BOOLEAN_STRINGS = {
  TRUE: 'true',
  FALSE: 'false',
} as const;
