import { NextFunction, Request, Response } from 'express';
import { runWithContext } from '../utils/request-context';

/**
 * Establish a fresh AsyncLocalStorage context for the lifetime of one
 * request. Mounted before auth so the auth middleware can fill in userId
 * later. Without this, getUserId() in model hooks always returns undefined.
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  runWithContext({}, () => next());
};
