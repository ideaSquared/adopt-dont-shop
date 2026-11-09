// Verified email change — RequestEmailChange / ConfirmEmailChange.
//
// auth.users.email is the account identity, so it only moves once the user
// has proved control of the new inbox:
//   1. RequestEmailChange (self-scoped) re-verifies the caller's password and
//      TOTP (the VerifyCredentials step-up check), stores the new address in
//      pending_email with the SHA-256 hash of a single-use 24h token, and
//      publishes auth.emailChangeRequested. service.notifications mails the
//      confirmation link to the new address and a security notice (no link)
//      to the old one.
//   2. ConfirmEmailChange (public — the token is the credential) swaps email
//      to pending_email, marks it verified and ends every session, the same
//      way ChangePassword does.
//
// Enumeration-safe like Register: an address that already belongs to another
// account gets the same response as a free one. Nothing is stored; the
// address is told instead (auth.emailChangeConflict).
//
// The audit events carry identifiers only — never the token or an address.

import { randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import type { Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type TransactionalScope } from '@adopt-dont-shop/events';
import type {
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  RequestEmailChangeRequest,
  RequestEmailChangeResponse,
} from '@adopt-dont-shop/proto';

import { hashToken, mintToken } from './account-handlers.js';
import { HandlerError, type HandlerDeps } from './handlers.js';
import { checkStepUpCredentials, type StepUpUserRow } from './verify-credentials.js';

const EMAIL_CHANGE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h, like the verification link
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The machine-readable messages the gateway maps to its HTTP error bodies.
const INVALID_EMAIL = 'invalid_email';
const EMAIL_UNCHANGED = 'email_unchanged';
const INVALID_OR_EXPIRED_TOKEN = 'invalid_or_expired_token';
const EMAIL_IN_USE = 'email_in_use';

// Same response whether the address was free or already taken.
const ACCEPTED: RequestEmailChangeResponse = { verified: true, twoFactorRequired: false };

type EmailChangeUserRow = StepUpUserRow & { first_name: string | null };

type PendingChangeRow = { user_id: string; email: string; pending_email: string };

const normaliseEmail = (email: string): string => email.trim().toLowerCase();

const isValidEmail = (email: string): boolean =>
  email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);

const isUniqueViolation = (err: unknown): boolean =>
  (err as { code?: string } | null)?.code === '23505';

// Checks every account, soft-deleted ones included: the unique constraint on
// email covers them too, so the swap would fail on such an address anyway.
async function isEmailTaken(
  db: Pick<Pool, 'query'>,
  email: string,
  exceptUserId: string
): Promise<boolean> {
  const res = await db.query(
    `SELECT 1 FROM auth.users WHERE email = $1 AND user_id <> $2 LIMIT 1`,
    [email, exceptUserId]
  );
  return res.rows.length > 0;
}

// Forensic record, published as auth.actionTaken so service.audit persists
// it. Always called inside withTransaction, so it fires only on commit.
function publishEmailChangeActionTaken(
  publish: TransactionalScope['publish'],
  audit: {
    userId: string;
    action: 'email_change.request' | 'email_change.confirm';
    outcome: 'success' | 'denied';
    reason?: string;
  }
): void {
  publish({
    type: 'auth.actionTaken',
    id: `auth.actionTaken.${randomUUID()}`,
    payload: {
      eventId: randomUUID(),
      service: 'service.auth',
      subject: 'auth.actionTaken',
      aggregateType: 'user',
      aggregateId: audit.userId,
      actorUserId: audit.userId,
      action: audit.action,
      outcome: audit.outcome,
      occurredAt: new Date().toISOString(),
      payload: audit.reason ? { reason: audit.reason } : {},
    },
  });
}

// --- RequestEmailChange ----------------------------------------------

