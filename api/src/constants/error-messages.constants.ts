/**
 * Error Message Constants
 * Centralized error messages for consistency across the application
 */

export const ERROR_MESSAGES = {
  // Authentication
  INVALID_TOKEN: 'Invalid or expired token',
  MISSING_TOKEN: 'Authentication token is required',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Unauthorized access',

  // Authorization
  FORBIDDEN: 'Insufficient permissions to access this resource',
  INVALID_ROLE: 'Invalid user role',

  // Validation
  VALIDATION_FAILED: 'Validation failed',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PHONE: 'Invalid phone number',
  REQUIRED_FIELD: 'This field is required',

  // Resources
  USER_NOT_FOUND: 'User not found',
  DEVICE_NOT_FOUND: 'Device not found',
  SESSION_NOT_FOUND: 'Session not found',
  RESOURCE_NOT_FOUND: 'Resource not found',

  // Conflicts
  USER_EXISTS: 'User with this email already exists',
  PHONE_EXISTS: 'Phone number already registered',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later',
  TOO_MANY_ATTEMPTS: 'Too many attempts. Please try again later',

  // Server Errors
  INTERNAL_ERROR: 'An unexpected error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  DATABASE_ERROR: 'Database operation failed',

  // Magic Token
  INVALID_MAGIC_TOKEN: 'Invalid or expired magic token',
  TOKEN_ALREADY_USED: 'This token has already been used',
  TOKEN_REQUEST_FAILED: 'Failed to send magic token',

  // Device
  MAX_DEVICES_REACHED: 'Maximum number of devices reached',
  DEVICE_REVOKED: 'This device has been revoked',

  // Session
  SESSION_EXPIRED: 'Session has expired',
  SESSION_REVOKED: 'Session has been revoked',
  INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token',
} as const;

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];
