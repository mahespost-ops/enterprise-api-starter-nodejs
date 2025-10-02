/**
 * Logger Configuration (Winston)
 * Centralized logging with environment-specific levels
 */

import winston from 'winston';
import config from './index';

/**
 * Log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format for development (human-readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

/**
 * Create logger instance
 * Following 12-factor methodology: logs only to console (stdout/stderr)
 * Log aggregation should be handled by external tools (Cloud Logging, etc.)
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: config.app.name },
  transports: [
    // Console transport - 12-factor: log to stdout
    new winston.transports.Console({
      format: config.isDevelopment ? consoleFormat : logFormat,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Stream for Morgan HTTP request logging
 */
export const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

export default logger;
