import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerCsrfRoutes } from './csrf.js';

describe('GET /api/v1/csrf-token — issues the double-submit CSRF cookie', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(cookie);
    await registerCsrfRoutes(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns a csrfToken in the JSON body', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/csrf-token' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { csrfToken: string };
    expect(typeof body.csrfToken).toBe('string');
    expect(body.csrfToken.length).toBeGreaterThan(0);
  });

  it('sets a non-HttpOnly, SameSite=Lax csrfToken cookie matching the body value', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/csrf-token' });
    const body = res.json() as { csrfToken: string };

    const setCookieHeader = res.cookies.find(c => c.name === 'csrfToken');
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader?.value).toBe(body.csrfToken);
    expect(setCookieHeader?.httpOnly).toBeFalsy();
    expect(setCookieHeader?.sameSite).toBe('Lax');
    expect(setCookieHeader?.path).toBe('/');
  });

  it('mints a fresh token when the caller has no csrfToken cookie', async () => {
    const first = (await app.inject({ method: 'GET', url: '/api/v1/csrf-token' })).json() as {
      csrfToken: string;
    };
    const second = (await app.inject({ method: 'GET', url: '/api/v1/csrf-token' })).json() as {
      csrfToken: string;
    };
    expect(first.csrfToken).not.toBe(second.csrfToken);
  });

  it('reuses the existing csrfToken cookie instead of rotating it on every GET', async () => {
    // The double-submit token must be a STABLE per-browser nonce. Rotating it
    // on every GET desynchronises the many independent ApiService instances
    // that share one host cookie (ADS-919 regression): a second handshake
    // would clobber the cookie a first instance already cached as its header,
    // and the next state-changing request would 403 on a cookie≠header
    // mismatch. Reusing the existing cookie keeps every handshake's returned
    // value equal to the cookie the browser will send back.
    const first = await app.inject({ method: 'GET', url: '/api/v1/csrf-token' });
    const firstToken = (first.json() as { csrfToken: string }).csrfToken;

    const second = await app.inject({
      method: 'GET',
      url: '/api/v1/csrf-token',
      cookies: { csrfToken: firstToken },
    });
    const secondToken = (second.json() as { csrfToken: string }).csrfToken;

    expect(secondToken).toBe(firstToken);
    // The cookie is re-set to the same value (refreshing maxAge), never a new one.
    const setCookie = second.cookies.find(c => c.name === 'csrfToken');
    expect(setCookie?.value).toBe(firstToken);
  });

  it('does not require an Authorization header (public route)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/csrf-token' });
    expect(res.statusCode).toBe(200);
  });
});

// ADS-1334: the csrfToken cookie's Secure flag used to be derived only from
// req.protocol === 'https' — the same trustProxy/nginx drift ADS-1327 fixed
// for the auth cookies could silently downgrade this cookie to non-Secure in
// production too. Now it shares auth-cookies.ts's isSecureRequest, which
// pins Secure=true for production/staging regardless of req.protocol.
describe('GET /api/v1/csrf-token — Secure pinned by environment (ADS-1334)', () => {
  it('marks the csrfToken cookie Secure in production even over a plain-HTTP request', async () => {
    const app = Fastify({ logger: false });
    await app.register(cookie);
    await registerCsrfRoutes(app, { environment: 'production' });
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/csrf-token' });
      const setCookie = res.cookies.find(c => c.name === 'csrfToken');
      expect(setCookie?.secure).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('marks the csrfToken cookie Secure in staging even over a plain-HTTP request', async () => {
    const app = Fastify({ logger: false });
    await app.register(cookie);
    await registerCsrfRoutes(app, { environment: 'staging' });
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/csrf-token' });
      const setCookie = res.cookies.find(c => c.name === 'csrfToken');
      expect(setCookie?.secure).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('does not pin Secure in development (falls back to req.protocol)', async () => {
    const app = Fastify({ logger: false });
    await app.register(cookie);
    await registerCsrfRoutes(app, { environment: 'development' });
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/csrf-token' });
      const setCookie = res.cookies.find(c => c.name === 'csrfToken');
      expect(setCookie?.secure).toBeFalsy();
    } finally {
      await app.close();
    }
  });
});
