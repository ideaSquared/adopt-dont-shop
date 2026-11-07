// Expiry of timed suspensions.
//
// ApplyUserSanction records `suspended_until` for a suspension that has an end
// date (NULL means indefinite). Two things lift an ended suspension:
//
//   1. liftExpiredSuspensions - the scheduled job (see index.ts), run in
//      bounded batches under FOR UPDATE SKIP LOCKED so replicas never lift the
//      same user twice.
//   2. liftSuspensionIfExpired - the login path, which lifts lazily so a missed
//      or delayed job can never keep someone locked out past their date.
//
// Both write the same audited `auth.actionTaken` (action `lift_suspension`) in
// the same transaction as the status change. There is no human actor: the
// event carries no actorUserId, which the audit log shows as the system.

import { randomUUID } from 'node:crypto';

import { withTransaction, type TransactionalScope } from '@adopt-dont-shop/events';

import type { HandlerDeps, UserRow } from './handlers.js';

const DEFAULT_BATCH_SIZE = 100;

// A suspension has ended once its end time is at or before `now`: expiring
// exactly now counts as ended. No end time means indefinite and never expires.
export const isSuspensionExpired = (suspendedUntil: Date | null | undefined, now: Date): boolean =>
  suspendedUntil !== null &&
  suspendedUntil !== undefined &&
  suspendedUntil.getTime() <= now.getTime();

type Trigger = 'suspension_expired' | 'login_after_expiry';

const publishSuspensionLifted = (
  publish: TransactionalScope['publish'],
  userId: string,
  suspendedUntil: Date | null | undefined,
  trigger: Trigger
): void => {
  publish({
    type: 'auth.actionTaken',
    id: `auth.actionTaken.${randomUUID()}`,
    payload: {
      eventId: randomUUID(),
      service: 'service.auth',
      subject: 'auth.actionTaken',
      aggregateType: 'user',
      aggregateId: userId,
      action: 'lift_suspension',
      outcome: 'success',
      occurredAt: new Date().toISOString(),
      payload: {
        before: { status: 'suspended' },
        after: { status: 'active' },
        suspendedUntil: suspendedUntil ? suspendedUntil.toISOString() : null,
        trigger,
      },
    },
  });
};

export type LiftExpiredSuspensionsOptions = {
  now?: Date;
  batchSize?: number;
};

// Scheduled sweep. Returns how many users were reactivated.
export async function liftExpiredSuspensions(
  deps: HandlerDeps,
  opts: LiftExpiredSuspensionsOptions = {}
): Promise<{ liftedCount: number }> {
  const now = opts.now ?? new Date();
  const batchSize = opts.batchSize ?? DEFAULT_BATCH_SIZE;
  let liftedCount = 0;

  for (;;) {
    const batch = await withTransaction(deps, async ({ client, publish }) => {
      // The CTE locks the due rows (skipping any another replica holds) and
      // keeps their previous suspended_until for the audit payload. The WHERE
      // is inclusive (<=) so a suspension expiring exactly now is lifted, and
      // `suspended_until IS NOT NULL` keeps indefinite suspensions untouched.
      const res = await client.query<{ user_id: string; suspended_until: Date }>(
        `
        WITH due AS (
          SELECT user_id, suspended_until
          FROM auth.users
          WHERE status = 'suspended'
            AND suspended_until IS NOT NULL
            AND suspended_until <= $1
            AND deleted_at IS NULL
          ORDER BY suspended_until
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE auth.users u
        SET status = 'active',
            suspended_until = NULL,
            updated_at = now(),
            version = version + 1
        FROM due
        WHERE u.user_id = due.user_id
        RETURNING u.user_id, due.suspended_until
        `,
        [now, batchSize]
      );
      for (const row of res.rows) {
        publishSuspensionLifted(publish, row.user_id, row.suspended_until, 'suspension_expired');
      }
      return res.rows.length;
    });
    liftedCount += batch;
    if (batch < batchSize) {
      return { liftedCount };
    }
  }
}

// Login-time check. Given the row the login read, lifts the suspension if it
// has ended. Returns the user's row when the account is no longer suspended
// (lifted now, or already lifted by another replica), or undefined when it is
// still suspended and the caller must keep refusing.
export async function liftSuspensionIfExpired(
  deps: HandlerDeps,
  user: UserRow,
  now: Date = new Date()
): Promise<UserRow | undefined> {
  if (user.status !== 'suspended' || !isSuspensionExpired(user.suspended_until, now)) {
    return undefined;
  }

  return withTransaction(deps, async ({ client, publish }) => {
    // Re-read under lock: another replica or a concurrent admin action may have
    // changed the account since login read it.
    const current = await client.query<UserRow>(
      `SELECT * FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [user.user_id]
    );
    const row = current.rows[0];
    if (!row) {
      return undefined;
    }
    if (row.status !== 'suspended') {
      return row;
    }
    if (!isSuspensionExpired(row.suspended_until, now)) {
      return undefined;
    }

    const updated = await client.query<UserRow>(
      `
      UPDATE auth.users
      SET status = 'active',
          suspended_until = NULL,
          updated_at = now(),
          version = version + 1
      WHERE user_id = $1 AND deleted_at IS NULL
      RETURNING *
      `,
      [user.user_id]
    );
    publishSuspensionLifted(publish, user.user_id, row.suspended_until, 'login_after_expiry');
    return updated.rows[0];
  });
}
