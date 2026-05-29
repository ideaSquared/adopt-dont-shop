import type { NextFunction, Request, Response } from 'express';

/**
 * Set `Cache-Control: private, no-store, max-age=0` on every API
 * response. Authenticated API responses are personalised to the
 * requester, and without an explicit no-store directive a default-
 * configured CDN / shared proxy could cache a GET and serve it to a
 * different user. Public listings (pets, rescues) currently flow
 * through the same `/api/*` mount but don't expose PII directly — the
 * trade-off is loss of HTTP-level caching on those listings, which the
 * frontend already caches via React Query.
 *
 * Routes that want to allow shared caching (e.g. the signed-URL upload
 * serve at `/uploads/*`, mounted outside `/api/`) are unaffected.
 * Anything inside `/api/*` that intentionally wants to cache should
 * override `Cache-Control` in its own handler after this middleware
 * runs.
 */
export const noStoreCacheControl = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  next();
};
