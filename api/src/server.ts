/**
 * Server Entry Point
 * Starts HTTP server and handles graceful shutdown
 * Separated from app.ts for testability
 */

import http from 'http';
import appPromise from './app';
import config from './config';
import logger from './config/logger';
import sequelize from './config/database';
import { eventProcessorService } from './services/event-processor.service';
import { getAdapterFactory } from './services/adapter.factory';

/**
 * Normalize port number
 */
function normalizePort(val: string | number): number {
  const port = typeof val === 'string' ? parseInt(val, 10) : val;

  if (isNaN(port) || port < 0) {
    throw new Error(`Invalid port: ${val}`);
  }

  return port;
}

/**
 * Initialize server
 */
async function initServer(): Promise<http.Server> {
  const app = await appPromise;
  const port = normalizePort(config.app.port);
  const server = http.createServer(app);

  /**
   * Server error handler
   */
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

    switch (error.code) {
      case 'EACCES':
        logger.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  /**
   * Server listening event
   */
  server.on('listening', () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;

    logger.info(`Server started successfully`, {
      environment: config.env,
      bind,
      processId: process.pid,
    });
  });

  /**
   * Graceful shutdown handler
   * Closes server and cleans up resources
   */
  async function gracefulShutdown(signal: string): Promise<void> {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error('Error during server shutdown', { error: err });
        process.exit(1);
      }

      logger.info('Server closed. Cleaning up resources...');

      try {
        // Flush pending events to database
        logger.info('Flushing pending events...');
        await eventProcessorService.shutdown();
        logger.info('Event processor shutdown complete');

        // Close database connections
        await sequelize.close();
        logger.info('Database connections closed');

        // Close adapter connections (message queue, etc.)
        await getAdapterFactory().cleanup();
        logger.info('Adapters cleaned up');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during cleanup', { error });
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }

  /**
   * Register shutdown handlers
   */
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  /**
   * Start server
   */
  server.listen(port);

  return server;
}

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });

  // Exit process - let process manager restart
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection', { reason });

  // Exit process - let process manager restart
  process.exit(1);
});

// Start the server
const serverPromise = initServer();

export default serverPromise;
