/**
 * Express Application Setup
 * Configures middleware and routes
 * Separated from server.ts for testability
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import SwaggerParser from '@apidevtools/swagger-parser';
import path from 'path';

import config from './config';
import logger, { morganStream } from './config/logger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { apiLimiter } from './middleware/rate-limit.middleware';
import { xssSanitizationMiddleware } from './middleware/xss.middleware';
import { auditLogger } from './middleware/audit-logger.middleware';
import { initializeAssociations } from './models/associations';
import { eventTypeCacheService } from './services/event-type-cache.service';

// Initialize Sequelize model associations
initializeAssociations();

/**
 * Create and configure Express application
 */
async function createApp(): Promise<Application> {
  const app = express();

  // ============================================
  // 1. Request ID Middleware (First - for tracing)
  // ============================================
  app.use(requestIdMiddleware);

  // ============================================
  // 2. Logging Middleware
  // ============================================
  const morganFormat = config.isDevelopment ? 'dev' : 'combined';
  app.use(morgan(morganFormat, { stream: morganStream }));

  // ============================================
  // 3. Security Middleware
  // ============================================

  // Helmet - Set security headers with enhanced CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: config.isProduction,
      crossOriginResourcePolicy: { policy: 'same-site' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    })
  );

  // CORS - Configure allowed origins
  // Security: Disable credentials if wildcard origin is used
  const corsOrigin = config.cors.origin;
  const allowCredentials = corsOrigin !== '*';

  app.use(
    cors({
      origin: corsOrigin,
      credentials: allowCredentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ============================================
  // 4. Body Parsing Middleware
  // ============================================
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser()); // Parse cookies for refresh token handling

  // ============================================
  // 4a. XSS Sanitization (After body parsing)
  // ============================================
  app.use(xssSanitizationMiddleware);

  // ============================================
  // 5. Compression Middleware
  // ============================================
  app.use(compression());

  // ============================================
  // 6. API Documentation (Swagger UI)
  // ============================================
  // SECURITY: Only enable API docs in non-production environments
  if (config.apiDocs.enabled && !config.isProduction) {
    try {
      const swaggerDocument = await SwaggerParser.dereference(
        path.join(__dirname, '../api-docs/index.yaml')
      );

      app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(swaggerDocument, {
          customCss: '.swagger-ui .topbar { display: none }',
          customSiteTitle: `${config.app.name} API Documentation`,
        })
      );

      logger.info('API documentation enabled at /api-docs');
    } catch (error) {
      logger.error('Failed to load API documentation', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        details: error,
      });
    }
  } else if (config.apiDocs.enabled && config.isProduction) {
    logger.warn('⚠️  SECURITY: API documentation disabled in production for security. ' +
      'Set NODE_ENV=development to enable docs in non-production environments.');
  }

  // ============================================
  // 7. Event Logging Initialization
  // ============================================
  // Initialize EventTypeCache for O(1) endpoint lookups
  await eventTypeCacheService.initialize();
  logger.info('EventTypeCache initialized', {
    eventTypes: eventTypeCacheService.getStats().size,
  });

  // ============================================
  // 8. Audit Logger Middleware
  // ============================================
  // Register event capture listener (executes after response sent)
  app.use(auditLogger);

  // ============================================
  // 9. API Routes
  // ============================================
  // Apply rate limiting to all API routes
  app.use('/api/', apiLimiter);

  // Mount all routes under /api/v1
  app.use('/api/v1', routes);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: config.app.name,
      version: '1.0.0',
      status: 'running',
      // Security: Don't expose environment in production
      ...(config.isDevelopment && { environment: config.env }),
      documentation: config.apiDocs.enabled ? '/api-docs' : 'disabled',
    });
  });

  // ============================================
  // 10. Error Handling (Last)
  // ============================================

  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  logger.info('Express application configured', {
    environment: config.env,
    port: config.app.port,
    apiDocsEnabled: config.apiDocs.enabled,
  });

  return app;
}

// Export promise that resolves to the configured app
export default createApp();
