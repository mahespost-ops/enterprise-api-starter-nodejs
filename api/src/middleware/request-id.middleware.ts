/**
 * Request ID Middleware
 * Generates unique correlation ID for each request for tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

/**
 * Middleware to add unique request ID to each request
 * Sets X-Request-ID header on response for client tracking
 * Adds request ID to logger context for log correlation
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate unique request ID
  const requestId = uuidv4();

  // Attach to request object (augmented via src/types/express.d.ts)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).id = requestId;

  // Set response header for client
  res.setHeader('X-Request-ID', requestId);

  // Add to logger context (will appear in all logs for this request)
  logger.defaultMeta = {
    ...logger.defaultMeta,
    requestId,
  };

  logger.debug(`Request started: ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    requestId,
  });

  // Track response time
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end.bind(res);

  // Override end to add response time before sending
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.end = function (...args: any[]): any {
    const duration = Date.now() - startTime;

    // Set response time header before ending
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }

    logger.info(`Request completed: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      requestId,
    });

    // Call original end
    return originalEnd(...args);
  };

  next();
}

export default requestIdMiddleware;
