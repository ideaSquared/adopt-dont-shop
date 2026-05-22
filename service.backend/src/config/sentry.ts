import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logger } from '../utils/logger';

type SentryConfig = {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enabled: boolean;
};

const REDACTED = '[REDACTED]';

/**
 * Keys whose values should be replaced wholesale in `request.data` and
 * breadcrumb `data`. Matched case-insensitively as a substring, so e.g.
 * `passwordHash`, `accessToken`, `apiKey`, `api_key`, `client_secret`,
 * `Authorization` all match.
 */
const SECRET_KEY_PATTERN = /password|token|secret|api[_-]?key|authorization/i;

const redactSecretFields = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactSecretFields);
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => {
      if (SECRET_KEY_PATTERN.test(k)) {
        return [k, REDACTED];
      }
      return [k, redactSecretFields(v)];
    });
    return Object.fromEntries(entries);
  }
  return value;
};

/**
 * UUID v1-v5 pattern. Used to collapse identifier path segments to `:id`
 * so URLs like `/api/v1/users/{uuid}/documents/{uuid}` don't ship the
 * raw identifiers to the external Sentry SaaS.
 */
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Numeric path segment pattern. Matches `/123` when followed by another
 * path separator, query string, fragment, or end-of-string — anchored on
 * the leading slash so we don't accidentally rewrite version markers
 * (e.g. `/v1/`) or numbers inside hostnames.
 */
const NUMERIC_ID_PATTERN = /\/\d+(?=\/|\?|#|$)/g;

const redactUrlIds = (url: string): string =>
  url.replace(UUID_PATTERN, ':id').replace(NUMERIC_ID_PATTERN, '/:id');

/**
 * Strip `authorization` and `cookie` headers from a headers map regardless
 * of casing. Returns a new object — does not mutate input.
 */
const redactHeaders = (
  headers: Record<string, string> | undefined
): Record<string, string> | undefined => {
  if (!headers) {
    return headers;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (lower === 'authorization' || lower === 'cookie') {
      out[k] = REDACTED;
    } else {
      out[k] = v;
    }
  }
  return out;
};

/**
 * Scrub a Sentry event in-place defence-in-depth before it ships to the
 * external SaaS:
 *   - `request.headers.authorization` / `cookie` → `[REDACTED]`
 *   - `request.cookies` → fully replaced (refresh/access tokens are not
 *     useful for debugging)
 *   - `request.data` → walk and redact secret-shaped keys, preserving
 *     overall structure so error context survives
 *   - same redaction applied to `breadcrumbs[].data` and breadcrumb
 *     `message` (HTTP breadcrumbs may contain URLs / request payloads)
 *
 * Exported so the redaction logic is testable in isolation.
 */
export const redactSentryEvent = <T extends Sentry.ErrorEvent>(event: T): T => {
  if (event.request) {
    const request = event.request;
    if (request.headers) {
      request.headers = redactHeaders(request.headers);
    }
    if (request.cookies) {
      request.cookies = { [REDACTED]: REDACTED };
    }
    if (request.data !== undefined && request.data !== null) {
      request.data = redactSecretFields(request.data);
    }
    if (typeof request.url === 'string') {
      request.url = redactUrlIds(request.url);
    }
  }

  if (typeof event.transaction === 'string') {
    event.transaction = redactUrlIds(event.transaction);
  }

  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map(crumb => {
      const next = { ...crumb };
      if (next.data) {
        const redacted = redactSecretFields(next.data);
        // redactSecretFields preserves object shape for object inputs.
        if (redacted && typeof redacted === 'object' && !Array.isArray(redacted)) {
          next.data = redacted as { [key: string]: unknown };
        }
      }
      return next;
    });
  }

  return event;
};

const getSentryConfig = (): SentryConfig => {
  const dsn = process.env.SENTRY_DSN || '';
  const environment = process.env.NODE_ENV || 'development';
  const enabled = Boolean(dsn) && ['production', 'staging'].includes(environment);

  return {
    dsn,
    environment,
    // Capture 100% of transactions for performance monitoring in development
    // Reduce to 10-20% in production for high-traffic applications
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Profiling sample rate
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    enabled,
  };
};

export const initializeSentry = (): void => {
  const config = getSentryConfig();

  if (!config.enabled) {
    logger.info('Sentry is disabled (no DSN configured or NODE_ENV not production/staging)');
    return;
  }

  try {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      integrations: [
        // Performance Profiling
        nodeProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: config.tracesSampleRate,
      // Profiling
      profilesSampleRate: config.profilesSampleRate,
      // Enable debug mode in development
      debug: config.environment === 'development',
      // Release tracking (optional - set via CI/CD)
      release: process.env.SENTRY_RELEASE,
      // Server name
      serverName: process.env.HOSTNAME || 'unknown',
      // Before send hook for filtering/modifying events
      beforeSend(event, hint) {
        // Filter out certain errors or add additional context
        const error = hint.originalException;

        // Don't send validation errors to Sentry
        if (error instanceof Error && error.name === 'ValidationError') {
          return null;
        }

        // Add custom context
        event.extra = {
          ...event.extra,
          nodeVersion: process.version,
          platform: process.platform,
        };

        // Scrub auth headers / cookies / secret-shaped fields from the
        // request payload and breadcrumbs before shipping to Sentry.
        return redactSentryEvent(event);
      },
    });

    logger.info('Sentry initialized successfully', {
      environment: config.environment,
      tracesSampleRate: config.tracesSampleRate,
      profilesSampleRate: config.profilesSampleRate,
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error });
  }
};

export { Sentry };
