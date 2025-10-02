/**
 * Express Request type extensions
 * Adds custom properties to Express Request object
 */

declare global {
  namespace Express {
    interface Request {
      /** Unique request ID for tracing and correlation */
      id: string;
    }
  }
}

// Export empty object to make this a module
export {};
