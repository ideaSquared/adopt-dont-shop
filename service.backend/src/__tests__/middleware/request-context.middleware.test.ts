import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requestContextMiddleware } from '../../middleware/request-context';
import { getCorrelationId, getTraceparent } from '../../utils/request-context';

describe('requestContextMiddleware (ADS-405)', () => {
  const buildApp = () => {
    const app = express();
    app.use(requestContextMiddleware);
    app.get('/probe', (_req, res) => {
      res.json({ correlationId: getCorrelationId() });
    });
    return app;
  };

  it('generates a correlation-ID via crypto.randomUUID when none is provided', async () => {
    const res = await request(buildApp()).get('/probe');
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBeTruthy();
    expect(res.body.correlationId).toBe(res.headers['x-correlation-id']);
  });

  it('propagates a caller-supplied X-Correlation-ID', async () => {
    const incoming = 'caller-supplied-correlation-id';
    const res = await request(buildApp()).get('/probe').set('X-Correlation-ID', incoming);
    expect(res.headers['x-correlation-id']).toBe(incoming);
    expect(res.body.correlationId).toBe(incoming);
  });

  it('falls back to X-Request-ID when X-Correlation-ID is absent', async () => {
    const incoming = 'request-id-fallback';
    const res = await request(buildApp()).get('/probe').set('X-Request-ID', incoming);
    expect(res.headers['x-correlation-id']).toBe(incoming);
  });

  it('isolates context between concurrent requests', async () => {
    const app = buildApp();
    const [a, b] = await Promise.all([
      request(app).get('/probe').set('X-Correlation-ID', 'A'),
      request(app).get('/probe').set('X-Correlation-ID', 'B'),
    ]);
    expect(a.body.correlationId).toBe('A');
    expect(b.body.correlationId).toBe('B');
  });
});

// ADS-660: middleware also threads a W3C traceparent through the request
// context so downstream services / OTel collectors can stitch a trace.
describe('requestContextMiddleware W3C traceparent (ADS-660)', () => {
  const buildApp = () => {
    const app = express();
    app.use(requestContextMiddleware);
    app.get('/probe', (_req, res) => {
      res.json({ traceparent: getTraceparent() });
    });
    return app;
  };

  it('mints a well-formed traceparent and echoes it back when none is sent', async () => {
    const res = await request(buildApp()).get('/probe');
    expect(res.headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(res.body.traceparent).toBe(res.headers.traceparent);
  });

  it('forwards a valid inbound traceparent unchanged', async () => {
    const inbound = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const res = await request(buildApp()).get('/probe').set('traceparent', inbound);
    expect(res.headers.traceparent).toBe(inbound);
    expect(res.body.traceparent).toBe(inbound);
  });

  it('mints a fresh traceparent when the inbound one is malformed', async () => {
    const res = await request(buildApp())
      .get('/probe')
      .set('traceparent', 'not-a-valid-traceparent');
    expect(res.headers.traceparent).not.toBe('not-a-valid-traceparent');
    expect(res.headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });
});
