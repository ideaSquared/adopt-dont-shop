// TEST-ONLY one-time-token peek seam (ADS-871).
//
// Password-reset, email-verification and staff-invitation tokens are
// normally only delivered by email, so the Playwright e2e suite can't read
// them to drive the FULL auth round-trips (request reset → read token →
// reset → log in; register → read token → verify → log in; invite →
// read token → accept). This endpoint reads those one-time tokens straight
// from the shared Postgres so the suite can complete each journey.
//
// ─────────────────────────── SECURITY ───────────────────────────
// This exposes one-time secrets. It is gated three ways and is IMPOSSIBLE
// to reach in production:
//   1. OFF by default — only registers when E2E_TOKEN_PEEK === "true"
//      (config.testTokenPeek.enabled). Unset/anything-else ⇒ not registered,
//      so the path 404s like any unknown /api/* route.
//   2. loadConfig() THROWS at boot if E2E_TOKEN_PEEK=true while
//      NODE_ENV=production, so a prod gateway can never even start with it on.
//   3. Needs DATABASE_URL wired to the gateway, which production compose
//      never does (the gateway is a pure BFF with only gRPC clients in prod).
// CI sets E2E_TOKEN_PEEK=true for the e2e stack only (NODE_ENV=development).
//
// The route is named with a `test` prefix and lives under services/ — the
// frontend-only `dev-auth-guard` CI job only scans apps/ and packages/lib.*,
// so this seam does not trip that check.
//
// All tokens live in ONE Postgres instance (schema-per-service): the auth
// tokens in auth.users, invitation tokens in rescue.invitations. A single
// pool with fully-qualified table names reads both.

import { Pool } from 'pg';

import type { FastifyInstance } from 'fastify';

export type TestTokenPeekRoutesOptions = {
  // Connection string for the shared Postgres. The plugin owns the pool's
  // lifecycle and closes it on app shutdown.
  databaseUrl: string;
};

type AuthTokenRow = {
  verification_token: string | null;
  verification_token_expires_at: Date | null;
  reset_token: string | null;
  reset_token_expiration: Date | null;
};

type InvitationTokenRow = {
  token: string;
};

// Pull the email/rescueId out of the (string-typed) query without trusting
// the shape — Fastify hands us `unknown` values for query params.
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

// Per-route rate limit (overrides the gateway's global @fastify/rate-limit).
// Even though this seam is test-only and unreachable in prod, an unbounded
// DB-reading route is flagged by CodeQL — and a cap is correct hygiene.
const TEST_PEEK_RATE_LIMIT = { max: 60, timeWindow: '1 minute' } as const;

export const registerTestTokenPeekRoutes = async (
  app: FastifyInstance,
  opts: TestTokenPeekRoutesOptions
): Promise<void> => {
  const pool = new Pool({ connectionString: opts.databaseUrl });
  app.addHook('onClose', async () => {
    await pool.end();
  });

  // GET /api/v1/test/auth-token?email=…
  // Returns the current verification + reset tokens for a user, read straight
  // from auth.users. Either may be null when none is outstanding.
  app.get(
    '/api/v1/test/auth-token',
    { schema: { hide: true }, config: { rateLimit: TEST_PEEK_RATE_LIMIT } },
    async (req, reply) => {
      const query = (req.query ?? {}) as Record<string, unknown>;
      const email = asString(query.email);
      if (!email) {
        return reply.code(400).send({ error: 'email query param is required' });
      }

      const res = await pool.query<AuthTokenRow>(
        `SELECT verification_token, verification_token_expires_at,
              reset_token, reset_token_expiration
         FROM auth.users
        WHERE email = $1 AND deleted_at IS NULL
        LIMIT 1`,
        [email]
      );
      const row = res.rows[0];
      if (!row) {
        return reply.code(404).send({ error: 'user not found' });
      }
      return reply.send({
        verificationToken: row.verification_token,
        verificationTokenExpiresAt: row.verification_token_expires_at?.toISOString() ?? null,
        resetToken: row.reset_token,
        resetTokenExpiration: row.reset_token_expiration?.toISOString() ?? null,
      });
    }
  );

  // GET /api/v1/test/invitation-token?email=…[&rescueId=…]
  // Returns the most recent PENDING (unused, unexpired) staff-invitation token
  // for an email, read straight from rescue.invitations.
  app.get(
    '/api/v1/test/invitation-token',
    { schema: { hide: true }, config: { rateLimit: TEST_PEEK_RATE_LIMIT } },
    async (req, reply) => {
      const query = (req.query ?? {}) as Record<string, unknown>;
      const email = asString(query.email);
      if (!email) {
        return reply.code(400).send({ error: 'email query param is required' });
      }
      const rescueId = asString(query.rescueId);

      const res = await pool.query<InvitationTokenRow>(
        `SELECT token
         FROM rescue.invitations
        WHERE email = $1
          AND used = false
          AND expiration > now()
          AND ($2::uuid IS NULL OR rescue_id = $2::uuid)
        ORDER BY created_at DESC
        LIMIT 1`,
        [email, rescueId ?? null]
      );
      const row = res.rows[0];
      if (!row) {
        return reply.code(404).send({ error: 'no pending invitation found' });
      }
      return reply.send({ token: row.token });
    }
  );
};
