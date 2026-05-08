import { NextFunction, Request, Response } from 'express';

/**
 * ADS-515: API deprecation strategy.
 *
 * All routes currently live under `/api/v1`. When a route (or an
 * entire version) is being retired, attach `deprecate({ sunset })`
 * to surface the deprecation in standard HTTP headers so client
 * developers see it without polling release notes:
 *
 *   - `Deprecation: true` (RFC 8594 draft) — flags any request to
 *     a deprecated route.
 *   - `Sunset: <HTTP-date>` (RFC 8594) — when the route will stop
 *     responding successfully.
 *   - `Link: <docs-url>; rel="deprecation"` (optional) — pointer to
 *     migration guidance.
 *
 * Deprecation policy (documented here so it's discoverable in code):
 * 1. New API versions ship under `/api/v2`. The old version keeps
 *    receiving security fixes for at least 6 months after v2 GA.
 * 2. From the v2 GA date, every v1 response carries `Deprecation:
 *    true` plus a `Sunset` date >= 6 months in the future.
 * 3. After the sunset date, v1 routes return 410 Gone (handled at
 *    the route mount, not by this helper).
 */
export type DeprecationOptions = {
  /** RFC 7231 HTTP-date string (e.g. `new Date(...).toUTCString()`). */
  sunset: string;
  /** Optional URL to migration documentation. */
  link?: string;
};

export const deprecate =
  (options: DeprecationOptions) =>
  (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', options.sunset);
    if (options.link) {
      res.setHeader('Link', `<${options.link}>; rel="deprecation"`);
    }
    next();
  };
