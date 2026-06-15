// Email queue persistence — INSERT, claim-for-send, mark-sent/failed.
// Pure data-access; the sender + worker compose these.
//
// `claimDueEmails` uses `SELECT ... FOR UPDATE SKIP LOCKED` so multiple
// workers can drain the same queue without stepping on each other —
// each row is locked, marked `status=sending`, and released back to the
// pool when the dispatch completes (sent / failed update).

import type { Pool, PoolClient } from 'pg';

import type {
  EmailAttachment,
  EmailPriority,
  EmailStatus,
  EmailType,
  QueuedEmail,
} from './types.js';

type EmailQueueRow = {
  email_id: string;
  template_id: string | null;
  from_email: string;
  from_name: string | null;
  to_email: string;
  to_name: string | null;
  cc_emails: string[];
  bcc_emails: string[];
  reply_to_email: string | null;
  subject: string;
  html_content: string;
  text_content: string | null;
  template_data: Record<string, unknown>;
  attachments: EmailAttachment[];
  type: EmailType;
  priority: EmailPriority;
  status: EmailStatus;
  scheduled_for: Date | null;
  max_retries: number;
  current_retries: number;
  last_attempt_at: Date | null;
  sent_at: Date | null;
  failure_reason: string | null;
  provider_id: string | null;
  provider_message_id: string | null;
  tracking: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  campaign_id: string | null;
  user_id: string | null;
  tags: string[];
  idempotency_key: string | null;
};

export const rowToQueuedEmail = (row: EmailQueueRow): QueuedEmail => ({
  emailId: row.email_id,
  templateId: row.template_id,
  fromEmail: row.from_email,
  fromName: row.from_name,
  toEmail: row.to_email,
  toName: row.to_name,
  ccEmails: row.cc_emails,
  bccEmails: row.bcc_emails,
  replyToEmail: row.reply_to_email,
  subject: row.subject,
  htmlContent: row.html_content,
  textContent: row.text_content,
  templateData: row.template_data,
  attachments: row.attachments,
  type: row.type,
  priority: row.priority,
  status: row.status,
  scheduledFor: row.scheduled_for,
  maxRetries: row.max_retries,
  currentRetries: row.current_retries,
  lastAttemptAt: row.last_attempt_at,
  sentAt: row.sent_at,
  failureReason: row.failure_reason,
  providerId: row.provider_id,
  providerMessageId: row.provider_message_id,
  tracking: row.tracking,
  metadata: row.metadata,
  campaignId: row.campaign_id,
  userId: row.user_id,
  tags: row.tags,
  idempotencyKey: row.idempotency_key,
});

export type InsertEmailQueueInput = {
  emailId: string;
  templateId?: string | null;
  fromEmail: string;
  fromName?: string | null;
  toEmail: string;
  toName?: string | null;
  ccEmails?: string[];
  bccEmails?: string[];
  replyToEmail?: string | null;
  subject: string;
  htmlContent: string;
  textContent?: string | null;
  templateData?: Record<string, unknown>;
  attachments?: EmailAttachment[];
  type: EmailType;
  priority: EmailPriority;
  scheduledFor?: Date | null;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
  campaignId?: string | null;
  userId?: string | null;
  tags?: string[];
  idempotencyKey?: string | null;
  createdBy?: string | null;
};

// Conn type — accepts either a Pool or a PoolClient so callers can run
// in their own transaction (the SendEmail handler uses a withTransaction
// for publish-after-commit).
export type DbConn = Pool | PoolClient;

export const insertEmail = async (
  conn: DbConn,
  input: InsertEmailQueueInput
): Promise<EmailQueueRow> => {
  const res = await conn.query<EmailQueueRow>(
    `
    INSERT INTO email_queue (
      email_id, template_id,
      from_email, from_name, to_email, to_name,
      cc_emails, bcc_emails, reply_to_email,
      subject, html_content, text_content,
      template_data, attachments,
      type, priority, status,
      scheduled_for, max_retries, current_retries,
      metadata, campaign_id, user_id, tags,
      idempotency_key,
      created_by, updated_by, version,
      created_at, updated_at
    )
    VALUES (
      $1, $2,
      $3, $4, $5, $6,
      $7::text[], $8::text[], $9,
      $10, $11, $12,
      $13::jsonb, $14::jsonb,
      $15, $16, 'queued',
      $17, $18, 0,
      $19::jsonb, $20, $21, $22::text[],
      $23,
      $24, $24, 0,
      now(), now()
    )
    RETURNING *
    `,
    [
      input.emailId,
      input.templateId ?? null,
      input.fromEmail,
      input.fromName ?? null,
      input.toEmail,
      input.toName ?? null,
      input.ccEmails ?? [],
      input.bccEmails ?? [],
      input.replyToEmail ?? null,
      input.subject,
      input.htmlContent,
      input.textContent ?? null,
      JSON.stringify(input.templateData ?? {}),
      JSON.stringify(input.attachments ?? []),
      input.type,
      input.priority,
      input.scheduledFor ?? null,
      input.maxRetries ?? 3,
      JSON.stringify(input.metadata ?? {}),
      input.campaignId ?? null,
      input.userId ?? null,
      input.tags ?? [],
      input.idempotencyKey ?? null,
      input.createdBy ?? null,
    ]
  );
  return res.rows[0];
};

