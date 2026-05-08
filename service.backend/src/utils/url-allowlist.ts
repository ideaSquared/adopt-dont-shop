/**
 * ADS-438: validate FRONTEND_URL / RESCUE_FRONTEND_URL before interpolating
 * them into user-facing email links (password reset, email verification).
 *
 * If the env var is misconfigured, points at an unrelated host, or — in the
 * worst case — has been tampered with, the previous code would happily mail
 * "https://attacker.example/reset-password?token=..." to legitimate users.
 *
 * The helper:
 * - returns the env value unchanged if it parses, is HTTPS in production
 *   (or HTTP+localhost in dev), and its origin matches one of the allowed
 *   environment-configured frontends;
 * - logs and throws on misconfiguration so emails fail loudly instead of
 *   silently leaking tokens to a wrong host.
 */
import { logger } from './logger';

const SAFE_DEV_HOSTS = new Set(['localhost', '127.0.0.1']);

const parseOrUndefined = (raw: string | undefined): URL | undefined => {
  if (!raw) {
    return undefined;
  }
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
};

const collectAllowedOrigins = (): Set<string> => {
  const allowed = new Set<string>();
  for (const key of ['FRONTEND_URL', 'RESCUE_FRONTEND_URL']) {
    const url = parseOrUndefined(process.env[key]);
    if (url) {
      allowed.add(url.origin);
    }
  }
  return allowed;
};

const assertProductionScheme = (url: URL): void => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  if (url.protocol !== 'https:') {
    throw new Error(`Refusing to build link with non-HTTPS scheme in production: ${url.origin}`);
  }
};

const assertDevHostSafe = (url: URL): void => {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  if (url.protocol === 'https:') {
    return;
  }
  if (!SAFE_DEV_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing to build HTTP link to non-loopback host in non-prod: ${url.origin}`);
  }
};

/**
 * Returns the supplied URL string only if its origin matches one of the
 * configured frontend hosts (FRONTEND_URL, RESCUE_FRONTEND_URL) and the
 * scheme is acceptable for the current environment.
 *
 * Throws if validation fails — callers should let the error propagate so
 * emails are not sent with bogus links.
 */
export const assertAllowedFrontendUrl = (raw: string): string => {
  const url = parseOrUndefined(raw);
  if (!url) {
    throw new Error(`Invalid frontend URL: "${raw}" is not parseable`);
  }
  assertProductionScheme(url);
  assertDevHostSafe(url);

  const allowed = collectAllowedOrigins();
  if (allowed.size === 0) {
    // No env-configured frontends — the only way the URL can be trusted is
    // if we are in development and pointing at loopback.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot build frontend link in production: FRONTEND_URL is not configured');
    }
    return raw;
  }
  if (!allowed.has(url.origin)) {
    logger.warn('Frontend URL origin not in allowlist', {
      origin: url.origin,
      allowed: Array.from(allowed),
    });
    throw new Error(`Frontend URL origin ${url.origin} is not in the configured allowlist`);
  }
  return raw;
};

/**
 * Convenience helper: read FRONTEND_URL from the environment, validate it,
 * and return the validated origin (without trailing slash). Throws on
 * misconfiguration. Use this in email link builders.
 */
export const getValidatedFrontendOrigin = (): string => {
  const raw = process.env.FRONTEND_URL;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FRONTEND_URL is not set in production');
    }
    return 'http://localhost:3000';
  }
  const validated = assertAllowedFrontendUrl(raw);
  // Strip trailing slash to keep concatenation predictable.
  return validated.replace(/\/$/, '');
};
