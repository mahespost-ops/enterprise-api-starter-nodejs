/**
 * Error Handler Middleware Tests
 *
 * Tests error response format adheres to best practices:
 * - message: Detailed, human-readable explanation
 * - error: Generic HTTP status message (error type/category)
 *
 * This enforces RFC 7807 Problem Details and REST API conventions.
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../../../middleware/error-handler.middleware';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
} from '../../../utils/errors';
import { HTTP_STATUS } from '../../../constants/http-status.constants';

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;
  let setHeaderSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnThis();
    setHeaderSpy = jest.fn();

    mockReq = {
      path: '/api/v1/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
      setHeader: setHeaderSpy,
    };

    mockNext = jest.fn();
  });

  describe('Best Practice Enforcement: message vs error fields', () => {
    it('should use custom error message in "message" field (detailed explanation)', () => {
      const customMessage = 'User with this email already exists';
      const err = new ConflictError(customMessage);

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage, // Detailed, human-readable message
          error: 'Conflict', // Generic HTTP status message
        })
      );
    });

    it('should use HTTP status message in "error" field (generic category)', () => {
      const customMessage = 'Invalid email format provided';
      const err = new BadRequestError(customMessage);

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage, // Custom detailed message
          error: 'Bad Request', // Generic status text
        })
      );
    });

    it('should work with NotFoundError custom messages', () => {
      const customMessage = 'User not found with ID: abc123';
      const err = new NotFoundError(customMessage);

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage,
          error: 'Not Found',
        })
      );
    });

    it('should work with UnauthorizedError custom messages', () => {
      const customMessage = 'Invalid magic token provided';
      const err = new UnauthorizedError(customMessage);

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage,
          error: 'Unauthorized',
        })
      );
    });

    it('should work with ForbiddenError custom messages', () => {
      const customMessage = 'You do not have permission to access this resource';
      const err = new ForbiddenError(customMessage);

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage,
          error: 'Forbidden',
        })
      );
    });
  });

  describe('ValidationError', () => {
    it('should include validation errors array', () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'phone', message: 'Must be E.164 format' },
      ];
      const err = new ValidationError(validationErrors, 'Validation failed');

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: 'Validation failed',
          error: 'Unprocessable Entity',
          errors: validationErrors,
        })
      );
    });
  });

  describe('RateLimitError', () => {
    it('should set Retry-After header when provided', () => {
      const err = new RateLimitError('Too Many Requests', 900);

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(setHeaderSpy).toHaveBeenCalledWith('Retry-After', 900);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Too Many Requests',
          error: 'Too Many Requests',
        })
      );
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle unexpected errors gracefully', () => {
      const err = new Error('Something went wrong');

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          message: 'Internal Server Error',
          error: err.message, // In test env, we show the actual error
        })
      );
    });
  });

  describe('Response Structure', () => {
    it('should include required fields: status, message, error, timestamp, path', () => {
      const err = new ConflictError('Resource already exists');

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.any(Number),
          message: expect.any(String),
          error: expect.any(String),
          timestamp: expect.any(String),
          path: '/api/v1/test',
        })
      );
    });

    it('should include stack trace in test environment', () => {
      const err = new AppError(500, 'Test error');

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );
    });
  });

  describe('404 Not Found Handler', () => {
    it('should return 404 with proper message format', () => {
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HTTP_STATUS.NOT_FOUND,
          message: 'Not Found', // Generic HTTP message
          error: 'Cannot GET /api/v1/test', // Specific route error
        })
      );
    });
  });
});
