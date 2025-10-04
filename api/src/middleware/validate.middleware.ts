/**
 * Validation Middleware
 * Validates request data (params, body, query) using Joi schemas
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

/**
 * Validation middleware factory
 * Creates middleware functions that validate different parts of the request
 */
export const validate = {
  /**
   * Validate request parameters (URL params)
   * @param schema - Joi schema for validation
   */
  params: (schema: Joi.ObjectSchema) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: false,
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

  /**
   * Validate request body
   * @param schema - Joi schema for validation
   */
  body: (schema: Joi.ObjectSchema) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true, // Remove unknown fields for security
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

  /**
   * Validate query parameters
   * @param schema - Joi schema for validation
   */
  query: (schema: Joi.ObjectSchema) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: false,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        return next(new ValidationError(errors));
      }

      // req.query is read-only, use Object.assign to update it
      Object.assign(req.query, value);
      next();
    };
  },
};
