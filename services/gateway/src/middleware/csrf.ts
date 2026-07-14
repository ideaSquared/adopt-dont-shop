// CSRF double-submit-cookie primitive (ADS-919).
//
// Pattern: GET /api/v1/csrf-token (routes/csrf.ts) mints a random token,
// sets it as a non-HttpOnly `csrfToken` cookie, and returns the same value
// in the JSON body. `packages/lib.api/src/services/api-service.ts` already
// fetches that route and attaches the returned value as the `x-csrf-token`
// header on every state-changing (POST/PUT/PATCH/DELETE) request — this
// file is the server-side half: comparing the header against the cookie.
//
// Enforcement scope (widened from Phase 0 — see
// docs/security/ADS-919-token-storage-plan.md): a state-changing request
// is enforced (must carry a valid double-submit header) whenever the
// browser is opted into EITHER cookie flow:
//   - it already fetched the CSRF cookie (the original Phase 0 rule), OR
//   - it carries the httpOnly `accessToken` session cookie (ADS-919
//     Phase 1+) — now that auth rides along on cookies automatically,
//     every authenticated mutation must be protected, not just the ones
//     that happen to have called GET /api/v1/csrf-token first.
// A request with NEITHER cookie (no session, hasn't opted into CSRF) is
// unauthenticated by definition — login, register, forgot-password, and
// any request that carries a Bearer token instead of relying on cookies —
// and is left unenforced here, same as Phase 0. The SPA always fetches the
// CSRF cookie before its first mutation (see the interceptor above), so in
// practice every real browser request is covered either way.

import { timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Logger } from 'winston';

import { ACCESS_TOKEN_COOKIE_NAME } from './auth-cookies.js';

export const CSRF_COOKIE_NAME = 'csrfToken';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Constant-time comparison of the double-submit cookie against the
// x-csrf-token header. Exported so it can be unit tested directly without
// spinning up a full route.
export const verifyCsrfToken = (req: FastifyRequest): boolean => {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];
  if (!cookieToken || typeof headerToken !== 'string' || headerToken.length === 0) {
    return false;
  }
  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);
  if (cookieBuf.length !== headerBuf.length) {
    return false;
  }
  return timingSafeEqual(cookieBuf, headerBuf);
};

export type CsrfProtectionOptions = {
  logger: Logger;
};

// Registers the onRequest hook that enforces the double-submit check on
// every route — see the module comment above for exactly what's enforced
// vs. issued-only. Requires @fastify/cookie to already be registered on
// `app` (for `req.cookies` / `reply.setCookie`).
export const registerCsrfProtection = (app: FastifyInstance, opts: CsrfProtectionOptions): void => {
  app.addHook('onRequest', async (req, reply) => {
    if (!STATE_CHANGING_METHODS.has(req.method)) {
      return;
    }
    const hasCsrfCookie = Boolean(req.cookies?.[CSRF_COOKIE_NAME]);
    const hasSessionCookie = Boolean(req.cookies?.[ACCESS_TOKEN_COOKIE_NAME]);
    if (!hasCsrfCookie && !hasSessionCookie) {
      // Unauthenticated request that also hasn't opted into the
      // double-submit flow (or this route predates it). Not enforced —
      // see module comment.
      return;
    }
    if (!verifyCsrfToken(req)) {
      opts.logger.warn('rejecting request: missing/invalid CSRF token', {
        method: req.method,
        url: req.url,
      });
      return reply.code(403).send({ error: 'invalid csrf token' });
    }
  });
};
