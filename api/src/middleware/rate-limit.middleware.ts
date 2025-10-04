/**
 * Rate Limiting Middleware
 * Protects API from abuse and DDoS attacks
 */

import rateLimitLib from 'express-rate-limit';
import config from '../config';
import logger from '../config/logger';

/**
 * General API rate limiter
 * Applied to all API routes
 * Disabled in test environment to prevent test interference
 */
export const apiLimiter = rateLimitLib({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  skip: () => config.env === 'test',
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000 / 60), // minutes
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestId: (req as any).id,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000 / 60),
    });
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 * Prevents brute force attacks
 * Disabled in test environment to prevent test interference
 */
export const authLimiter = rateLimitLib({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skip: () => config.env === 'test',
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts. Please try again later.',
    retryAfter: 15, // minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth attempts
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestId: (req as any).id,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: 15,
    });
  },
});

/**
 * Permissive rate limiter for public endpoints
 * Higher limits for read-only operations
 * Disabled in test environment to prevent test interference
 */
export const publicLimiter = rateLimitLib({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  skip: () => config.env === 'test',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Export rate limiters as named object for convenience
 */
export const rateLimit = {
  apiEndpoint: apiLimiter,
  authEndpoint: authLimiter,
  publicEndpoint: publicLimiter,
};
