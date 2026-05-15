import { doubleCsrf, DoubleCsrfConfigOptions } from 'csrf-csrf';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

// CSRF Configuration
const isProduction = process.env.NODE_ENV === 'production';

// ADS-546: per-browser session identifier cookie. Set the first time we see
// a request without a userId or an existing session cookie; rotated by the
// auth flow on login (handled in csrfErrorHandler / login controller —
// future hardening). `__Host-` prefix in prod pins the cookie to the
// current host with no Domain attribute, blocking subdomain CSRF.
const CSRF_SESSION_COOKIE = isProduction ? '__Host-csrf-session' : 'csrf-session';
const CSRF_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict' as const,
  path: '/',
  // 30 days — long enough that the same browser keeps the same identifier
  // through the CSRF token's lifetime, short enough that a stale value
  // expires eventually.
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

type RequestWithCookies = Request & {
  cookies?: Record<string, string | undefined>;
  user?: { userId?: string };
};

// Exported for unit tests — the real csrf-csrf wiring goes through the
// mocked doubleCsrf factory and never calls this directly.
export const resolveCsrfSessionIdentifier = (req: Request): string => {
  const reqWithCookies = req as RequestWithCookies;

  // 1. Authenticated request — bind to the user. Logout / login rotates
  //    the CSRF token (see csrf-csrf docs) so the same browser carries a
  //    different identifier across sessions.
  const userId = reqWithCookies.user?.userId;
  if (userId) {
    return `user:${userId}`;
  }

  // 2. Anonymous request — bind to the per-browser session cookie. The
  //    cookie value is opaque (UUID) so it leaks nothing, and the
  //    HttpOnly + SameSite=Strict attributes prevent client-side scripts
  //    or cross-origin requests from observing or replaying it.
  const existing = reqWithCookies.cookies?.[CSRF_SESSION_COOKIE];
  if (existing) {
    return `anon:${existing}`;
  }

  // 3. No identifier yet — mint one, set the cookie, and use it. csrf-csrf
  //    calls getSessionIdentifier during both generate and validate, so
  //    we attach the cookie via res.cookie when the Response is
  //    accessible. If neither a userId nor a session cookie can be
  //    minted (no Response on the Request — should never happen in
  //    Express), fail closed.
  const res = (req as Request & { res?: Response }).res;
  if (!res || typeof res.cookie !== 'function') {
    throw new Error(
      'CSRF: unable to resolve a session identifier — no authenticated user, no session cookie, ' +
        'and no Response on which to mint one'
    );
  }
  const newId = randomUUID();
  res.cookie(CSRF_SESSION_COOKIE, newId, CSRF_SESSION_COOKIE_OPTIONS);
  // Cache on the request so subsequent calls within the same request
  // (generate → set cookie → validate path) return the same value.
  if (reqWithCookies.cookies) {
    reqWithCookies.cookies[CSRF_SESSION_COOKIE] = newId;
  } else {
    reqWithCookies.cookies = { [CSRF_SESSION_COOKIE]: newId };
  }
  return `anon:${newId}`;
};

const csrfConfig: DoubleCsrfConfigOptions = {
  getSecret: () => config.security.csrfSecret, // Validated at startup (minimum 32 characters)
  // ADS-546: stable per-browser identifier with no 'anonymous' fallback.
  // The previous req.ip binding broke for two reasons:
  //  - mobile users roam between Wi-Fi / cellular, switching IP mid-session
  //    and invalidating their CSRF token;
  //  - many users behind shared NAT (corporate VPN, café Wi-Fi) collapse to
  //    the same identifier, so an attacker on the same egress IP could
  //    pre-mint a valid token. Fails closed — the helper throws if neither
  //    a userId nor a session cookie can be resolved or minted.
  getSessionIdentifier: resolveCsrfSessionIdentifier,
  // Use __Host- prefix only in production (requires secure context)
  cookieName: isProduction ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: isProduction,
    httpOnly: true,
  },
  size: 64, // Size of the generated token
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'] as Array<'GET' | 'HEAD' | 'OPTIONS'>,
};

// Initialize CSRF protection
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf(csrfConfig);

/**
 * Middleware to generate and attach CSRF token to response
 * Use this on routes that render forms or need to provide tokens to clients
 */
export const csrfTokenGenerator = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const csrfToken = generateCsrfToken(req, res);

    // Attach token to response locals for template rendering
    res.locals.csrfToken = csrfToken;

    // Also send in header for API consumers
    res.setHeader('X-CSRF-Token', csrfToken);

    next();
  } catch (error) {
    logger.error('Failed to generate CSRF token', { error });
    next(error);
  }
};

/**
 * Middleware to validate CSRF tokens on state-changing requests
 * Automatically validates POST, PUT, PATCH, DELETE requests
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Route handler to provide CSRF token to clients
 * Clients should call this endpoint to get a token before making state-changing requests
 */
export const getCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // overwrite: true ensures a fresh token+cookie pair is always issued when
    // this endpoint is called explicitly, preventing stale tokens from being
    // re-used if a browser cookie has become out of sync with the cached token.
    const token = generateCsrfToken(req, res, { overwrite: true });
    res.json({
      csrfToken: token,
    });
  } catch (error) {
    logger.error('Failed to generate CSRF token', { error });
    next(error);
  }
};

/**
 * Error handler for CSRF validation failures
 */
export const csrfErrorHandler = (
  err: Error & { code?: string },
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.code === 'EBADCSRFTOKEN' || err.message?.toLowerCase().includes('csrf')) {
    logger.warn('CSRF token validation failed', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed. Please refresh and try again.',
    });
  } else {
    next(err);
  }
};
