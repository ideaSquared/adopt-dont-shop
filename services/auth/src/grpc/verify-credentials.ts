// Step-up re-authentication handler (ADS-1205). Verifies the calling
// principal's password (and a current TOTP when 2FA is enabled) and returns
// pass/fail. Unlike Login it mints NO tokens and mutates no session/cookie
// state — the gateway calls it inline before a sensitive action (GDPR account
// erasure) and only proceeds when it verifies.
//
// Discipline (mirrors Login):
//   - The password is compared BEFORE the TOTP so a wrong password never
//     consumes a code via the replay-guarded verifyAndConsumeTotp.
//   - Backup/recovery codes are NOT accepted here — a current TOTP is required
//     for 2FA users (a leaked backup code must not clear a step-up gate).
//   - No login-lockout coupling: this path does not touch login_attempts /
//     locked_until. The only side effect on a correct-password branch is the
//     TOTP replay watermark advanced by verifyAndConsumeTotp.
//   - A `verify` audit event is published (outcome success|denied) inside
//     withTransaction on both decided paths — even though neither writes a row,
//     the same publish-after-commit discipline the rest of auth follows.

import { randomUUID } from 'node:crypto';

import type { Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import type { VerifyCredentialsRequest, VerifyCredentialsResponse } from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';
import { verifyAndConsumeTotp } from './totp-verification.js';

// Only the columns the step-up check reads: the password to compare, the 2FA
// triplet for the replay-guarded TOTP verify, and the denormalised email for
// the audit snapshot.
type VerifyUserRow = {
  email: string;
  password: string;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  two_factor_last_step: number | null;
};

// Forensic record of a step-up verification, published as `auth.actionTaken`
// so service.audit's wildcard subscriber persists it. Routed through
// withTransaction (even with no DB write) to keep the module's
// publish-after-commit discipline. `outcome` is 'denied' rather than 'failure'
// for a rejected credential — the system is declining, not erroring.
async function publishVerifyActionTaken(
  deps: HandlerDeps,
  params: { outcome: 'success' | 'denied'; userId: string; email: string }
): Promise<void> {
  await withTransaction(deps, async ({ publish }) => {
    publish({
      type: 'auth.actionTaken',
      id: `auth.actionTaken.${randomUUID()}`,
      payload: {
        eventId: randomUUID(),
        service: 'service.auth',
        subject: 'auth.actionTaken',
        aggregateType: 'user',
        aggregateId: params.userId,
        actorUserId: params.userId,
        actorEmailSnapshot: params.email,
        action: 'verify',
        outcome: params.outcome,
        occurredAt: new Date().toISOString(),
      },
    });
  });
}

export async function verifyCredentials(
  deps: HandlerDeps,
  principal: Principal | null,
  req: VerifyCredentialsRequest
): Promise<VerifyCredentialsResponse> {
  if (!principal) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }
  if (!req.password) {
    throw new HandlerError('INVALID_ARGUMENT', 'password is required');
  }

  const res = await deps.pool.query<VerifyUserRow>(
    `SELECT email, password, two_factor_enabled, two_factor_secret, two_factor_last_step
       FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [principal.userId]
  );
  const user = res.rows[0];
  if (!user) {
    throw new HandlerError('NOT_FOUND', 'user not found');
  }

  // Password first (ADS-1205): a wrong password is a denial and MUST NOT reach
  // the TOTP verifier, so it can never consume a code.
  const passwordOk = await deps.passwordHasher.compare(req.password, user.password);
  if (!passwordOk) {
    await publishVerifyActionTaken(deps, {
      outcome: 'denied',
      userId: principal.userId,
      email: user.email,
    });
    return { verified: false, twoFactorRequired: false };
  }

  // Second factor. When 2FA is enabled a current TOTP is required. A call with
  // no code is answered with two_factor_required (not a denial) so the caller
  // can collect a code and re-submit — mirroring Login's first-call idiom.
  if (user.two_factor_enabled) {
    if (!req.twoFactorToken) {
      return { verified: false, twoFactorRequired: true };
    }
    const totpOk = await verifyAndConsumeTotp(
      deps,
      {
        userId: principal.userId,
        encryptedSecret: user.two_factor_secret,
        lastStep: user.two_factor_last_step,
      },
      req.twoFactorToken
    );
    if (!totpOk) {
      await publishVerifyActionTaken(deps, {
        outcome: 'denied',
        userId: principal.userId,
        email: user.email,
      });
      return { verified: false, twoFactorRequired: false };
    }
  }

  await publishVerifyActionTaken(deps, {
    outcome: 'success',
    userId: principal.userId,
    email: user.email,
  });
  return { verified: true, twoFactorRequired: false };
}
