import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { metricsMiddleware, registry } from '../../middleware/metrics';

describe('metricsMiddleware (ADS-404)', () => {
  it('records HTTP request duration and total counters', async () => {
    const app = express();
    app.use(metricsMiddleware);
    app.get('/ping', (_req, res) => res.json({ ok: true }));

    await request(app).get('/ping');

    const text = await registry.metrics();
    expect(text).toContain('http_request_duration_seconds');
    expect(text).toContain('http_requests_total');
    expect(text).toMatch(/method="GET"/);
    expect(text).toMatch(/status_code="200"/);
  });
});
