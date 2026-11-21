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
//       * secret-shaped headers (authorization, cookie, x-principal-token ...) → [REDACTED]
//       * cookies dict → fully replaced
//       * request.data → walk + redact secret-shaped keys, mask PII-shaped keys
//         (the same shared redact.ts passes the log pipeline uses)
//       * URLs / transaction names → collapse UUID + numeric path
//         segments to `:id` so identifiers don't leave the boundary
//   - Validation errors are dropped — Sentry isn't the right sink for
//     them.

import { trace } from '@opentelemetry/api';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

import { deployEnvironment } from './deploy-environment.js';
import { BASE_LOG_FIELDS, createLogger, type BaseLogger } from './logger.js';
import { maskPiiFields, REDACTED, redactSecretFields, SECRET_KEY_PATTERN } from './redact.js';

export type SentryOptions = {
  // Used as `serverName` on Sentry events when HOSTNAME isn't set, and
  // surfaced in the logger lines emitted when init starts / fails.
  serviceName: string;
  // Optional logger for boot-path messages. If omitted, a
  // boot logger writes to the console — useful when this is called BEFORE the logger
  // exists (rare, but the boot order is allowed to permit it).
  logger?: Pick<BaseLogger, 'info' | 'error'>;
};

type SentryConfig = {
  dsn: string;
  // The label events carry (DEPLOY_ENV when set); sampling and enablement stay on NODE_ENV.
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enabled: boolean;
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

// Redact every header whose name is secret-shaped (authorization, cookie,
// set-cookie, x-principal-token, x-csrf-token, x-api-key, x-client-location
// ...) using the shared pattern, regardless of casing. Returns a new object —
// does not mutate input.
const redactHeaders = (
  headers: Record<string, string> | undefined
): Record<string, string> | undefined => {
  if (!headers) {
    return headers;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (SECRET_KEY_PATTERN.test(k)) {
      out[k] = REDACTED;
    } else {
      out[k] = v;
    }
  }
  return out;
};

// The caller's coordinates travel as query params on the search/detail/nearby
// requests. They are precise PII and no secret-key redaction would catch them
// (the names are not secret-shaped), so drop them from URLs and query strings.
const COORDINATE_PARAMS = new Set(['lat', 'lng', 'latitude', 'longitude']);

const stripCoordinateParams = (url: string): string => {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return url;
  }
  const kept = url
    .slice(queryStart + 1)
    .split('&')
    .filter(pair => !COORDINATE_PARAMS.has(pair.split('=')[0]));
  return kept.length > 0
    ? `${url.slice(0, queryStart)}?${kept.join('&')}`
    : url.slice(0, queryStart);
};

const stripCoordinateQuery = (
  query: NonNullable<Sentry.ErrorEvent['request']>['query_string']
): NonNullable<Sentry.ErrorEvent['request']>['query_string'] => {
  if (typeof query === 'string') {
    return stripCoordinateParams(`?${query}`).slice(1);
  }
  if (query !== null && typeof query === 'object' && !Array.isArray(query)) {
    return Object.fromEntries(Object.entries(query).filter(([key]) => !COORDINATE_PARAMS.has(key)));
  }
  return query;
};

// Scrub a Sentry event in-place defence-in-depth before it ships:
//   - secret-shaped request.headers → [REDACTED]
//   - request.cookies → fully replaced
//   - request.data → walk, redact secret-shaped keys and mask PII-shaped keys
//   - request.url + event.transaction → collapse UUID / numeric ids
//   - request.url + request.query_string → drop lat/lng/latitude/longitude
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
      request.data = maskPiiFields(redactSecretFields(request.data));
    }
    if (typeof request.url === 'string') {
      request.url = stripCoordinateParams(redactUrlIds(request.url));
    }
    if (request.query_string !== undefined) {
      request.query_string = stripCoordinateQuery(request.query_string);
    }
  }

  if (typeof event.transaction === 'string') {
    event.transaction = redactUrlIds(event.transaction);
  }

  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map(crumb => {
      const next = { ...crumb };
      if (next.data) {
        const redacted = maskPiiFields(redactSecretFields(next.data));
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
  const nodeEnv = process.env.NODE_ENV || 'development';
  const enabled = Boolean(dsn) && ['production', 'staging'].includes(nodeEnv);

  return {
    dsn,
    environment: deployEnvironment(),
    // 100% in dev for visibility; 10% in production to control volume.
    tracesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,
    profilesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,
    enabled,
  };
};

export const initializeSentry = (opts: SentryOptions): void => {
  const config = getSentryConfig();
  const log =
    opts.logger ?? createLogger({ serviceName: opts.serviceName, fields: BASE_LOG_FIELDS });

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
      debug: process.env.NODE_ENV === 'development',
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

    log.info('Sentry initialized successfully');
  } catch (error) {
    log.error('Failed to initialize Sentry', {}, error);
  }
};
