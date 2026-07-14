import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CSRF_COOKIE_NAME, registerCsrfProtection, verifyCsrfToken } from './csrf.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as Parameters<typeof registerCsrfProtection>[1]['logger'];

async function makeApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cookie);
  registerCsrfProtection(app, { logger: quietLogger });
  app.get('/api/v1/things', async () => ({ ok: true }));
  app.post('/api/v1/things', async () => ({ created: true }));
  app.put('/api/v1/things', async () => ({ updated: true }));
  app.patch('/api/v1/things', async () => ({ patched: true }));
  app.delete('/api/v1/things', async () => ({ deleted: true }));
  return app;
}

describe('CSRF protection — opportunistic double-submit enforcement (ADS-919 Phase 0)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await makeApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('does not enforce GET requests even with a mismatched cookie/header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/things',
      headers: { cookie: `${CSRF_COOKIE_NAME}=abc` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('lets a state-changing request through when NO csrfToken cookie is present', async () => {
    // This is the "not enforced yet" bucket per the module comment —
    // every existing route/test in the gateway never sets this cookie,
    // so this behaviour keeps them working unmodified.
    const res = await app.inject({ method: 'POST', url: '/api/v1/things' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ created: true });
  });

  it('accepts a state-changing request when the header matches the cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/things',
      headers: {
        cookie: `${CSRF_COOKIE_NAME}=matching-token-123`,
        'x-csrf-token': 'matching-token-123',
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it('rejects with 403 when the cookie is present but the header is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/things',
      headers: { cookie: `${CSRF_COOKIE_NAME}=matching-token-123` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'invalid csrf token' });
  });

  it('rejects with 403 when the cookie and header values do not match', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/things',
      headers: {
        cookie: `${CSRF_COOKIE_NAME}=matching-token-123`,
        'x-csrf-token': 'a-different-token',
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it.each(['PUT', 'PATCH', 'DELETE'] as const)(
    'enforces %s the same way as POST once the cookie is present',
    async method => {
      const rejected = await app.inject({
        method,
        url: '/api/v1/things',
        headers: { cookie: `${CSRF_COOKIE_NAME}=matching-token-123` },
      });
      expect(rejected.statusCode).toBe(403);

      const accepted = await app.inject({
        method,
        url: '/api/v1/things',
        headers: {
          cookie: `${CSRF_COOKIE_NAME}=matching-token-123`,
          'x-csrf-token': 'matching-token-123',
        },
      });
      expect(accepted.statusCode).toBe(200);
    }
  );
});

// ADS-919: once auth rides along on cookies, the CSRF check must not depend
// on the browser having already fetched the CSRF cookie — an authenticated
// (accessToken-cookie-carrying) request has to be protected outright.
describe('CSRF protection — enforced when an accessToken session cookie is present (ADS-919)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await makeApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a state-changing request that carries an accessToken cookie but no CSRF cookie/header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/things',
      headers: { cookie: 'accessToken=session.jwt' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'invalid csrf token' });
  });

  it('rejects when the accessToken cookie is present and the CSRF header is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/things',
      headers: { cookie: 'accessToken=session.jwt; csrfToken=matching-token-123' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('accepts an authenticated mutation when the CSRF header matches the cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/things',
      headers: {
        cookie: 'accessToken=session.jwt; csrfToken=matching-token-123',
        'x-csrf-token': 'matching-token-123',
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it('does not enforce GET requests even with an accessToken cookie present', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/things',
      headers: { cookie: 'accessToken=session.jwt' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('leaves an unauthenticated mutation (no accessToken, no csrfToken cookie) unenforced', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/things' });
    expect(res.statusCode).toBe(200);
  });
});

describe('verifyCsrfToken', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(cookie);
    app.get('/check', async req => ({ valid: verifyCsrfToken(req) }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns false when neither cookie nor header is present', async () => {
    const res = await app.inject({ method: 'GET', url: '/check' });
    expect(res.json()).toEqual({ valid: false });
  });

  it('returns false when the header is empty', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/check',
      headers: { cookie: `${CSRF_COOKIE_NAME}=abc`, 'x-csrf-token': '' },
    });
    expect(res.json()).toEqual({ valid: false });
  });

  it('returns true when cookie and header match exactly', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/check',
      headers: { cookie: `${CSRF_COOKIE_NAME}=exact-match`, 'x-csrf-token': 'exact-match' },
    });
    expect(res.json()).toEqual({ valid: true });
  });
});
