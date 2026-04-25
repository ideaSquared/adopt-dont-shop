import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';

/**
 * Validate `req.body` against a Zod schema, replacing the parsed value
 * back onto the request so downstream handlers see the canonical shape
 * (lowercase email, normalized phone, coerced dates, etc.).
 *
 * Error response matches the existing express-validator middleware
 * (see ./validation.ts) so the API contract for malformed requests
 * doesn't change as we migrate per-route.
 */
export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(zodErrorPayload(result.error));
      return;
    }
    req.body = result.data;
    next();
  };

/**
 * Validate `req.query` and re-assign the parsed (coerced) value.
 *
 * Express's `req.query` is a plain object; numeric / boolean coercion
 * happens via `z.coerce.*` in the schema, which lets the same schema
 * also serve JSON-body callers.
 */
export const validateQuery =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json(zodErrorPayload(result.error));
      return;
    }
    // Express types `req.query` as a ParsedQs; we knowingly replace it
    // with the parsed Zod output (mirrors what handleValidationErrors +
    // req.query mutation already does in practice).
    (req as unknown as { query: T }).query = result.data;
    next();
  };

/**
 * Validate `req.params` (route parameters). Schemas are typically tiny
 * (e.g. a UUID-shaped string).
 */
export const validateParams =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json(zodErrorPayload(result.error));
      return;
    }
    (req as unknown as { params: T }).params = result.data;
    next();
  };

/** Same shape as handleValidationErrors's response. */
const zodErrorPayload = (error: ZodError) => ({
  success: false,
  error: 'Validation Error',
  details: error.issues.map(issue => ({
    field: issue.path.join('.') || 'unknown',
    message: issue.message,
    // express-validator surfaces the offending value; Zod doesn't keep
    // it on the issue object, so we leave it undefined for parity.
    value: undefined,
  })),
});