// Look up an existing row by idempotency_key. Returns null when absent.
export const findByIdempotencyKey = async (
  conn: DbConn,
  idempotencyKey: string
): Promise<EmailQueueRow | null> => {
  const res = await conn.query<EmailQueueRow>(
    `SELECT * FROM email_queue WHERE idempotency_key = $1 LIMIT 1`,
    [idempotencyKey]
  );
  return res.rows[0] ?? null;
};

// How long a row may sit in `sending` before it's treated as orphaned by
// a crashed worker and reclaimed. A process that dies between the claim
// (status→'sending') and markSent/markFailed would otherwise leave the
// row stuck forever — claimDueEmails only ever looked at 'queued'. The
// reclaim path bumps current_retries so a row whose worker keeps crashing
// mid-send still terminates as 'failed' once max_retries is exhausted,
// rather than being retried forever.
const DEFAULT_STALE_SENDING_MS = 120_000;

// Claim up to `limit` rows that are due to send. Two sources:
//   1. status='queued' AND (scheduled_for IS NULL OR scheduled_for <= now())
//   2. status='sending' whose last_attempt_at is older than the stale
//      timeout (orphaned by a crashed worker) AND still have retry budget.
// Claimed rows are set to 'sending' and stamped `last_attempt_at`.
// Reclaimed (source 2) rows additionally bump current_retries.
//
// Orphaned 'sending' rows that have exhausted max_retries are terminated
// as 'failed' in the same statement (they are NOT returned for dispatch).
//
// SKIP LOCKED so multiple worker instances draining the same queue
// don't block each other.
export const claimDueEmails = async (
  conn: DbConn,
  limit: number,
  staleSendingMs: number = DEFAULT_STALE_SENDING_MS
): Promise<QueuedEmail[]> => {
  const res = await conn.query<EmailQueueRow>(
    `
    WITH due AS (
      SELECT email_id
      FROM email_queue
      WHERE (
          status = 'queued'
          AND (scheduled_for IS NULL OR scheduled_for <= now())
        )
        OR (
          status = 'sending'
          AND last_attempt_at IS NOT NULL
          AND last_attempt_at <= now() - make_interval(secs => $2 / 1000.0)
        )
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high'   THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low'    THEN 4
        END,
        created_at
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    ),
    -- Orphaned 'sending' rows with no retry budget left terminate as
    -- 'failed' instead of being reclaimed — they never come back.
    exhausted AS (
      UPDATE email_queue q
      SET status = 'failed',
          current_retries = q.current_retries + 1,
          failure_reason = 'reclaimed after stale send; max_retries exhausted',
          updated_at = now(),
          version = q.version + 1
      FROM due
      WHERE q.email_id = due.email_id
        AND q.status = 'sending'
        AND q.current_retries + 1 >= q.max_retries
      RETURNING q.email_id
    )
    UPDATE email_queue q
    SET status = 'sending',
        -- Reclaimed orphans count as a fresh attempt; fresh 'queued'
        -- claims don't (markFailed already counts their retries).
        current_retries = CASE WHEN q.status = 'sending'
          THEN q.current_retries + 1 ELSE q.current_retries END,
        last_attempt_at = now(),
        updated_at = now(),
        version = q.version + 1
    FROM due
    WHERE q.email_id = due.email_id
      AND q.email_id NOT IN (SELECT email_id FROM exhausted)
    RETURNING q.*
    `,
    [limit, staleSendingMs]
  );
  return res.rows.map(rowToQueuedEmail);
};

export const markSent = async (
  conn: DbConn,
  emailId: string,
  providerMessageId: string | null
): Promise<void> => {
  await conn.query(
    `
    UPDATE email_queue
    SET status = 'sent',
        sent_at = now(),
        provider_message_id = COALESCE($2, provider_message_id),
        updated_at = now(),
        version = version + 1
    WHERE email_id = $1
    `,
    [emailId, providerMessageId]
  );
};

export const markFailed = async (
  conn: DbConn,
  emailId: string,
  reason: string,
  retriable: boolean
): Promise<void> => {
  // Retriable failures go back to 'queued' and bump `current_retries`;
  // when current_retries >= max_retries the row terminates as 'failed'.
  await conn.query(
    `
    UPDATE email_queue
    SET status = CASE
        WHEN $3::boolean AND current_retries + 1 < max_retries THEN 'queued'::email_queue_status
        ELSE 'failed'::email_queue_status
      END,
      current_retries = current_retries + 1,
      failure_reason = $2,
      updated_at = now(),
      version = version + 1
    WHERE email_id = $1
    `,
    [emailId, reason, retriable]
  );
};
