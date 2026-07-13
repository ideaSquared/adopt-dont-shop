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

  it('mints a different token on each call', async () => {
    const first = (await app.inject({ method: 'GET', url: '/api/v1/csrf-token' })).json() as {
      csrfToken: string;
    };
    const second = (await app.inject({ method: 'GET', url: '/api/v1/csrf-token' })).json() as {
      csrfToken: string;
    };
    expect(first.csrfToken).not.toBe(second.csrfToken);
  });

  it('does not require an Authorization header (public route)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/csrf-token' });
    expect(res.statusCode).toBe(200);
  });
});
