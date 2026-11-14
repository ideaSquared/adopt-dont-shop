// Gateway-folded /api/v1/analytics/* surface.
//
// Per the migration plan: "small static reads + log-only ingestion fold
// into service.gateway". The monolith's analytics endpoints (pageviews,
// events, batched events) are pure log-and-acknowledge — the data
// never lands in a database, only in the structured log, which ships to Loki. The
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

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { type ServiceLogger } from '../logger.js';

export type AnalyticsRoutesOptions = {
  logger: ServiceLogger;
};

// Unauthenticated ingestion endpoints, so they carry their own per-route caps
// (ADS-1038) on top of the global limiter — a client can't cheaply inflate Loki
// ingest. Pageviews/events fire frequently from the SPA; batch is heavier
// (up to MAX_BATCH events per request) so it's tighter.
const ANALYTICS_RATE_LIMIT = { max: 120, timeWindow: '1 minute' } as const;
const ANALYTICS_BATCH_RATE_LIMIT = { max: 60, timeWindow: '1 minute' } as const;

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
// the log shipper's per-line buffer. Same defence we apply at every
// other ingestion seam.
const cap = (s: string | undefined): string | undefined => {
  if (!s) {
    return s;
  }
  return s.length > sessionLengthCap ? s.slice(0, sessionLengthCap) : s;
};

export const registerAnalyticsRoutes = async (
  app: FastifyInstance,
  opts: AnalyticsRoutesOptions
): Promise<void> => {
  const { logger } = opts;

  app.post(
    '/api/v1/analytics/pageviews',
    {
      config: { public: true, rateLimit: ANALYTICS_RATE_LIMIT },
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
      // The page path is client-supplied and can carry an email, a name or a token, so it is
      // never logged. Only the caller's id is.
      logger.info('Pageview recorded', { userId: userIdFromHeaders(req) ?? null });
      return reply.code(201).send({ success: true, message: 'Pageview recorded' });
    }
  );

  app.post(
    '/api/v1/analytics/events',
    {
      config: { public: true, rateLimit: ANALYTICS_RATE_LIMIT },
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
        event: cap(eventName) ?? null,
        userId: userIdFromHeaders(req) ?? null,
      });
      return reply.code(201).send({ success: true, message: 'Event recorded' });
    }
  );

  app.post(
    '/api/v1/analytics/events/batch',
    {
      config: { public: true, rateLimit: ANALYTICS_BATCH_RATE_LIMIT },
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
        count: body.events.length,
        userId: userIdFromHeaders(req) ?? null,
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
      config: { public: true },
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
