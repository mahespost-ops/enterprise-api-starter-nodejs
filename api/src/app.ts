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
import swaggerUi from 'swagger-ui-express';
import SwaggerParser from '@apidevtools/swagger-parser';
import path from 'path';

import config from './config';
import logger, { morganStream } from './config/logger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';

/**
 * Create and configure Express application
 */
async function createApp(): Promise<Application> {
  const app = express();

  // ============================================
  // 1. Logging Middleware (First)
  // ============================================
  const morganFormat = config.isDevelopment ? 'dev' : 'combined';
  app.use(morgan(morganFormat, { stream: morganStream }));

  // ============================================
  // 2. Security Middleware
  // ============================================

  // Helmet - Set security headers
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction,
      crossOriginEmbedderPolicy: config.isProduction,
    })
  );

  // CORS - Configure allowed origins
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ============================================
  // 3. Body Parsing Middleware
  // ============================================
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ============================================
  // 4. Compression Middleware
  // ============================================
  app.use(compression());

  // ============================================
  // 5. API Documentation (Swagger UI)
  // ============================================
  if (config.apiDocs.enabled) {
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
      logger.warn('Failed to load API documentation', { error });
    }
  }

  // ============================================
  // 6. API Routes
  // ============================================
  // Mount all routes under /api/v1
  app.use('/api/v1', routes);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: config.app.name,
      version: '1.0.0',
      status: 'running',
      environment: config.env,
      documentation: config.apiDocs.enabled ? '/api-docs' : 'disabled',
    });
  });

  // ============================================
  // 7. Error Handling (Last)
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
