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
  AdminListSessionsRequest,
  AdminListSessionsResponse,
  AdminRevokeAllUserSessionsRequest,
  AdminRevokeAllUserSessionsResponse,
  AdminRevokeSessionRequest,
  AdminRevokeSessionResponse,
  ListSessionsRequest,
  ListSessionsResponse,
  RevokeSessionRequest,
  RevokeSessionResponse,
} from '@adopt-dont-shop/proto';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import type { Permission } from '@adopt-dont-shop/lib.types';

import { HandlerError } from './handlers.js';

export type SessionHandlerDeps = WithTransactionDeps;

const ADMIN_SECURITY_READ: Permission = 'admin.security.read' as Permission;
const ADMIN_SECURITY_MANAGE: Permission = 'admin.security.manage' as Permission;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function clampLimit(requested: number): number {
  if (!requested) {
    return DEFAULT_LIMIT;
  }
  return Math.min(requested, MAX_LIMIT);
}

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

    // Stamp the access-token revocation watermark so the revoked session's
    // already-issued access token stops working immediately (ValidateToken
    // rejects tokens issued before this). Other live sessions transparently
    // re-mint a newer access token on their next refresh.
    await client.query(
      `UPDATE auth.users SET tokens_valid_from = now(), updated_at = now() WHERE user_id = $1`,
      [principal.userId]
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

// --- Admin security management ----------------------------------------
// Cross-user session visibility/revocation for the Security Center.
// Same chain-root semantics as the self-service RPCs above, joined with
// auth.users for the identity columns the admin UI displays.

type AdminSessionRow = {
  token_id: string;
  family_id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  expires_at: Date;
  created_at: Date;
};

export async function adminListSessions(
  deps: SessionHandlerDeps,
  principal: Principal,
  req: AdminListSessionsRequest
): Promise<AdminListSessionsResponse> {
  if (!hasPermission(principal, ADMIN_SECURITY_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_READ}' required`);
  }

  const limit = clampLimit(req.limit);
  const page = Math.max(req.page || 1, 1);
  const offset = (page - 1) * limit;

  const userFilter = req.userId ? `AND t.user_id = $1` : '';
  const params: unknown[] = req.userId ? [req.userId] : [];

  const countRes = await deps.pool.query<{ total: string }>(
    `
    SELECT COUNT(*)::text AS total
    FROM auth.refresh_tokens t
    WHERE t.replaced_by_token_id IS NULL
      AND t.is_revoked = false
      AND t.expires_at > now()
      ${userFilter}
    `,
    params
  );
  const total = Number.parseInt(countRes.rows[0]?.total ?? '0', 10);

  const rowsRes = await deps.pool.query<AdminSessionRow>(
    `
    SELECT t.token_id, t.family_id, t.user_id,
           u.email, u.first_name, u.last_name,
           t.expires_at, t.created_at
    FROM auth.refresh_tokens t
    JOIN auth.users u ON u.user_id = t.user_id
    WHERE t.replaced_by_token_id IS NULL
      AND t.is_revoked = false
      AND t.expires_at > now()
      ${userFilter}
    ORDER BY t.created_at DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  return {
    sessions: rowsRes.rows.map(row => ({
      sessionId: row.token_id,
      familyId: row.family_id,
      userId: row.user_id,
      email: row.email,
      firstName: row.first_name ?? undefined,
      lastName: row.last_name ?? undefined,
      expiresAt: row.expires_at.toISOString(),
      createdAt: row.created_at.toISOString(),
    })),
    total,
    page,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

export async function adminRevokeSession(
  deps: SessionHandlerDeps,
  principal: Principal,
  req: AdminRevokeSessionRequest
): Promise<AdminRevokeSessionResponse> {
  if (!req.sessionId) {
    throw new HandlerError('INVALID_ARGUMENT', 'session_id is required');
  }
  if (!hasPermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }

  const found = await deps.pool.query<{
    family_id: string;
    user_id: string;
    is_revoked: boolean;
  }>(
    `SELECT family_id, user_id, is_revoked
     FROM auth.refresh_tokens
     WHERE token_id = $1
     LIMIT 1`,
    [req.sessionId]
  );
  if (!found.rows[0]) {
    throw new HandlerError('NOT_FOUND', `session '${req.sessionId}' not found`);
  }
  const { family_id, user_id, is_revoked } = found.rows[0];

  if (is_revoked) {
    return { sessionId: req.sessionId };
  }

  await withTransaction(deps, async ({ client, publish }) => {
    await client.query(
      `UPDATE auth.refresh_tokens
       SET is_revoked = true, revoked_at = now(), updated_at = now()
       WHERE family_id = $1 AND is_revoked = false`,
      [family_id]
    );
    await client.query(
      `UPDATE auth.users SET tokens_valid_from = now(), updated_at = now() WHERE user_id = $1`,
      [user_id]
    );

    publish({
      type: 'auth.sessionRevokedByAdmin',
      id: `auth.sessionRevokedByAdmin.${req.sessionId}`,
      payload: {
        sessionId: req.sessionId,
        familyId: family_id,
        userId: user_id,
        revokedBy: principal.userId,
      },
    });
  });

  return { sessionId: req.sessionId };
}

export async function adminRevokeAllUserSessions(
  deps: SessionHandlerDeps,
  principal: Principal,
  req: AdminRevokeAllUserSessionsRequest
): Promise<AdminRevokeAllUserSessionsResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }

  let revokedCount = 0;
  await withTransaction(deps, async ({ client, publish }) => {
    const chains = await client.query<{ family_id: string }>(
      `
      SELECT DISTINCT family_id
      FROM auth.refresh_tokens
      WHERE user_id = $1
        AND replaced_by_token_id IS NULL
        AND is_revoked = false
        AND expires_at > now()
      `,
      [req.userId]
    );
    revokedCount = chains.rows.length;
    if (revokedCount === 0) {
      return;
    }

    await client.query(
      `UPDATE auth.refresh_tokens
       SET is_revoked = true, revoked_at = now(), updated_at = now()
       WHERE user_id = $1 AND is_revoked = false`,
      [req.userId]
    );
    await client.query(
      `UPDATE auth.users SET tokens_valid_from = now(), updated_at = now() WHERE user_id = $1`,
      [req.userId]
    );

    publish({
      type: 'auth.allSessionsRevokedByAdmin',
      id: `auth.allSessionsRevokedByAdmin.${req.userId}.${Date.now()}`,
      payload: { userId: req.userId, revokedCount, revokedBy: principal.userId },
    });
  });

  return { revokedCount };
}
