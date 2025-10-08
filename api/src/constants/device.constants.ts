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

/**
 * Device filterable fields (for admin list endpoint)
 */
export const DEVICE_FILTERABLE_FIELDS = {
  USER_ID: 'userId',
  TRUST_STATUS: 'trustStatus',
  DEVICE_TYPE: 'deviceType',
  IS_REVOKED: 'isRevoked',
  CREATED_AT: 'createdAt',
  LAST_USED_AT: 'lastUsedAt',
} as const;

/**
 * Device sortable fields (for admin list endpoint)
 */
export const DEVICE_SORTABLE_FIELDS = {
  NAME: 'deviceName',
  DEVICE_TYPE: 'deviceType',
  TRUST_STATUS: 'trustStatus',
  CREATED_AT: 'createdAt',
  LAST_USED_AT: 'lastUsedAt',
} as const;

/**
 * Device searchable fields (for admin list endpoint)
 */
export const DEVICE_SEARCHABLE_FIELDS = ['deviceName', 'os', 'browser'] as const;
