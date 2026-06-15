// gRPC handler implementations for AuthService.{ListSessions,
// RevokeSession}.
//
// A session = a rotation chain in `auth.refresh_tokens`, identified by
// `family_id`. Each chain has multiple rows (one per rotation); the
// chain's "session_id" is the token_id of the chain root — the first
// non-replaced row in the family.
//
// Discipline matches the rest of this service:
//   - Always self-scoped on `principal.userId`; cross-user listing has
//     no current consumer. Admin tooling would call a different RPC.
//   - Revoke runs inside withTransaction + publish-after-commit so the
//     `auth.sessionRevoked` event only fires after the DB commit.
//     Idempotent: a second Revoke on the same session returns the
//     same id without re-publishing.

import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import type {
  ListSessionsRequest,
  ListSessionsResponse,
  RevokeSessionRequest,
  RevokeSessionResponse,
} from '@adopt-dont-shop/proto';

import type { Principal } from '@adopt-dont-shop/authz';

import { HandlerError } from './handlers.js';

export type SessionHandlerDeps = WithTransactionDeps;

// Schema columns we read — mirrors services/auth/src/migrations/
// 006_create_refresh_tokens.ts.
type RefreshTokenRow = {
  token_id: string;
  user_id: string;
  family_id: string;
  is_revoked: boolean;
  expires_at: Date;
  replaced_by_token_id: string | null;
  created_at: Date;
  updated_at: Date;
};

// --- ListSessions ----------------------------------------------------

export async function listSessions(
  deps: SessionHandlerDeps,
  principal: Principal,
  _req: ListSessionsRequest
): Promise<ListSessionsResponse> {
  void _req;
  // Returns the chain ROOT per family: the row that hasn't been
  // replaced by rotation AND isn't revoked AND isn't expired. The
  // SPA's session list shows one row per device, not per rotation.
  const res = await deps.pool.query<RefreshTokenRow>(
    `
    WITH active_chains AS (
      SELECT DISTINCT family_id
      FROM auth.refresh_tokens
      WHERE user_id = $1
        AND is_revoked = false
        AND expires_at > now()
    )
    SELECT t.token_id, t.user_id, t.family_id, t.is_revoked,
           t.expires_at, t.replaced_by_token_id,
           t.created_at, t.updated_at
    FROM auth.refresh_tokens t
    JOIN active_chains c ON c.family_id = t.family_id
    WHERE t.user_id = $1
      AND t.replaced_by_token_id IS NULL
      AND t.is_revoked = false
      AND t.expires_at > now()
    ORDER BY t.created_at DESC
    `,
    [principal.userId]
  );

  return {
    sessions: res.rows.map(row => ({
      sessionId: row.token_id,
      familyId: row.family_id,
      expiresAt: row.expires_at.toISOString(),
      createdAt: row.created_at.toISOString(),
    })),
  };
}

// --- RevokeSession ---------------------------------------------------

export async function revokeSession(
  deps: SessionHandlerDeps,
  principal: Principal,
  req: RevokeSessionRequest
): Promise<RevokeSessionResponse> {
  if (!req.sessionId) {
    throw new HandlerError('INVALID_ARGUMENT', 'session_id is required');
  }

  // Verify ownership BEFORE revoking — return NOT_FOUND on miss OR
  // cross-user to prevent session enumeration.
  const found = await deps.pool.query<{
    family_id: string;
    is_revoked: boolean;
  }>(
    `SELECT family_id, is_revoked
     FROM auth.refresh_tokens
     WHERE token_id = $1 AND user_id = $2
     LIMIT 1`,
    [req.sessionId, principal.userId]
  );
  if (!found.rows[0]) {
    throw new HandlerError('NOT_FOUND', `session '${req.sessionId}' not found`);
  }
  const { family_id, is_revoked } = found.rows[0];

  // Idempotency: a second Revoke on an already-revoked session returns
  // the same id without re-publishing the NATS event.
  if (is_revoked) {
    return { sessionId: req.sessionId };
  }

  await withTransaction(deps, async ({ client, publish }) => {
    // Revoke EVERY row in the family — a leaked rotated token from the
    // middle of the chain must also stop working.
    await client.query(
      `UPDATE auth.refresh_tokens
       SET is_revoked = true, revoked_at = now(), updated_at = now()
       WHERE family_id = $1 AND is_revoked = false`,
      [family_id]
    );

    publish({
      type: 'auth.sessionRevoked',
      id: `auth.sessionRevoked.${req.sessionId}`,
      payload: {
        sessionId: req.sessionId,
        familyId: family_id,
        userId: principal.userId,
      },
    });
  });

  return { sessionId: req.sessionId };
}
