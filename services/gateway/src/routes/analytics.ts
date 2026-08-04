// Gateway-folded /api/v1/analytics/* surface.
//
// Per the migration plan: "small static reads + log-only ingestion fold
// into service.gateway". The monolith's analytics endpoints (pageviews,
// events, batched events) are pure log-and-acknowledge — the data
// never lands in a database, only in winston which ships to Loki. The
// gateway can absorb them without a backing service.
//
// Path map mirrors service.backend's analytics.routes.ts:
//   POST /api/v1/analytics/pageviews     → 201 { success, message }
//   POST /api/v1/analytics/events        → 201 { success, message }
//   POST /api/v1/analytics/events/batch  → 201 { success, message, processed }
//   GET  /api/v1/analytics/health        → 200 { success, status, service, timestamp }
//
// Pageviews + events accept anonymous traffic (no auth header
// required); the principal-headers populated by the authenticate
// middleware are forwarded to the log line as `userId` when present.

import { redactSecretFields, redactUrl } from '@adopt-dont-shop/observability';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Logger } from 'winston';

export type AnalyticsRoutesOptions = {
  logger: Logger;
};

// Unauthenticated ingestion endpoints, so they carry their own per-route caps
// (ADS-1038) on top of the global limiter — a client can't cheaply inflate Loki
// ingest. Pageviews/events fire frequently from the SPA; batch is heavier
// (up to MAX_BATCH events per request) so it's tighter.
const ANALYTICS_RATE_LIMIT = { max: 120, timeWindow: '1 minute' } as const;
const ANALYTICS_BATCH_RATE_LIMIT = { max: 60, timeWindow: '1 minute' } as const;

// Serialised-size ceiling for a logged `properties` object. redactSecretFields
// only masks by key, so an attacker could still ship an unbounded blob under
// innocuous keys — bound the whole thing before it reaches a log line.
const MAX_PROPERTIES_BYTES = 2048;

type PageviewBody = {
  path?: string;
  url?: string;
  timestamp?: string;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
};

type EventBody = {
  event?: string;
  name?: string;
  type?: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
};

type BatchBody = {
  events?: EventBody[];
};

const userIdFromHeaders = (req: FastifyRequest): string | undefined => {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const raw = headers['x-user-id'];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
};

const sessionLengthCap = 256;

// Truncate operator-supplied strings so a hostile client can't blow up
// the winston shipper's per-line buffer. Same defence we apply at every
// other ingestion seam.
const cap = (s: string | undefined): string | undefined => {
  if (!s) {
    return s;
  }
  return s.length > sessionLengthCap ? s.slice(0, sessionLengthCap) : s;
};

// A URL/path/referrer safe to log: the fragment is dropped first (an OAuth-style
// `#access_token=...` or a hash-routed `#/verify-email?token=...` carries the
// same secret risk as the query string), then redactUrl drops the query string
// (ADS-972/ADS-1038) and masks known secret-bearing path segments, then it's
// length-capped. Undefined in, undefined out.
const safeUrl = (s: string | undefined): string | undefined =>
  s ? cap(redactUrl(s.split('#')[0] ?? '')) : s;

// Redact secret-keyed fields, then bound the serialised size so one request
// can't emit an unbounded log line. Over the ceiling → a marker, not the blob.
const boundedProperties = (properties: Record<string, unknown> | undefined): unknown => {
  if (!properties || typeof properties !== 'object') {
    return {};
  }
  const redacted = redactSecretFields(properties);
  let serialised: string;
  try {
    serialised = JSON.stringify(redacted);
  } catch {
    return { _dropped: 'unserialisable' };
  }
  // Byte length, not String.length — a non-ASCII payload is more bytes than
  // UTF-16 code units, and the ceiling is about the Loki line size.
  const bytes = Buffer.byteLength(serialised);
  if (bytes > MAX_PROPERTIES_BYTES) {
    return { _truncated: true, _bytes: bytes };
  }
  return redacted;
};

