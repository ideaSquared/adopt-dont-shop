/**
 * Behavioural coverage for the Prometheus scrape endpoint (ADS-404).
 *
 * The key invariant: in production, an unset METRICS_AUTH_TOKEN must
 * never expose metrics — not even from spoofable loopback IPs. In
 * dev/test we keep the loopback fallback for convenience.
 */
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import metricsRoutes, { warnIfMetricsTokenUnset } from '../../routes/metrics.routes';
import { logger } from '../../utils/logger';

const mountApp = (): express.Application => {
  const app = express();
  app.set('trust proxy', 1);
  app.use('/metrics', metricsRoutes);
  return app;
};

const originalEnv = process.env;

describe('metrics.routes', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.METRICS_AUTH_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('serves metrics when a valid bearer token is presented', async () => {
    process.env.METRICS_AUTH_TOKEN = 'secret-token';
    const app = mountApp();

    const res = await request(app).get('/metrics').set('authorization', 'Bearer secret-token');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });

  it('returns 401 when the bearer token is wrong', async () => {
    process.env.METRICS_AUTH_TOKEN = 'secret-token';
    const app = mountApp();

    const res = await request(app).get('/metrics').set('authorization', 'Bearer nope');

    expect(res.status).toBe(401);
  });

  it('serves metrics from loopback in development when no token is configured', async () => {
    process.env.NODE_ENV = 'development';
    const app = mountApp();

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
  });

  it('returns 404 in production when no token is configured (does not trust loopback)', async () => {
    process.env.NODE_ENV = 'production';
    const app = mountApp();

    // X-Forwarded-For would spoof req.ip to loopback under `trust proxy: 1`.
    const res = await request(app).get('/metrics').set('x-forwarded-for', '127.0.0.1');

    expect(res.status).toBe(404);
  });

  it('returns 404 in production-like env variants when no token is configured', async () => {
    process.env.NODE_ENV = 'PRODUCTION';
    const app = mountApp();

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(404);
  });

  describe('warnIfMetricsTokenUnset', () => {
    beforeEach(() => {
      vi.mocked(logger.warn).mockClear();
    });

    it('warns in a production-like env when the token is unset', () => {
      delete process.env.METRICS_AUTH_TOKEN;

      warnIfMetricsTokenUnset('production');

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('METRICS_AUTH_TOKEN'));
    });

    it('does not warn in a production-like env when the token is set', () => {
      process.env.METRICS_AUTH_TOKEN = 'secret-token';

      warnIfMetricsTokenUnset('production');

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('does not warn outside production-like environments', () => {
      delete process.env.METRICS_AUTH_TOKEN;

      warnIfMetricsTokenUnset('development');

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
