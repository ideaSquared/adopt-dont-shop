// CSRF double-submit-cookie primitive (ADS-919 Phase 0).
//
// Pattern: GET /api/v1/csrf-token (routes/csrf.ts) mints a random token,
// sets it as a non-HttpOnly `csrfToken` cookie, and returns the same value
// in the JSON body. `packages/lib.api/src/services/api-service.ts` already
// fetches that route and attaches the returned value as the `x-csrf-token`
// header on every state-changing (POST/PUT/PATCH/DELETE) request — this
// file is the server-side half: comparing the header against the cookie.
//
// Enforcement scope (deliberately narrow for Phase 0 — see
// docs/security/ADS-919-token-storage-plan.md): the hook below only
// rejects a state-changing request when a `csrfToken` cookie IS present.
// Nothing in the codebase sets that cookie except the new route this hook
// ships alongside, so every existing route/test that never calls GET
// /api/v1/csrf-token first is unaffected. Once a client HAS fetched the
// cookie (every real SPA mutation does, via the interceptor above), a
// missing or mismatched x-csrf-token header on a subsequent mutation 403s.
// Widening enforcement to reject requests with no cookie at all is a
// follow-up once the frontend fetch is verified working end-to-end in
// every environment — see the plan doc's Phase 0 rollout note.

import { timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Logger } from 'winston';

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
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    if (!cookieToken) {
      // Client hasn't opted into the double-submit flow yet (or this
      // route predates it). Not enforced — see module comment.
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
