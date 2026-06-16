// Email preferences — per-user row in `email_preferences`. The service
// auto-creates a default row on first read so the GetEmailPreferences
// RPC always returns something. The `checkCanSend` helper bridges the
// queue worker → preferences check: when a user has globally
// unsubscribed or disabled email entirely, the queued row is short-
// circuited to status='unsubscribed' instead of being dispatched.

import { randomUUID } from 'node:crypto';

import type { DbConn } from './queue.js';
import type { EmailType } from './types.js';

export type EmailPreferencesRow = {
  preference_id: string;
  user_id: string;
  is_email_enabled: boolean;
  global_unsubscribe: boolean;
  preferences: Array<Record<string, unknown>>;
  language: string;
  timezone: string;
  email_format: 'html' | 'text' | 'both';
  digest_frequency: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'never';
  digest_time: string;
  unsubscribe_token: string;
  last_digest_sent: Date | null;
  bounce_count: number;
  last_bounce_at: Date | null;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  blacklisted_at: Date | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

const generateUnsubscribeToken = (): string =>
  // 32-byte random — base16 is plenty for an unsubscribe link.
  Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

export const findOrCreatePreferences = async (
  conn: DbConn,
  userId: string
): Promise<EmailPreferencesRow> => {
  const existing = await conn.query<EmailPreferencesRow>(
    `SELECT * FROM email_preferences WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const inserted = await conn.query<EmailPreferencesRow>(
    `
    INSERT INTO email_preferences (
      preference_id, user_id, unsubscribe_token,
      preferences, metadata,
      created_at, updated_at
    )
    VALUES (
      $1, $2, $3,
      '[]'::jsonb, '{}'::jsonb,
      now(), now()
    )
    -- A concurrent insert may have raced us; either path returns the row.
    ON CONFLICT (user_id) DO UPDATE
      SET updated_at = email_preferences.updated_at
    RETURNING *
    `,
    [randomUUID(), userId, generateUnsubscribeToken()]
  );
  return inserted.rows[0];
};

export type PreferencesPatch = Partial<{
  isEmailEnabled: boolean;
  globalUnsubscribe: boolean;
  preferences: Array<Record<string, unknown>>;
  language: string;
  timezone: string;
  emailFormat: 'html' | 'text' | 'both';
  digestFrequency: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'never';
  digestTime: string;
}>;

export const updatePreferences = async (
  conn: DbConn,
  userId: string,
  patch: PreferencesPatch
): Promise<EmailPreferencesRow> => {
  // Ensure the row exists; the COALESCE pattern below means we can pass
  // null for fields the caller didn't supply and keep the current value.
  await findOrCreatePreferences(conn, userId);
  const res = await conn.query<EmailPreferencesRow>(
    `
    UPDATE email_preferences
    SET is_email_enabled  = COALESCE($2, is_email_enabled),
        global_unsubscribe = COALESCE($3, global_unsubscribe),
        preferences       = COALESCE($4::jsonb, preferences),
        language          = COALESCE($5, language),
        timezone          = COALESCE($6, timezone),
        email_format      = COALESCE($7::email_preferences_format, email_format),
        digest_frequency  = COALESCE($8::email_preferences_digest_frequency, digest_frequency),
        digest_time       = COALESCE($9, digest_time),
        updated_at        = now(),
        version           = version + 1
    WHERE user_id = $1
    RETURNING *
    `,
    [
      userId,
      patch.isEmailEnabled ?? null,
      patch.globalUnsubscribe ?? null,
      patch.preferences ? JSON.stringify(patch.preferences) : null,
      patch.language ?? null,
      patch.timezone ?? null,
      patch.emailFormat ?? null,
      patch.digestFrequency ?? null,
      patch.digestTime ?? null,
    ]
  );
  return res.rows[0];
};

// True iff the email channel is open for `userId`. False when:
//   - blacklisted (hard suppression — bounce / abuse)
//   - global unsubscribe (user clicked unsubscribe-all)
//   - email channel disabled
//   - the user has opted out of this specific email `type` (when provided)
//
// Per-type opt-outs live in the `preferences[]` JSONB array as entries of the
// shape `{ type: EmailType, optedOut: true }`. Malformed/unknown entries are
// ignored (fail-open to "allowed") so a bad row can't silently suppress
// transactional mail.
export const isEmailTypeOptedOut = (
  preferences: Array<Record<string, unknown>>,
  type: EmailType
): boolean =>
  preferences.some(
    e => e !== null && typeof e === 'object' && e.type === type && e.optedOut === true
  );

export const isEmailChannelOpen = async (
  conn: DbConn,
  userId: string,
  type?: EmailType
): Promise<boolean> => {
  const res = await conn.query<{
    is_email_enabled: boolean;
    global_unsubscribe: boolean;
    is_blacklisted: boolean;
    preferences: Array<Record<string, unknown>>;
  }>(
    `
    SELECT is_email_enabled, global_unsubscribe, is_blacklisted, preferences
    FROM email_preferences
    WHERE user_id = $1
    LIMIT 1
    `,
    [userId]
  );
  const row = res.rows[0];
  // Missing row = defaults (everything on), so allow.
  if (!row) {
    return true;
  }
  if (!row.is_email_enabled || row.global_unsubscribe || row.is_blacklisted) {
    return false;
  }
  if (type !== undefined && isEmailTypeOptedOut(row.preferences ?? [], type)) {
    return false;
  }
  return true;
};