export async function requestEmailChange(
  deps: HandlerDeps,
  principal: Principal | null,
  req: RequestEmailChangeRequest
): Promise<RequestEmailChangeResponse> {
  if (!principal) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }
  const userId = principal.userId;
  // Input checks run before the credential check so a request that cannot
  // succeed never consumes the caller's TOTP code.
  const newEmail = normaliseEmail(req.newEmail);
  if (!isValidEmail(newEmail)) {
    throw new HandlerError('INVALID_ARGUMENT', INVALID_EMAIL);
  }
  if (!req.password) {
    throw new HandlerError('INVALID_ARGUMENT', 'password is required');
  }

  const res = await deps.pool.query<EmailChangeUserRow>(
    `SELECT email, first_name, password, two_factor_enabled, two_factor_secret, two_factor_last_step
       FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const user = res.rows[0];
  if (!user) {
    throw new HandlerError('NOT_FOUND', 'user not found');
  }
  if (normaliseEmail(user.email) === newEmail) {
    throw new HandlerError('INVALID_ARGUMENT', EMAIL_UNCHANGED);
  }

  const credentials = await checkStepUpCredentials(deps, userId, user, req);
  if (!credentials.verified) {
    return credentials;
  }

  if (await isEmailTaken(deps.pool, newEmail, userId)) {
    await withTransaction(deps, async ({ publish }) => {
      publish({
        type: 'auth.emailChangeConflict',
        id: `auth.emailChangeConflict.${randomUUID()}`,
        payload: { userId, newEmail },
      });
      publishEmailChangeActionTaken(publish, {
        userId,
        action: 'email_change.request',
        outcome: 'denied',
        reason: EMAIL_IN_USE,
      });
    });
    return ACCEPTED;
  }

  const token = mintToken();
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TOKEN_TTL_MS);
  await withTransaction(deps, async ({ client, publish }) => {
    // A newer request overwrites any older pending change, so only the most
    // recently mailed link works.
    await client.query(
      `UPDATE auth.users
          SET pending_email = $1,
              email_change_token_hash = $2,
              email_change_expires_at = $3,
              updated_at = now()
        WHERE user_id = $4 AND deleted_at IS NULL`,
      [newEmail, hashToken(token), expiresAt, userId]
    );
    publish({
      type: 'auth.emailChangeRequested',
      id: `auth.emailChangeRequested.${randomUUID()}`,
      payload: {
        userId,
        firstName: user.first_name,
        oldEmail: user.email,
        newEmail,
        token,
        expiresAt: expiresAt.toISOString(),
      },
    });
    publishEmailChangeActionTaken(publish, {
      userId,
      action: 'email_change.request',
      outcome: 'success',
    });
  });
  return ACCEPTED;
}

// --- ConfirmEmailChange ----------------------------------------------

type SwapOutcome = 'changed' | 'conflict';

const CLEAR_PENDING_CHANGE = `pending_email = NULL,
              email_change_token_hash = NULL,
              email_change_expires_at = NULL,
              updated_at = now()`;

export async function confirmEmailChange(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: ConfirmEmailChangeRequest
): Promise<ConfirmEmailChangeResponse> {
  if (!req.token) {
    throw new HandlerError('INVALID_ARGUMENT', INVALID_OR_EXPIRED_TOKEN);
  }
  const tokenHash = hashToken(req.token);

  const outcome = await swapToPendingEmail(deps, tokenHash).catch(
    async (err: unknown): Promise<SwapOutcome> => {
      // Another account claimed the address between the check and the swap.
      // The swap rolled back, so clear the dead pending change on its own.
      if (!isUniqueViolation(err)) {
        throw err;
      }
      await deps.pool.query(
        `UPDATE auth.users SET ${CLEAR_PENDING_CHANGE} WHERE email_change_token_hash = $1`,
        [tokenHash]
      );
      return 'conflict';
    }
  );
  if (outcome === 'conflict') {
    throw new HandlerError('ALREADY_EXISTS', EMAIL_IN_USE);
  }
  return {};
}

async function swapToPendingEmail(deps: HandlerDeps, tokenHash: string): Promise<SwapOutcome> {
  return withTransaction(deps, async ({ client, publish }) => {
    const found = await client.query<PendingChangeRow>(
      `SELECT user_id, email, pending_email
         FROM auth.users
        WHERE email_change_token_hash = $1
          AND email_change_expires_at > now()
          AND pending_email IS NOT NULL
          AND deleted_at IS NULL
        FOR UPDATE`,
      [tokenHash]
    );
    const user = found.rows[0];
    if (!user) {
      throw new HandlerError('INVALID_ARGUMENT', INVALID_OR_EXPIRED_TOKEN);
    }

    if (await isEmailTaken(client, user.pending_email, user.user_id)) {
      await client.query(`UPDATE auth.users SET ${CLEAR_PENDING_CHANGE} WHERE user_id = $1`, [
        user.user_id,
      ]);
      publishEmailChangeActionTaken(publish, {
        userId: user.user_id,
        action: 'email_change.confirm',
        outcome: 'denied',
        reason: EMAIL_IN_USE,
      });
      return 'conflict';
    }

    // Outstanding verification and reset links went to the old address; they
    // must not keep working once it no longer identifies the account.
    await client.query(
      `UPDATE auth.users
          SET email = pending_email,
              email_verified = true,
              verification_token_hash = NULL,
              verification_token_expires_at = NULL,
              reset_token_hash = NULL,
              reset_token_expiration = NULL,
              tokens_valid_from = now(),
              ${CLEAR_PENDING_CHANGE}
        WHERE user_id = $1`,
      [user.user_id]
    );
    // Moving the account identity ends every session, as a password change
    // does: revoke all refresh tokens (both columns, so refresh and
    // ListSessions agree); tokens_valid_from above invalidates access tokens.
    await client.query(
      `UPDATE auth.refresh_tokens
          SET revoked_at = now(), is_revoked = true, updated_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL AND is_revoked = false`,
      [user.user_id]
    );
    publish({
      type: 'auth.emailChanged',
      id: `auth.emailChanged.${user.user_id}.${randomUUID()}`,
      payload: { userId: user.user_id, oldEmail: user.email, newEmail: user.pending_email },
    });
    publishEmailChangeActionTaken(publish, {
      userId: user.user_id,
      action: 'email_change.confirm',
      outcome: 'success',
    });
    return 'changed';
  });
}
