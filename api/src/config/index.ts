/**
 * Application Configuration
 * Follows 12-factor methodology: configuration from environment variables
 * Fails fast if required values are missing
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Required environment variables
 */
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
] as const;

/**
 * Validate required environment variables
 * Fails fast on startup if any required variable is missing
 */
function validateEnv(): void {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file or environment configuration.'
    );
  }
}

// Validate on module load
validateEnv();

/**
 * Validate CORS configuration
 * Prevents insecure configuration of credentials with wildcard origin
 */
function validateCors(): void {
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  if (corsOrigin === '*') {
    // Using wildcard origin - credentials must be disabled
    // Note: This is enforced in app.ts CORS config
    console.warn('⚠️  SECURITY WARNING: CORS configured with wildcard origin (*). Credentials will be disabled for security.');
  }
}

validateCors();

/**
 * Application configuration object
 */
export const config = {
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isStaging: process.env.NODE_ENV === 'staging',
  isTest: process.env.NODE_ENV === 'test',

  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    name: process.env.APP_NAME || 'API',
    url: process.env.APP_URL || 'http://localhost:3000',
  },

  email: {
    from: process.env.EMAIL_FROM || 'noreply@example.com',
  },

  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
    poolMin: parseInt(process.env.DB_POOL_MIN || '5', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  magicToken: {
    // TTL in seconds: 1 day for dev/staging, 15 min for production
    ttl:
      process.env.MAGIC_TOKEN_TTL ||
      (process.env.NODE_ENV === 'production' ? '900' : '86400'),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  apiDocs: {
    enabled: process.env.API_DOCS_ENABLED === 'true',
  },
} as const;

export default config;
