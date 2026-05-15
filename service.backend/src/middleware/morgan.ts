import { NextFunction, Request, Response } from 'express';
import { loggerHelpers } from '../utils/logger';
import type { AuthenticatedRequest } from '../types/auth';

/**
 * ADS-448 / ADS-462: structured HTTP access log middleware.
 *
 * Replaces morgan's plaintext `combined` output with a single JSON line
 * per request, emitted through Winston's `loggerHelpers.logRequest` so it
 * carries the correlation ID, status, latency, route and user fields. The
 * log level is selected by status code (5xx → error, 4xx → warn, else
 * http) to match the rest of the structured-logging contract.
 */
export const httpAccessLog = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number((process.hrtime.bigint() - start) / 1_000_000n);
    loggerHelpers.logRequest(req as AuthenticatedRequest, res, duration);
  });

  next();
};
