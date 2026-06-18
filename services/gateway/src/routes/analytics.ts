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

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Logger } from 'winston';

export type AnalyticsRoutesOptions = {
  logger: Logger;
};

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

export const registerAnalyticsRoutes = async (
  app: FastifyInstance,
  opts: AnalyticsRoutesOptions
): Promise<void> => {
  const { logger } = opts;

  app.post(
    '/api/v1/analytics/pageviews',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Record a page view event',
        security: [],
        body: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            title: { type: 'string' },
            referrer: { type: 'string' },
            sessionId: { type: 'string' },
            userId: { type: 'string' },
          },
          additionalProperties: true,
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
          path: cap(pagePath),
          timestamp: body.timestamp || new Date().toISOString(),
          userId: userIdFromHeaders(req),
          sessionId: cap(body.sessionId),
          referrer: cap(body.referrer),
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
      schema: {
        tags: ['analytics'],
        summary: 'Record a single analytics event',
        security: [],
        body: {
          type: 'object',
          properties: {
            event: { type: 'string' },
            properties: { type: 'object' },
            sessionId: { type: 'string' },
            userId: { type: 'string' },
          },
          additionalProperties: true,
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
          properties: body.properties || {},
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
      schema: {
        tags: ['analytics'],
        summary: 'Record a batch of analytics events',
        security: [],
        body: {
          type: 'object',
          properties: {
            events: { type: 'array' },
          },
          additionalProperties: true,
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
          properties: event.properties || {},
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
