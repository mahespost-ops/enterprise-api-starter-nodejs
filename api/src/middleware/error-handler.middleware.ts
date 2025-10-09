/**
 * Error Handler Middleware
 * Catches all errors and formats responses according to OpenAPI spec
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, RateLimitError } from '../utils/errors';
import { HTTP_STATUS, HTTP_STATUS_MESSAGE } from '../constants/http-status.constants';
import logger from '../config/logger';
import config from '../config';

/**
 * Error response interface matching OpenAPI spec
 */
interface ErrorResponse {
  status: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
  stack?: string;
}

/**
 * Global error handling middleware
 * Must be registered last in middleware stack
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error with context
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Handle known application errors
  if (err instanceof AppError) {
    const statusMessage = HTTP_STATUS_MESSAGE[err.status as keyof typeof HTTP_STATUS_MESSAGE];
    const response: ErrorResponse = {
      status: err.status,
      message: err.message, // Detailed, human-readable explanation
      error: statusMessage, // Generic HTTP status message (error type/category)
      timestamp: err.timestamp,
      path: req.path,
    };

    // Include validation errors if present
    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    // Include retry-after header for rate limit errors
    if (err instanceof RateLimitError && err.retryAfter) {
      res.setHeader('Retry-After', err.retryAfter);
    }

    // Include stack trace only in safe development environments
    // Security: Don't expose stack traces in staging/public dev environments
    const SAFE_ENVS = ['development', 'test'];
    if (!config.isProduction && SAFE_ENVS.includes(config.env)) {
      response.stack = err.stack;
    }

    res.status(err.status).json(response);
    return;
  }

  // Handle unknown/unexpected errors
  const response: ErrorResponse = {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: HTTP_STATUS_MESSAGE[HTTP_STATUS.INTERNAL_SERVER_ERROR],
    error: config.isProduction
      ? 'An unexpected error occurred'
      : err.message,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Include stack trace only in safe development environments
  // Security: Don't expose stack traces in staging/public dev environments
  const SAFE_ENVS = ['development', 'test'];
  if (!config.isProduction && SAFE_ENVS.includes(config.env)) {
    response.stack = err.stack;
  }

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);
};

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const response: ErrorResponse = {
    status: HTTP_STATUS.NOT_FOUND,
    message: HTTP_STATUS_MESSAGE[HTTP_STATUS.NOT_FOUND],
    error: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  res.status(HTTP_STATUS.NOT_FOUND).json(response);
};

export default errorHandler;
