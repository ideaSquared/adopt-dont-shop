import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodObject, ZodSchema } from 'zod';

/**
 * ADS-456: enforce that unknown keys are stripped before the parsed
 * value reaches services / Sequelize models. Zod's default for
 * `z.object` is `.strip()`, but a future schema that switches to
 * `.passthrough()` would silently forward arbitrary keys (prototype-
 * pollution / unexpected-write risk). Calling `.strip()` here makes
 * the validator authoritative regardless of the schema author's
 * choice.
 */
const stripIfObject = <T>(schema: ZodSchema<T>): ZodSchema<T> => {
  if (schema instanceof ZodObject) {
    return schema.strip() as unknown as ZodSchema<T>;
  }
  return schema;
};

/**
 * Validate `req.body` against a Zod schema, replacing the parsed value
 * back onto the request so downstream handlers see the canonical shape
 * (lowercase email, normalized phone, coerced dates, etc.).
 *
 * ADS-455: returns 422 for schema-validation failures (well-formed
 * JSON but semantically invalid per RFC 9110); 400 stays reserved for
 * unparseable JSON (Express body-parser handles those before the
 * route runs).
 */
export const validateBody = <T>(schema: ZodSchema<T>) => {
  const stripped = stripIfObject(schema);
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = stripped.safeParse(req.body);
    if (!result.success) {
      res.status(422).json(zodErrorPayload(result.error));
      return;
    }
    req.body = result.data;
    next();
  };
};

/**
 * Validate `req.query` and re-assign the parsed (coerced) value.
 *
 * Express's `req.query` is a plain object; numeric / boolean coercion
 * happens via `z.coerce.*` in the schema, which lets the same schema
 * also serve JSON-body callers.
 */
export const validateQuery = <T>(schema: ZodSchema<T>) => {
  const stripped = stripIfObject(schema);
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = stripped.safeParse(req.query);
    if (!result.success) {
      res.status(422).json(zodErrorPayload(result.error));
      return;
    }
    // Express 5: `req.query` is a getter on the prototype, not a writable
    // property. Plain assignment is a no-op (or throws in strict mode),
    // which silently leaves downstream handlers reading unparsed query
    // strings — surfaced as 500s on routes that depend on Zod coercion
    // (numeric pagination, default-applied filters, etc.). Redefine the
    // property on the request instance so the getter is shadowed for the
    // remainder of this request.
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
};

/**
 * Validate `req.params` (route parameters). Schemas are typically tiny
 * (e.g. a UUID-shaped string).
 */
export const validateParams = <T>(schema: ZodSchema<T>) => {
  const stripped = stripIfObject(schema);
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = stripped.safeParse(req.params);
    if (!result.success) {
      res.status(422).json(zodErrorPayload(result.error));
      return;
    }
    (req as unknown as { params: T }).params = result.data;
    next();
  };
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
