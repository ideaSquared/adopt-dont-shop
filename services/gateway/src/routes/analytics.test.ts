import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeTestLogger } from '../../test/helpers/test-logger.js';
import { registerAnalyticsRoutes } from './analytics.js';

type TestLogger = ReturnType<typeof makeTestLogger>;

async function buildApp(logger: TestLogger['logger']): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerAnalyticsRoutes(app, { logger });
  return app;
}

const lastMeta = (t: TestLogger): Record<string, unknown> =>
  t.events[t.events.length - 1]?.meta ?? {};

describe('POST /api/v1/analytics/pageviews', () => {
  let app: FastifyInstance;
  let logger: TestLogger;

  beforeEach(async () => {
    logger = makeTestLogger();
    app = await buildApp(logger.logger);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 201 with success envelope', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/pageviews',
      headers: { 'content-type': 'application/json', 'x-user-id': 'usr-1' },
      payload: { path: '/pets', timestamp: '2026-06-07T12:00:00Z' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ success: true, message: 'Pageview recorded' });
  });

  it('logs the pageview path and the principal user id when present', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/pageviews',
      headers: { 'content-type': 'application/json', 'x-user-id': 'usr-1' },
      payload: { path: '/pets', sessionId: 'sess-1' },
    });
    expect(logger.events).toHaveLength(1);
    expect(logger.events[0]).toMatchObject({
      message: 'Pageview recorded',
      meta: { path: '/pets', userId: 'usr-1' },
    });
  });

  it('accepts anonymous traffic (no x-user-id)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/pageviews',
      headers: { 'content-type': 'application/json' },
      payload: { path: '/landing' },
    });
    expect(res.statusCode).toBe(201);
    expect(lastMeta(logger).userId).toBeNull();
  });

  it('never logs the session id, referrer, user agent or client address', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/pageviews',
      headers: { 'content-type': 'application/json' },
      payload: {
        path: '/x',
        sessionId: 'SESSION-SECRET',
        userAgent: 'AGENT-SECRET',
        referrer: 'https://elsewhere.example/REFERRER-SECRET',
      },
    });
    const logged = JSON.stringify(logger.events);
    for (const secret of ['SESSION-SECRET', 'AGENT-SECRET', 'REFERRER-SECRET', '127.0.0.1']) {
      expect(logged).not.toContain(secret);
    }
  });
});

describe('POST /api/v1/analytics/events', () => {
  let app: FastifyInstance;
  let logger: TestLogger;
  beforeEach(async () => {
    logger = makeTestLogger();
    app = await buildApp(logger.logger);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 201 and logs the event name, not its properties', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      headers: { 'content-type': 'application/json' },
      payload: { event: 'pet_favorited', properties: { note: 'PROPERTY-SECRET' } },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ success: true, message: 'Event recorded' });
    expect(logger.events[0]).toMatchObject({
      message: 'Analytics event recorded',
      meta: { event: 'pet_favorited' },
    });
    expect(JSON.stringify(logger.events)).not.toContain('PROPERTY-SECRET');
  });

  it("falls back to 'unknown' when no name field is provided", async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      headers: { 'content-type': 'application/json' },
      payload: { properties: {} },
    });
    expect(lastMeta(logger).event).toBe('unknown');
  });
});

describe('POST /api/v1/analytics/events/batch', () => {
  let app: FastifyInstance;
  let logger: TestLogger;
  beforeEach(async () => {
    logger = makeTestLogger();
    app = await buildApp(logger.logger);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 201 with the processed count', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events/batch',
      headers: { 'content-type': 'application/json' },
      payload: { events: [{ event: 'a' }, { event: 'b' }, { event: 'c' }] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ success: true, message: 'Events recorded', processed: 3 });
    expect(logger.events[0]).toMatchObject({
      message: 'Batch events recorded',
      meta: { count: 3 },
    });
  });

  it('rejects when events is not an array', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events/batch',
      headers: { 'content-type': 'application/json' },
      payload: { events: 'nope' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a batch larger than the cap', async () => {
    const events = Array.from({ length: 1001 }, () => ({ event: 'x' }));
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events/batch',
      headers: { 'content-type': 'application/json' },
      payload: { events },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/v1/analytics/health', () => {
  it('returns a healthy payload', async () => {
    const logger = makeTestLogger();
    const app = await buildApp(logger.logger);
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/health' });
      expect(res.statusCode).toBe(200);
      const body = res.json() as {
        success: boolean;
        status: string;
        service: string;
        timestamp: string;
      };
      expect(body.success).toBe(true);
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('analytics');
      expect(Date.parse(body.timestamp)).not.toBeNaN();
    } finally {
      await app.close();
    }
  });
});

describe('analytics ingestion redaction (ADS-1038)', () => {
  let app: FastifyInstance;
  let logger: TestLogger;

  beforeEach(async () => {
    logger = makeTestLogger();
    app = await buildApp(logger.logger);
  });
  afterEach(async () => {
    await app.close();
  });

  it('drops the query string (and its token) from the pageview path', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/pageviews',
      headers: { 'content-type': 'application/json' },
      payload: { path: '/reset-password?token=SECRET' },
    });
    expect(lastMeta(logger).path).toBe('/reset-password');
    expect(JSON.stringify(logger.events)).not.toContain('SECRET');
  });

  it('drops the URL fragment (and an OAuth-style token in it) from the pageview path', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/pageviews',
      headers: { 'content-type': 'application/json' },
      payload: { path: '/cb#access_token=SECRET' },
    });
    expect(lastMeta(logger).path).toBe('/cb');
    expect(JSON.stringify(logger.events)).not.toContain('SECRET');
  });

  it('truncates an oversized event name', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      headers: { 'content-type': 'application/json' },
      payload: { event: 'e'.repeat(1000) },
    });
    expect(String(lastMeta(logger).event).length).toBeLessThanOrEqual(200);
  });
});
