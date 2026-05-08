import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { runWithContext, setCorrelationId } from '../utils/request-context';

/**
 * Establish a fresh AsyncLocalStorage context for the lifetime of one
 * request. Mounted before auth so the auth middleware can fill in userId
 * later. Without this, getUserId() in model hooks always returns undefined.
 *
 * ADS-405: also generates a correlation ID for every request that arrives
 * without one and propagates it via AsyncLocalStorage so Winston log calls
 * automatically stamp the ID without threading it through every signature.
 * The ID is also echoed back as `X-Correlation-ID` so callers (and load
 * balancer logs) can correlate too.
 */
const CORRELATION_HEADER = 'x-correlation-id';
const REQUEST_ID_HEADER = 'x-request-id';

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  runWithContext({}, () => {
    const incoming =
      (req.get(CORRELATION_HEADER) ?? req.get(REQUEST_ID_HEADER) ?? '').trim() || undefined;
    const correlationId = incoming ?? randomUUID();
    setCorrelationId(correlationId);
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });
};
