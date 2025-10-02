/**
 * Custom Error Classes
 * Aligned with OpenAPI specification error responses
 */

import { HTTP_STATUS, HTTP_STATUS_MESSAGE } from '../constants/http-status.constants';

/**
 * Base Application Error
 * All custom errors extend this class
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly message: string;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(status: number, message: string, isOperational = true) {
    super(message);
    this.status = status;
    this.message = message;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message = HTTP_STATUS_MESSAGE[HTTP_STATUS.BAD_REQUEST]) {
    super(HTTP_STATUS.BAD_REQUEST, message);
  }
}

/**
 * 401 Unauthorized
 * Authentication failed or missing
 */
export class UnauthorizedError extends AppError {
  constructor(message = HTTP_STATUS_MESSAGE[HTTP_STATUS.UNAUTHORIZED]) {
    super(HTTP_STATUS.UNAUTHORIZED, message);
  }
}

/**
 * 403 Forbidden
 * User lacks permission to access resource
 */
export class ForbiddenError extends AppError {
  constructor(message = HTTP_STATUS_MESSAGE[HTTP_STATUS.FORBIDDEN]) {
    super(HTTP_STATUS.FORBIDDEN, message);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message = HTTP_STATUS_MESSAGE[HTTP_STATUS.NOT_FOUND]) {
    super(HTTP_STATUS.NOT_FOUND, message);
  }
}

/**
 * 409 Conflict
 * Resource already exists
 */
export class ConflictError extends AppError {
  constructor(message = HTTP_STATUS_MESSAGE[HTTP_STATUS.CONFLICT]) {
    super(HTTP_STATUS.CONFLICT, message);
  }
}

/**
 * 422 Unprocessable Entity
 * Validation failed
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationError extends AppError {
  public readonly errors: ValidationErrorDetail[];

  constructor(
    errors: ValidationErrorDetail[],
    message = HTTP_STATUS_MESSAGE[HTTP_STATUS.UNPROCESSABLE_ENTITY]
  ) {
    super(HTTP_STATUS.UNPROCESSABLE_ENTITY, message);
    this.errors = errors;
  }
}

/**
 * 429 Too Many Requests
 * Rate limit exceeded
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number; // seconds

  constructor(message = HTTP_STATUS_MESSAGE[HTTP_STATUS.TOO_MANY_REQUESTS], retryAfter?: number) {
    super(HTTP_STATUS.TOO_MANY_REQUESTS, message);
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(
    message = HTTP_STATUS_MESSAGE[HTTP_STATUS.INTERNAL_SERVER_ERROR],
    isOperational = false
  ) {
    super(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, isOperational);
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = HTTP_STATUS_MESSAGE[HTTP_STATUS.SERVICE_UNAVAILABLE]) {
    super(HTTP_STATUS.SERVICE_UNAVAILABLE, message);
  }
}