export const registerAnalyticsRoutes = async (
  app: FastifyInstance,
  opts: AnalyticsRoutesOptions
): Promise<void> => {
  const { logger } = opts;

  app.post(
    '/api/v1/analytics/pageviews',
    {
      config: { rateLimit: ANALYTICS_RATE_LIMIT },
      schema: {
        tags: ['analytics'],
        summary: 'Record a page view event',
        security: [],
        body: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            url: { type: 'string' },
            timestamp: { type: 'string' },
            sessionId: { type: 'string' },
            referrer: { type: 'string' },
            userAgent: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as PageviewBody;
      const pagePath = body.path || body.url || req.url || 'unknown';
      logger.info('Pageview recorded', {
        service: 'analytics',
        type: 'pageview',
        data: {
          // Drop the query string before logging — reset/verify/invite routes
          // carry a live token there (ADS-1038). Same for referrer.
          path: safeUrl(pagePath),
          timestamp: body.timestamp || new Date().toISOString(),
          userId: userIdFromHeaders(req),
          sessionId: cap(body.sessionId),
          referrer: safeUrl(body.referrer),
          userAgent: cap(body.userAgent),
          ip: req.ip,
        },
      });
      return reply.code(201).send({ success: true, message: 'Pageview recorded' });
    }
  );

  app.post(
    '/api/v1/analytics/events',
    {
      config: { rateLimit: ANALYTICS_RATE_LIMIT },
      schema: {
        tags: ['analytics'],
        summary: 'Record a single analytics event',
        security: [],
        body: {
          type: 'object',
          properties: {
            event: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            timestamp: { type: 'string' },
            sessionId: { type: 'string' },
            properties: { type: 'object', additionalProperties: true },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as EventBody;
      const eventName = body.event || body.name || body.type || 'unknown';
      logger.info('Analytics event recorded', {
        service: 'analytics',
        type: 'single_event',
        data: {
          event: cap(eventName),
          timestamp: body.timestamp || new Date().toISOString(),
          properties: boundedProperties(body.properties),
          userId: userIdFromHeaders(req),
          sessionId: cap(body.sessionId),
          ip: req.ip,
        },
      });
      return reply.code(201).send({ success: true, message: 'Event recorded' });
    }
  );

  app.post(
    '/api/v1/analytics/events/batch',
    {
      config: { rateLimit: ANALYTICS_BATCH_RATE_LIMIT },
      schema: {
        tags: ['analytics'],
        summary: 'Record a batch of analytics events',
        security: [],
        body: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              processed: { type: 'integer' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as BatchBody;
      if (!Array.isArray(body.events)) {
        return reply.code(400).send({ success: false, message: 'Events must be an array' });
      }
      // Same cap-per-batch the monolith implied (no explicit limit but
      // logging 10k events in one line would be wasteful). 1000 covers
      // any sane analytics flush window.
      const MAX_BATCH = 1000;
      if (body.events.length > MAX_BATCH) {
        return reply.code(400).send({ success: false, message: `Batch size exceeds ${MAX_BATCH}` });
      }
      logger.info('Batch events recorded', {
        service: 'analytics',
        type: 'batch_events',
        count: body.events.length,
        userId: userIdFromHeaders(req),
        ip: req.ip,
        events: body.events.map(event => ({
          event: cap(event.event || event.name || event.type || 'unknown'),
          timestamp: event.timestamp || new Date().toISOString(),
          properties: boundedProperties(event.properties),
        })),
      });
      return reply.code(201).send({
        success: true,
        message: 'Events recorded',
        processed: body.events.length,
      });
    }
  );

  app.get(
    '/api/v1/analytics/health',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Health check for the analytics endpoint',
        security: [],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              status: { type: 'string' },
              timestamp: { type: 'string' },
              service: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'analytics',
    })
  );
};
