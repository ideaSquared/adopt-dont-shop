import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

/**
 * If express-validator recorded any errors for this request, write the
 * canonical 422 `details` envelope and return true. Otherwise return false.
 *
 * ADS-784: single source of truth for the validation-error response shape.
 * Both the `handleValidationErrors` middleware and the controllers that still
 * run `validationResult(req)` inline delegate here, so the API exposes exactly
 * ONE validation-error envelope (422 + `details`) instead of the old mix of
 * 400 `{message, errors}` and 422 `{error, details}`.
 *
 * ADS-455: schema/semantic violations are 422 per RFC 9110. Express's
 * body-parser already converts unparseable JSON to a 400, so by the time this
 * runs the body is well-formed but semantically invalid.
 */
export const sendValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return false;
  }
  res.status(422).json({
    success: false,
    error: 'Validation Error',
    details: errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    })),
  });
  return true;
};

/**
 * Middleware to handle validation errors from express-validator.
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  if (sendValidationErrors(req, res)) {
    return;
  }
  next();
};
