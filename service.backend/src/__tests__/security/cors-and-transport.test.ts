import express from 'express';
import cors from 'cors';
import request from 'supertest';
import { isProductionLike } from '../../config/env';

describe('isProductionLike', () => {
  // Misconfigured NODE_ENV values (e.g. 'Production', 'PROD') previously
  // tripped a strict-equality check and silently enabled HTTP long-polling
  // as a Socket.IO transport in production. Lock the case-insensitive
  // behaviour in.
  it('returns true for canonical lowercase "production"', () => {
    expect(isProductionLike('production')).toBe(true);
  });

  it('returns true for "Production" (mixed case)', () => {
    expect(isProductionLike('Production')).toBe(true);
  });

  it('returns true for "PRODUCTION" (uppercase)', () => {
    expect(isProductionLike('PRODUCTION')).toBe(true);
  });

  it('returns true for short alias "prod"', () => {
    expect(isProductionLike('prod')).toBe(true);
  });

  it('returns true for "PROD" (uppercase alias)', () => {
    expect(isProductionLike('PROD')).toBe(true);
  });

  it('trims surrounding whitespace before comparing', () => {
    expect(isProductionLike(' production ')).toBe(true);
  });

  it('returns false for "development"', () => {
    expect(isProductionLike('development')).toBe(false);
  });

  it('returns false for "test"', () => {
    expect(isProductionLike('test')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isProductionLike(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isProductionLike('')).toBe(false);
  });
});

describe('Vary: Origin middleware', () => {
  // ADS-defense-in-depth: without an explicit Vary: Origin a CDN / shared
  // cache could serve an origin-A response to an origin-B request. The
  // explicit middleware after cors() guarantees the header is set on every
  // response regardless of which CORS code path the request went through.
  const buildApp = () => {
    const app = express();
    app.use(
      cors({
        origin: ['http://localhost:3000'],
        credentials: true,
      })
    );
    app.use((_req, res, next) => {
      res.vary('Origin');
      next();
    });
    app.get('/health', (_req, res) => res.json({ ok: true }));
    return app;
  };

  it('sets Vary: Origin on same-origin (non-CORS) GET responses', async () => {
    const response = await request(buildApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers.vary).toBeDefined();
    expect(response.headers.vary).toMatch(/Origin/i);
  });

  it('sets Vary: Origin on cross-origin GET responses', async () => {
    const response = await request(buildApp())
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.headers.vary).toBeDefined();
    expect(response.headers.vary).toMatch(/Origin/i);
  });
});
