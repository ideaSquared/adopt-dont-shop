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
