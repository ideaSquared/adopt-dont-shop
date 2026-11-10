// auth.userProfileChanged subscriber — keeps the denormalised
// applicant_name / applicant_email on the applications read model
// (migration 016) in step with the applicant's account.
//
// Event-carried state transfer: service.auth puts the user's current name,
// email and updated_at on the event. Only a change newer than the stored
// applicant_synced_at is applied, so a late redelivery of an older change
// can't overwrite a newer one. Once synced, the projector stops overwriting
// these columns from the application's answers.

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';

import { subscribe, type SubscriptionHandle } from '@adopt-dont-shop/events';

const DURABLE = 'applications-auth-user-profile-changed';

type ProfileChange = { userId: string; name: string | null; email: string; updatedAt: string };

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function parseProfileChange(payload: unknown): ProfileChange | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  // Narrowed to a non-null object above; each field is still checked individually.
  const { userId, firstName, lastName, email, updatedAt } = payload as Record<string, unknown>;
  if (text(userId) === '' || text(email) === '' || Number.isNaN(Date.parse(text(updatedAt)))) {
    return null;
  }
  const name = [text(firstName), text(lastName)].filter(Boolean).join(' ');
  return {
    userId: text(userId),
    name: name === '' ? null : name,
    email: text(email),
    updatedAt: text(updatedAt),
  };
}

export async function applyApplicantProfileChange(
  pool: Pick<Pool, 'query'>,
  payload: unknown
): Promise<void> {
  const change = parseProfileChange(payload);
  if (change === null) {
    return;
  }
  await pool.query(
    `UPDATE applications
        SET applicant_name = $1, applicant_email = $2, applicant_synced_at = $3
      WHERE user_id = $4 AND deleted_at IS NULL
        AND (applicant_synced_at IS NULL OR applicant_synced_at < $3)`,
    [change.name, change.email, change.updatedAt, change.userId]
  );
}

export function registerApplicantUpdatesSubscriber(opts: {
  nats: NatsConnection;
  pool: Pool;
  onError: (err: unknown, subject: string) => void;
}): SubscriptionHandle {
  return subscribe<unknown>(
    opts.nats,
    {
      subject: 'auth.userProfileChanged',
      durable: DURABLE,
      onError: (err, ctx) => opts.onError(err, ctx.subject),
    },
    payload => applyApplicantProfileChange(opts.pool, payload)
  );
}
