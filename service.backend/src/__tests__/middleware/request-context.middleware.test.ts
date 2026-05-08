import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requestContextMiddleware } from '../../middleware/request-context';
import { getCorrelationId } from '../../utils/request-context';

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
