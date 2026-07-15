import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  clearAuthCookies,
  extractAccessTokenFromCookie,
  extractRefreshTokenFromCookie,
  setAuthCookies,
} from './auth-cookies.js';

async function makeApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cookie);
  app.post('/set', async (req, reply) => {
    setAuthCookies(req, reply, { accessToken: 'a.jwt', refreshToken: 'r.jwt' });
    return reply.send({ ok: true });
  });
  app.post('/clear', async (req, reply) => {
    clearAuthCookies(req, reply);
    return reply.send({ ok: true });
  });
  app.get('/read', async req => ({
    access: extractAccessTokenFromCookie(req) ?? null,
    refresh: extractRefreshTokenFromCookie(req) ?? null,
  }));
  return app;
}

describe('setAuthCookies', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await makeApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('sets the access token cookie as HttpOnly at Path=/', async () => {
    const res = await app.inject({ method: 'POST', url: '/set' });
    const setCookie = res.cookies.find(c => c.name === ACCESS_TOKEN_COOKIE_NAME);

    expect(setCookie).toBeDefined();
    expect(setCookie?.value).toBe('a.jwt');
    expect(setCookie?.httpOnly).toBe(true);
    expect(setCookie?.path).toBe('/');
    expect(setCookie?.sameSite).toBe('Lax');
  });

  it('sets the refresh token cookie as HttpOnly, scoped to /api/v1/auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/set' });
    const setCookie = res.cookies.find(c => c.name === REFRESH_TOKEN_COOKIE_NAME);

    expect(setCookie).toBeDefined();
    expect(setCookie?.value).toBe('r.jwt');
    expect(setCookie?.httpOnly).toBe(true);
    expect(setCookie?.path).toBe('/api/v1/auth');
  });

  it('sets a non-HttpOnly session marker cookie carrying no token value', async () => {
    const res = await app.inject({ method: 'POST', url: '/set' });
    const setCookie = res.cookies.find(c => c.name === SESSION_COOKIE_NAME);

    expect(setCookie).toBeDefined();
    expect(setCookie?.httpOnly).toBeFalsy();
    expect(setCookie?.value).toBe('1');
  });

  it('does not mark cookies Secure over plain HTTP (inject default protocol)', async () => {
    const res = await app.inject({ method: 'POST', url: '/set' });
    const setCookie = res.cookies.find(c => c.name === ACCESS_TOKEN_COOKIE_NAME);
    expect(setCookie?.secure).toBeFalsy();
  });
});

describe('clearAuthCookies', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await makeApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('expires all three cookies at matching paths', async () => {
    const res = await app.inject({ method: 'POST', url: '/clear' });
    const byName = Object.fromEntries(res.cookies.map(c => [c.name, c]));

    expect(byName[ACCESS_TOKEN_COOKIE_NAME]?.path).toBe('/');
    expect(byName[REFRESH_TOKEN_COOKIE_NAME]?.path).toBe('/api/v1/auth');
    expect(byName[SESSION_COOKIE_NAME]?.path).toBe('/');
    // @fastify/cookie's clearCookie sets Max-Age=0 / an epoch Expires.
    for (const name of [ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, SESSION_COOKIE_NAME]) {
      expect(byName[name]?.value).toBe('');
    }
  });
});

describe('extractAccessTokenFromCookie / extractRefreshTokenFromCookie', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await makeApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('reads both cookies off the request', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/read',
      headers: { cookie: `${ACCESS_TOKEN_COOKIE_NAME}=a.jwt; ${REFRESH_TOKEN_COOKIE_NAME}=r.jwt` },
    });
    expect(res.json()).toEqual({ access: 'a.jwt', refresh: 'r.jwt' });
  });

  it('returns undefined (null in the JSON probe) when neither cookie is present', async () => {
    const res = await app.inject({ method: 'GET', url: '/read' });
    expect(res.json()).toEqual({ access: null, refresh: null });
  });
});
