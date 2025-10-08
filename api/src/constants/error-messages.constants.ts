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
  NO_AUTH_HEADER: 'No authorization header provided',
  NO_TOKEN_PROVIDED: 'No token provided',
  USER_NOT_AUTHENTICATED: 'User not authenticated',
  USER_CONTEXT_MISSING: 'User context missing from request',

  // Authorization
  FORBIDDEN: 'Insufficient permissions to access this resource',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to access this resource',
  INVALID_ROLE: 'Invalid user role',

  // Validation
  VALIDATION_FAILED: 'Validation failed',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PHONE: 'Invalid phone number',
  REQUIRED_FIELD: 'This field is required',

  // Resources
  USER_NOT_FOUND: 'User not found',
  DEVICE_NOT_FOUND: 'Device not found',
  DEVICE_NOT_FOUND_OR_ACCESS_DENIED: 'Device not found or access denied',
  DEVICE_ACCESS_DENIED: 'You do not have permission to access this device',
  SESSION_NOT_FOUND: 'Session not found',
  SESSION_NOT_FOUND_OR_ACCESS_DENIED: 'Session not found or access denied',
  SESSION_ACCESS_DENIED: 'You do not have permission to access this session',
  RESOURCE_NOT_FOUND: 'Resource not found',
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  ENVIRONMENT_NOT_FOUND: 'Environment not found',
  NOT_ORGANIZATION_MEMBER: 'You are not a member of this organization',
  MEMBER_NOT_FOUND: 'Member not found',
  GROUP_NOT_FOUND: 'Group not found',
  GROUP_MEMBER_NOT_FOUND: 'User is not a member of this group',
  EVENT_NOT_FOUND: 'Event not found',
  WEBHOOK_NOT_FOUND: 'Webhook not found',
  WEBHOOK_DELIVERY_NOT_FOUND: 'Webhook delivery not found',
  ROLE_NOT_FOUND: 'Role not found',
  PERMISSION_NOT_FOUND: 'Permission not found',
  ROLE_PERMISSION_NOT_FOUND: 'Permission is not assigned to this role',

  // Conflicts
  USER_EXISTS: 'User with this email already exists',
  PHONE_EXISTS: 'Phone number already registered',
  ORGANIZATION_SLUG_EXISTS: 'Organization with this slug already exists',
  GROUP_MEMBER_EXISTS: 'User is already a member of this group',
  ROLE_NAME_EXISTS: 'Role with this name already exists',
  ROLE_PERMISSION_EXISTS: 'Permission is already assigned to this role',
  CANNOT_MODIFY_SYSTEM_ROLE: 'System-defined roles cannot be modified',
  CANNOT_DELETE_SYSTEM_ROLE: 'System-defined roles cannot be deleted',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later',
  TOO_MANY_ATTEMPTS: 'Too many attempts. Please try again later',
  RATE_LIMIT_MESSAGE: 'You have exceeded the rate limit. Please try again later.',
  AUTH_RATE_LIMIT_MESSAGE: 'Too many login attempts. Please try again later.',

  // Server Errors
  INTERNAL_ERROR: 'An unexpected error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  DATABASE_ERROR: 'Database operation failed',

  // Magic Token
  INVALID_MAGIC_TOKEN: 'Invalid or expired magic token',
  TOKEN_ALREADY_USED: 'This token has already been used',
  TOKEN_REQUEST_FAILED: 'Failed to send magic token',
  IDENTIFIER_NOT_FOUND: 'No user found with this email or phone number',
  TOKEN_USER_NOT_FOUND: 'Token is valid but associated user no longer exists',
  INVALID_FINGERPRINT: 'Invalid device fingerprint. Please ensure cookies are enabled.',

  // Device
  MAX_DEVICES_REACHED: 'Maximum number of devices reached',
  DEVICE_REVOKED: 'This device has been revoked',

  // Session
  SESSION_EXPIRED: 'Session has expired',
  SESSION_REVOKED: 'Session has been revoked',
  INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token',
  SESSION_USER_NOT_FOUND: 'Session is valid but associated user no longer exists',

  // Environment/Organization Business Rules
  CANNOT_DELETE_DEFAULT_ENV: 'Cannot delete the default environment',
  CANNOT_DELETE_LAST_ENV: 'Cannot delete the last remaining environment',
  ENVIRONMENT_NOT_IN_ORGANIZATION: 'Environment not found in this organization',
  ENVIRONMENT_NOT_FOUND_IN_ORG: 'Environment does not exist in this organization',

  // Multi-tenant Context Validation
  ORGANIZATION_CONTEXT_MISMATCH: 'Access denied: Organization context mismatch',
  ENVIRONMENT_CONTEXT_MISMATCH: 'Access denied: Environment context mismatch',

  // Impersonation
  IMPERSONATION_SESSION_NOT_FOUND: 'Impersonation session not found',
  NOT_CURRENTLY_IMPERSONATING: 'You are not currently impersonating anyone',
  CANNOT_IMPERSONATE_SELF: 'Cannot impersonate yourself',
  CANNOT_IMPERSONATE_PEER_OR_SUPERIOR: 'Cannot impersonate member at same or higher hierarchy level',
  IMPERSONATION_SESSION_EXPIRED: 'Impersonation session has expired',
  INVALID_IMPERSONATION_DURATION: 'Impersonation duration must be between 5 and 480 minutes',

  // Generic
  UNKNOWN_ERROR: 'Unknown error',
} as const;

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];

/**
 * Helper function to safely extract error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Helper function to check if error has a specific name
 */
export function isErrorWithName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}
