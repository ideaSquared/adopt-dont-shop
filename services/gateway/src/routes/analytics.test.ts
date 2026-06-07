import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from 'winston';

import { registerAnalyticsRoutes } from './analytics.js';

function makeLogger(): Logger & { infoMock: ReturnType<typeof vi.fn> } {
  const infoMock = vi.fn();
  return {
    info: infoMock,
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    infoMock,
  } as unknown as Logger & { infoMock: ReturnType<typeof vi.fn> };
}

async function buildApp(logger: Logger): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerAnalyticsRoutes(app, { logger });
  return app;
}

describe('POST /api/v1/analytics/pageviews', () => {
  let app: FastifyInstance;
  let logger: ReturnType<typeof makeLogger>;

  beforeEach(async () => {
    logger = makeLogger();
    app = await buildApp(logger);
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

  it('logs the pageview with the principal user id when present', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/pageviews',
      headers: { 'content-type': 'application/json', 'x-user-id': 'usr-1' },
      payload: { path: '/pets', sessionId: 'sess-1' },
    });
    expect(logger.infoMock).toHaveBeenCalledWith(
      'Pageview recorded',
      expect.objectContaining({
        type: 'pageview',
        data: expect.objectContaining({
          path: '/pets',
          userId: 'usr-1',
          sessionId: 'sess-1',
        }),
      })
    );
  });

  it('accepts anonymous traffic (no x-user-id)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/pageviews',
      headers: { 'content-type': 'application/json' },
      payload: { path: '/landing' },
    });
    expect(res.statusCode).toBe(201);
    const call = logger.infoMock.mock.calls[0] as [string, { data: { userId: undefined } }];
    expect(call[1].data.userId).toBeUndefined();
  });

  it('truncates oversize user agent / referrer strings', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/pageviews',
      headers: { 'content-type': 'application/json' },
      payload: {
        path: '/x',
        userAgent: 'x'.repeat(1000),
        referrer: 'y'.repeat(1000),
      },
    });
    const call = logger.infoMock.mock.calls[0] as [
      string,
      { data: { userAgent: string; referrer: string } },
    ];
    expect(call[1].data.userAgent.length).toBe(256);
    expect(call[1].data.referrer.length).toBe(256);
  });
});

describe('POST /api/v1/analytics/events', () => {
  let app: FastifyInstance;
  let logger: ReturnType<typeof makeLogger>;
  beforeEach(async () => {
    logger = makeLogger();
    app = await buildApp(logger);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 201 and logs the single event', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      headers: { 'content-type': 'application/json' },
      payload: { event: 'pet_favorited', properties: { petId: 'pet-1' } },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ success: true, message: 'Event recorded' });
    const call = logger.infoMock.mock.calls[0] as [
      string,
      { data: { event: string; properties: Record<string, unknown> } },
    ];
    expect(call[1].data.event).toBe('pet_favorited');
    expect(call[1].data.properties).toEqual({ petId: 'pet-1' });
  });

  it("falls back to 'unknown' when no name field is provided", async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      headers: { 'content-type': 'application/json' },
      payload: { properties: {} },
    });
    const call = logger.infoMock.mock.calls[0] as [string, { data: { event: string } }];
    expect(call[1].data.event).toBe('unknown');
  });
});

describe('POST /api/v1/analytics/events/batch', () => {
  let app: FastifyInstance;
  let logger: ReturnType<typeof makeLogger>;
  beforeEach(async () => {
    logger = makeLogger();
    app = await buildApp(logger);
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
    const logger = makeLogger();
    const app = await buildApp(logger);
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
