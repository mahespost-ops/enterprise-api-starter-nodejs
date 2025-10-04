/**
 * Device Constants
 * Device-related values and defaults
 */

export const TRUST_STATUS = {
  TRUSTED: 'trusted',
  PENDING: 'pending',
  REVOKED: 'revoked',
} as const;

export type TrustStatus = (typeof TRUST_STATUS)[keyof typeof TRUST_STATUS];

export const DEVICE_DEFAULTS = {
  UNKNOWN_TYPE: 'unknown',
  UNKNOWN_OS: 'unknown',
  UNKNOWN_BROWSER: 'unknown',
  UNKNOWN_NAME: 'Unknown Device',
} as const;

export const DEVICE_NAMES = {
  IPHONE: 'iPhone',
  IPAD: 'iPad',
  ANDROID: 'Android Device',
  MAC: 'Mac',
  WINDOWS: 'Windows PC',
  LINUX: 'Linux PC',
} as const;
