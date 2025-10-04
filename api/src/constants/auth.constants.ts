/**
 * Authentication Constants
 * Centralized constants for authentication values to avoid magic strings
 */

/**
 * Delivery methods for magic tokens
 */
export const DELIVERY_METHOD = {
  EMAIL: 'email',
  SMS: 'sms',
} as const;

export type DeliveryMethod = (typeof DELIVERY_METHOD)[keyof typeof DELIVERY_METHOD];

/**
 * Token expiration times (in seconds)
 */
export const TOKEN_EXPIRATION = {
  MAGIC_TOKEN: 900, // 15 minutes
  ACCESS_TOKEN: 900, // 15 minutes
  REFRESH_TOKEN: 2592000, // 30 days
} as const;

/**
 * Token expiration times in milliseconds
 * Note: For date calculations and cookie maxAge
 */
export const TOKEN_EXPIRATION_MS = {
  MAGIC_TOKEN: TOKEN_EXPIRATION.MAGIC_TOKEN * 1000,
  ACCESS_TOKEN: TOKEN_EXPIRATION.ACCESS_TOKEN * 1000,
  REFRESH_TOKEN: TOKEN_EXPIRATION.REFRESH_TOKEN * 1000,
} as const;

/**
 * JWT expiration string formats
 * Note: Used with jsonwebtoken library's expiresIn option
 */
export const JWT_EXPIRATION = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '30d',
} as const;

/**
 * Identifier types for polymorphic identifier field
 */
export const IDENTIFIER_TYPE = {
  EMAIL: 'email',
  PHONE: 'phone',
} as const;

export type IdentifierType = (typeof IDENTIFIER_TYPE)[keyof typeof IDENTIFIER_TYPE];

/**
 * Regular expressions for identifier validation
 */
export const IDENTIFIER_REGEX = {
  // RFC 5322 simplified email regex
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // E.164 international phone format: +[country code][number]
  // Country code: 1-3 digits, followed by subscriber number
  // Total length: 1-15 digits (E.164 standard)
  // Examples: +12025551234 (US), +442071234567 (UK), +81312345678 (Japan)
  PHONE_E164: /^\+[1-9]\d{1,14}$/,
} as const;

/**
 * Token type for Authorization header
 */
export const TOKEN_TYPE = 'Bearer' as const;

/**
 * Environment types
 */
export const ENVIRONMENT_TYPE = {
  LIVE: 'live',
  SANDBOX: 'sandbox',
} as const;

export type EnvironmentType = (typeof ENVIRONMENT_TYPE)[keyof typeof ENVIRONMENT_TYPE];
