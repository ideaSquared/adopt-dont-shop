/**
 * Behaviour test for the no-store cache-control middleware. Asserts
 * that every response served from a /api/* route carries
 * `Cache-Control: private, no-store, max-age=0`, so a default-
 * configured CDN cannot cache a personalised GET and serve it to a
 * different user. Static asset routes mounted outside /api/* must be
 * unaffected (they set their own Cache-Control).
 */
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { noStoreCacheControl } from '../../middleware/no-cache';

const buildApp = () => {
  const app = express();
  app.use('/api', noStoreCacheControl);

  app.get('/api/v1/example', (_req, res) => {
    res.json({ ok: true });
  });

  // Route outside /api/* — should retain whatever cache header the
  // handler sets (or none).
  app.get('/static/example', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send('static');
  });

  return app;
};

describe('no-cache middleware', () => {
  it('sets Cache-Control: private, no-store, max-age=0 on /api/* responses', async () => {
    const res = await request(buildApp()).get('/api/v1/example');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store, max-age=0');
  });

  it('does not affect responses outside /api/*', async () => {
    const res = await request(buildApp()).get('/static/example');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
  });
});
