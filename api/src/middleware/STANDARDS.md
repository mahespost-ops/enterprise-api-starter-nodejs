# Middleware Standards

Middleware functions process requests before they reach controllers. They handle cross-cutting concerns like authentication, authorization, validation, and rate limiting.

## File Naming
- Pattern: `{function}.middleware.ts`
- Examples: `authenticate.middleware.ts`, `validate.middleware.ts`, `rate-limit.middleware.ts`

## Function Naming
- Use camelCase
- Use descriptive, action-oriented names
- Examples: `authenticate`, `authorize`, `validateRequest`, `rateLimitAuth`

## Structure

```typescript
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import logger from '../config/logger';

/**
 * Middleware description
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const middlewareFunction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Perform middleware logic
    logger.debug('Middleware executing');

    // Attach data to request if needed
    req.user = { id: '123', role: 'user' };

    // Pass control to next middleware/controller
    next();
  } catch (error) {
    // Pass errors to error handling middleware
    next(error);
  }
};
```

## Middleware Order

Applied in this sequence (critical for performance and security):

1. **Logging** (Morgan/Winston) - Log all requests
2. **Security** (Helmet, CORS) - Set security headers
3. **Body Parsing** (express.json) - Parse request body
4. **Compression** - Compress responses
5. **Rate Limiting (Global)** - Apply global limits
6. **Route-Specific Middleware**:
   a. Rate limiting (endpoint-specific)
   b. Authentication (verify JWT)
   c. Parameter validation (req.params)
   d. Authorization (RBAC)
   e. Body validation (req.body for POST/PUT/PATCH)
7. **Controller Execution**
8. **Error Handling** (catch-all)

## Types of Middleware

### 1. Authentication Middleware

Verifies JWT and attaches user to request:

```typescript
import jwt from 'jsonwebtoken';
import config from '../config';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError(ERROR_MESSAGES.MISSING_TOKEN);
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError(ERROR_MESSAGES.INVALID_TOKEN));
    } else {
      next(error);
    }
  }
};
```

### 2. Authorization Middleware (RBAC)

Checks user permissions:

```typescript
import { ForbiddenError } from '../utils/errors';

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(ERROR_MESSAGES.FORBIDDEN));
    }

    next();
  };
};

// Usage: authorize(['admin', 'manager'])
```

### 3. Validation Middleware

Validates request data using Joi:

```typescript
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

export const validate = {
  params: (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        return next(new ValidationError(errors));
      }

      req.params = value;
      next();
    };
  },

  body: (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true, // Remove unknown fields
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        return next(new ValidationError(errors));
      }

      req.body = value;
      next();
    };
  },

  query: (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        return next(new ValidationError(errors));
      }

      req.query = value;
      next();
    };
  },
};
```

### 4. Rate Limiting Middleware

Prevents abuse:

```typescript
import rateLimit from 'express-rate-limit';
import { RateLimitError } from '../utils/errors';
import config from '../config';

// Auth endpoints (strict)
export const rateLimitAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isProduction ? 3 : 100,
  message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new RateLimitError(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, 900));
  },
});

// API endpoints (moderate)
export const rateLimitApi = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: config.isProduction ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 5. Error Handling Middleware

Catches all errors and formats responses:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { HTTP_STATUS } from '../constants/http-status.constants';
import logger from '../config/logger';
import config from '../config';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known errors
  if (err instanceof AppError) {
    const response: any = {
      status: err.status,
      message: err.message,
      error: err.message,
      timestamp: err.timestamp,
      path: req.path,
    };

    // Include validation errors if present
    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    // Don't expose stack trace in production
    if (!config.isProduction) {
      response.stack = err.stack;
    }

    res.status(err.status).json(response);
    return;
  }

  // Handle unknown errors
  const response: any = {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Internal Server Error',
    error: config.isProduction
      ? 'An unexpected error occurred'
      : err.message,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  if (!config.isProduction) {
    response.stack = err.stack;
  }

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);
};
```

## TypeScript Types

Extend Express types for custom request properties:

```typescript
// src/types/express.d.ts
import { JwtPayload } from './jwt';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}
```

## Performance Considerations

- **Fast Fail**: Parameter validation before body validation
- **Caching**: Cache rate limit counters in Redis
- **Async Operations**: Use async/await, avoid blocking operations

## Testing

Test middleware in isolation:

```typescript
// tests/unit/middleware/authenticate.middleware.test.ts
import { authenticate } from '../../../src/middleware/authenticate.middleware';
import { UnauthorizedError } from '../../../src/utils/errors';

describe('Authenticate Middleware', () => {
  it('should attach user to request when token is valid', async () => {
    const req = {
      headers: { authorization: 'Bearer valid-token' },
    } as Request;
    const res = {} as Response;
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user).toBeDefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('should throw UnauthorizedError when token is missing', async () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
```

## File Size
- Target: <300 lines per middleware file
- >500 lines: Must refactor by logical grouping
