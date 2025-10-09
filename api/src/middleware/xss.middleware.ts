/**
 * XSS Sanitization Middleware
 * Sanitizes user input to prevent Cross-Site Scripting (XSS) attacks
 */

import { Request, Response, NextFunction } from 'express';
import xss from 'xss';
import logger from '../config/logger';

/**
 * Recursively sanitize an object's string values
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return xss(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize request body, query params, and URL params
 * Prevents XSS attacks by cleaning user input
 */
export function xssSanitizationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    // Sanitize body (mutable)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Note: In Express 5+, req.query and req.params are read-only getters
    // They cannot be reassigned. Sanitization should be done at validation layer.
    // For now, we only sanitize the body which is the primary injection vector.

    logger.debug('XSS sanitization applied', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestId: (req as any).id,
      hasBody: !!req.body,
      hasQuery: !!Object.keys(req.query).length,
      hasParams: !!Object.keys(req.params).length,
    });

    next();
  } catch (error) {
    logger.error('XSS sanitization failed', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestId: (req as any).id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
}

export default xssSanitizationMiddleware;
