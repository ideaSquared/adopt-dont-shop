import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  __resetMetricsForTest,
  getMetricsRegistry,
  recordGrpcDuration,
  registerMetrics,
} from './metrics.js';

describe('registerMetrics — /metrics endpoint', () => {
  beforeEach(() => {
    __resetMetricsForTest();
  });

  afterEach(() => {
    __resetMetricsForTest();
  });

  it('exposes a /metrics endpoint that returns prom text format', async () => {
    const app = Fastify();
    registerMetrics(app);
    try {
      const res = await app.inject({ method: 'GET', url: '/metrics' });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      // Must contain the histogram type declaration.
      expect(res.body).toContain('# TYPE http_request_duration_seconds histogram');
      expect(res.body).toContain('# TYPE grpc_handler_duration_seconds histogram');
    } finally {
      await app.close();
    }
  });

  it('records http_request_duration_seconds for an inbound request with method, route, status_code labels', async () => {
    const app = Fastify();
    registerMetrics(app);
    app.get('/widgets/:id', async () => ({ ok: true }));
    try {
      await app.inject({ method: 'GET', url: '/widgets/abc' });
      const res = await app.inject({ method: 'GET', url: '/metrics' });
      const body = res.body;
      // Templated route — must NOT contain the resolved id.
      expect(body).toContain('route="/widgets/:id"');
      expect(body).toContain('method="GET"');
      expect(body).toContain('status_code="200"');
      expect(body).not.toContain('route="/widgets/abc"');
    } finally {
      await app.close();
    }
  });

  it('exposes Node default process metrics (process_cpu_user_seconds_total)', async () => {
    const app = Fastify();
    registerMetrics(app);
    try {
      const res = await app.inject({ method: 'GET', url: '/metrics' });
      expect(res.body).toContain('process_cpu_user_seconds_total');
    } finally {
      await app.close();
    }
  });
});

describe('recordGrpcDuration', () => {
  beforeEach(() => {
    __resetMetricsForTest();
  });

  it('records into grpc_handler_duration_seconds with service/method/code/direction labels', async () => {
    getMetricsRegistry();
    recordGrpcDuration({
      service: 'service.auth',
      method: 'Login',
      code: 0,
      direction: 'in',
      durationSeconds: 0.012,
    });
    const text = await getMetricsRegistry().metrics();
    expect(text).toContain(
      'grpc_handler_duration_seconds_count{service="service.auth",method="Login",code="0",direction="in"} 1'
    );
  });

  it('distinguishes in vs out direction', async () => {
    getMetricsRegistry();
    recordGrpcDuration({
      service: 'service.auth',
      method: 'ValidateToken',
      code: 0,
      direction: 'out',
      durationSeconds: 0.05,
    });
    const text = await getMetricsRegistry().metrics();
    expect(text).toMatch(/direction="out"/);
  });
});
