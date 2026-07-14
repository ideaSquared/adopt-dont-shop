// GET /api/v1/csrf-token — issues the double-submit CSRF cookie (ADS-919
// Phase 0). See middleware/csrf.ts for the validation half and its module
// comment for exactly what's enforced today.
//
// Public route — no Authorization required. The SPA's request interceptor
// (packages/lib.api/src/services/api-service.ts) fetches this before ANY
// state-changing request, including unauthenticated ones like login and
// register, so this must stay reachable without a token.

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
      const token = randomBytes(CSRF_TOKEN_BYTES).toString('hex');

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
