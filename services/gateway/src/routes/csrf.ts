// GET /api/v1/csrf-token — issues the double-submit CSRF cookie (ADS-919
// Phase 0). See middleware/csrf.ts for the validation half and its module
// comment for exactly what's enforced today.
//
// Public route — no Authorization required. The SPA's request interceptor
// (packages/lib.api/src/services/api-service.ts) fetches this before ANY
// state-changing request, including unauthenticated ones like login and
// register, so this must stay reachable without a token.
//
// STABLE nonce (ADS-919 fix): the token is a per-browser double-submit
// nonce, NOT a per-request one. We REUSE the value already in the caller's
// `csrfToken` cookie when present, minting a fresh random token only when
// there is none. Rotating the token on every GET desynchronised the many
// independent ApiService instances that share one host-scoped cookie (the
// per-app global plus the ones AnalyticsService / DiscoveryService / … each
// `new ApiService()`): a second handshake would overwrite the cookie a
// first instance had already cached as its `x-csrf-token` header, so the
// next state-changing request 403'd on a cookie≠header mismatch (the
// "rejecting request: missing/invalid CSRF token" login failures). Reusing
// the cookie makes every handshake return exactly the value the browser
// will send back, so the double-submit always matches.

import { randomBytes } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

import { CSRF_COOKIE_NAME } from '../middleware/csrf.js';

const CSRF_TOKEN_BYTES = 32;
// How long the double-submit cookie stays valid before a client has to
// re-fetch it. Not tied to access-token TTL — this is a per-tab CSRF
// nonce, not a credential. 4 hours comfortably covers a working session
// without forcing frequent re-fetches, while still rotating regularly.
const CSRF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 4;

export const registerCsrfRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get(
    '/api/v1/csrf-token',
    {
      config: { public: true },
      schema: {
        tags: ['csrf'],
        summary: 'Issue a CSRF token (double-submit cookie pattern)',
        security: [],
        response: {
          200: {
            type: 'object',
            properties: { csrfToken: { type: 'string' } },
            required: ['csrfToken'],
          },
        },
      },
    },
    async (req, reply) => {
      // Reuse the caller's existing double-submit nonce when present; only
      // mint a fresh one for a browser that has never fetched it. This keeps
      // the token stable across repeated/concurrent handshakes so the cookie
      // and every cached header stay in lockstep (see module comment).
      const existing = req.cookies?.[CSRF_COOKIE_NAME];
      const token =
        typeof existing === 'string' && existing.length > 0
          ? existing
          : randomBytes(CSRF_TOKEN_BYTES).toString('hex');

      reply.setCookie(CSRF_COOKIE_NAME, token, {
        path: '/',
        httpOnly: false, // must be JS-readable for the double-submit pattern
        sameSite: 'lax',
        secure: req.protocol === 'https',
        maxAge: CSRF_COOKIE_MAX_AGE_SECONDS,
      });

      return reply.send({ csrfToken: token });
    }
  );
};
