import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors from express-validator
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // ADS-455: schema/semantic violations are 422 per RFC 9110.
    // Express's body-parser already converts unparseable JSON to a
    // 400, so by the time this middleware runs the body is well-
    // formed but semantically invalid.
    res.status(422).json({
      success: false,
      error: 'Validation Error',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined,
      })),
    });
    return;
  }

  next();
};
