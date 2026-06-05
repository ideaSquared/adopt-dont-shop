// Sentry bootstrap — direct port of service.backend's src/config/sentry.ts
// with the service name parameterised so every extracted service can
// report under its own `serverName` while sharing the redaction logic.
//
// Mirrors the existing behaviour exactly:
//   - Only enabled when SENTRY_DSN is set AND NODE_ENV is production or
//     staging. Silent no-op otherwise.
//   - Stamps the active OTel trace_id / span_id on every event so a
//     Sentry exception pivots to the matching distributed trace.
//   - `redactSentryEvent` runs in beforeSend as defence-in-depth before
//     the event ships to the external SaaS:
//       * authorization / cookie headers → [REDACTED]
//       * cookies dict → fully replaced
//       * request.data → walk + redact secret-shaped keys
//       * URLs / transaction names → collapse UUID + numeric path
//         segments to `:id` so identifiers don't leave the boundary
//   - Validation errors are dropped — Sentry isn't the right sink for
//     them.

import { trace } from '@opentelemetry/api';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Logger } from 'winston';

export type SentryOptions = {
  // Used as `serverName` on Sentry events when HOSTNAME isn't set, and
  // surfaced in the logger lines emitted when init starts / fails.
  serviceName: string;
  // Optional Winston logger for boot-path messages. If omitted, falls
  // back to console — useful when this is called BEFORE the logger
  // exists (rare, but the boot order is allowed to permit it).
  logger?: Pick<Logger, 'info' | 'error'>;
};

type SentryConfig = {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enabled: boolean;
};

const REDACTED = '[REDACTED]';

// Keys whose values should be replaced wholesale in request.data and
// breadcrumb data. Matched case-insensitively as a substring, so e.g.
// passwordHash, accessToken, apiKey, api_key, client_secret,
// Authorization all match.
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

// UUID v1-v5 pattern. Used to collapse identifier path segments to `:id`
// so URLs like `/api/v1/users/{uuid}/documents/{uuid}` don't ship the
// raw identifiers to the external Sentry SaaS.
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Numeric path segment pattern. Matches /123 when followed by another
// path separator, query string, fragment, or end-of-string — anchored on
// the leading slash so we don't accidentally rewrite version markers
// (e.g. /v1/) or numbers inside hostnames.
const NUMERIC_ID_PATTERN = /\/\d+(?=\/|\?|#|$)/g;

const redactUrlIds = (url: string): string =>
  url.replace(UUID_PATTERN, ':id').replace(NUMERIC_ID_PATTERN, '/:id');

// Strip authorization and cookie headers from a headers map regardless
// of casing. Returns a new object — does not mutate input.
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

// Scrub a Sentry event in-place defence-in-depth before it ships:
//   - request.headers.authorization / cookie → [REDACTED]
//   - request.cookies → fully replaced
//   - request.data → walk and redact secret-shaped keys
//   - request.url + event.transaction → collapse UUID / numeric ids
//   - breadcrumbs[].data → same redaction
// Exported so the redaction logic is testable in isolation.
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
    // 100% in dev for visibility; 10% in production to control volume.
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    enabled,
  };
};

export const initializeSentry = (opts: SentryOptions): void => {
  const config = getSentryConfig();
  const log = opts.logger ?? console;

  if (!config.enabled) {
    log.info('Sentry is disabled (no DSN configured or NODE_ENV not production/staging)');
    return;
  }

  try {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: config.tracesSampleRate,
      profilesSampleRate: config.profilesSampleRate,
      debug: config.environment === 'development',
      release: process.env.SENTRY_RELEASE,
      serverName: process.env.HOSTNAME || opts.serviceName,
      beforeSend(event, hint) {
        const error = hint.originalException;

        // Validation errors aren't useful in Sentry — they're caller
        // errors, not bugs.
        if (error instanceof Error && error.name === 'ValidationError') {
          return null;
        }

        event.extra = {
          ...event.extra,
          nodeVersion: process.version,
          platform: process.platform,
        };

        // ADS-660: stamp the OTel trace_id on every event so an
        // exception pivots to the matching trace in Tempo / Jaeger.
        const activeSpan = trace.getActiveSpan();
        if (activeSpan) {
          const spanContext = activeSpan.spanContext();
          if (spanContext.traceId) {
            event.contexts = {
              ...event.contexts,
              trace: {
                ...event.contexts?.trace,
                trace_id: spanContext.traceId,
                span_id: spanContext.spanId,
              },
            };
            event.tags = {
              ...event.tags,
              trace_id: spanContext.traceId,
            };
          }
        }

        return redactSentryEvent(event);
      },
    });

    log.info('Sentry initialized successfully', {
      service: opts.serviceName,
      environment: config.environment,
      tracesSampleRate: config.tracesSampleRate,
      profilesSampleRate: config.profilesSampleRate,
    });
  } catch (error) {
    log.error('Failed to initialize Sentry', { error });
  }
};
