import type { Pool } from 'pg';
import type { Logger } from 'winston';
import { describe, expect, it, vi } from 'vitest';

import { startEmailWorker } from './worker.js';
import type { EmailProvider, ProviderSendResult, QueuedEmail } from './types.js';

const quietLogger = (): Logger => {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
};

const queuedFixture = (overrides: Partial<QueuedEmail> = {}): QueuedEmail => ({
  emailId: 'em-1',
  templateId: null,
  fromEmail: 'noreply@example.com',
  fromName: 'Sender',
  toEmail: 'jane@example.com',
  toName: 'Jane',
  ccEmails: [],
  bccEmails: [],
  replyToEmail: null,
  subject: 'Hi',
  htmlContent: '<p>Hi</p>',
  textContent: null,
  templateData: {},
  attachments: [],
  type: 'transactional',
  priority: 'normal',
  status: 'sending',
  scheduledFor: null,
  maxRetries: 3,
  currentRetries: 0,
  lastAttemptAt: null,
  sentAt: null,
  failureReason: null,
  providerId: null,
  providerMessageId: null,
  tracking: null,
  metadata: {},
  campaignId: null,
  userId: null,
  tags: [],
  idempotencyKey: null,
  ...overrides,
});

// makePool builds a Pool double with a scriptable .query method.
const makePool = (scripts: Array<{ rows: unknown[] }>) => {
  const queries: Array<{ sql: string; params: unknown[] | undefined }> = [];
  const pool = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      queries.push({ sql, params });
      const next = scripts.shift();
      if (!next) return { rows: [] };
      return next;
    }),
  };
  return { pool: pool as unknown as Pool, queries };
};

const makeProvider = (result: ProviderSendResult, name = 'test-provider'): EmailProvider => ({
  send: vi.fn(async () => result),
  getName: () => name,
  validateConfiguration: () => true,
});

describe('email worker', () => {
  it('tick() returns 0 when no rows are due', async () => {
    const { pool } = makePool([{ rows: [] }]);
    const worker = startEmailWorker({
      pool,
      nats: {} as never,
      provider: makeProvider({ success: true }),
      logger: quietLogger(),
      pollIntervalMs: 60_000, // never auto-tick during the test
    });
    try {
      const n = await worker.tick();
      expect(n).toBe(0);
    } finally {
      await worker.stop();
    }
  });

  it('marks the row sent when the provider succeeds', async () => {
    const claimed = [queuedFixture({ emailId: 'em-A' })];
    const { pool, queries } = makePool([
      // claimDueEmails returns the claimed row.
      { rows: claimed.map(toRow) },
      // markSent UPDATE.
      { rows: [] },
    ]);
    const provider = makeProvider({ success: true, messageId: 'prv-msg-1' });
    const worker = startEmailWorker({
      pool,
      nats: {} as never,
      provider,
      logger: quietLogger(),
      pollIntervalMs: 60_000,
    });
    try {
      const n = await worker.tick();
      expect(n).toBe(1);
      expect(provider.send).toHaveBeenCalledTimes(1);
      // Second query is markSent.
      const markSentCall = queries[1];
      expect(markSentCall.sql).toContain("SET status = 'sent'");
      expect(markSentCall.params).toEqual(['em-A', 'prv-msg-1']);
    } finally {
      await worker.stop();
    }
  });

  it('marks failed (retriable) when the provider returns success=false', async () => {
    const claimed = [queuedFixture({ emailId: 'em-B' })];
    const { pool, queries } = makePool([{ rows: claimed.map(toRow) }, { rows: [] }]);
    const provider = makeProvider({ success: false, error: 'smtp 451' });
    const worker = startEmailWorker({
      pool,
      nats: {} as never,
      provider,
      logger: quietLogger(),
      pollIntervalMs: 60_000,
    });
    try {
      await worker.tick();
      const markFailedCall = queries[1];
      expect(markFailedCall.sql).toContain('current_retries = current_retries + 1');
      expect(markFailedCall.params).toEqual(['em-B', 'smtp 451', true]);
    } finally {
      await worker.stop();
    }
  });

  it('short-circuits to unsubscribed when the user has opted out', async () => {
    const claimed = [queuedFixture({ emailId: 'em-C', userId: 'usr-optout' })];
    const { pool, queries } = makePool([
      // claimDueEmails.
      { rows: claimed.map(toRow) },
      // isEmailChannelOpen → returns blocked row.
      {
        rows: [{ is_email_enabled: false, global_unsubscribe: false, is_blacklisted: false }],
      },
      // UPDATE → unsubscribed.
      { rows: [] },
    ]);
    const provider = makeProvider({ success: true });
    const worker = startEmailWorker({
      pool,
      nats: {} as never,
      provider,
      logger: quietLogger(),
      pollIntervalMs: 60_000,
    });
    try {
      await worker.tick();
      expect(provider.send).not.toHaveBeenCalled();
      const updateCall = queries[2];
      expect(updateCall.sql).toContain("SET status = 'unsubscribed'");
      expect(updateCall.params).toEqual(['em-C']);
    } finally {
      await worker.stop();
    }
  });

  it('suppresses a marketing email when the user opted out of that type', async () => {
    const claimed = [queuedFixture({ emailId: 'em-M', userId: 'usr-1', type: 'marketing' })];
    const { pool, queries } = makePool([
      { rows: claimed.map(toRow) }, // claimDueEmails
      // Channel toggles are all open, but preferences[] opts out of marketing.
      {
        rows: [
          {
            is_email_enabled: true,
            global_unsubscribe: false,
            is_blacklisted: false,
            preferences: [{ type: 'marketing', optedOut: true }],
          },
        ],
      },
      { rows: [] }, // UPDATE → unsubscribed
    ]);
    const provider = makeProvider({ success: true });
    const worker = startEmailWorker({
      pool,
      nats: {} as never,
      provider,
      logger: quietLogger(),
      pollIntervalMs: 60_000,
    });
    try {
      await worker.tick();
      expect(provider.send).not.toHaveBeenCalled();
      expect(queries[2].sql).toContain("SET status = 'unsubscribed'");
    } finally {
      await worker.stop();
    }
  });

  it('still sends a transactional email when only marketing is opted out', async () => {
    const claimed = [queuedFixture({ emailId: 'em-T', userId: 'usr-1', type: 'transactional' })];
    const { pool } = makePool([
      { rows: claimed.map(toRow) }, // claimDueEmails
      {
        rows: [
          {
            is_email_enabled: true,
            global_unsubscribe: false,
            is_blacklisted: false,
            preferences: [{ type: 'marketing', optedOut: true }],
          },
        ],
      },
      { rows: [] }, // markSent
    ]);
    const provider = makeProvider({ success: true, messageId: 'm' });
    const worker = startEmailWorker({
      pool,
      nats: {} as never,
      provider,
      logger: quietLogger(),
      pollIntervalMs: 60_000,
    });
    try {
      await worker.tick();
      expect(provider.send).toHaveBeenCalledTimes(1);
    } finally {
      await worker.stop();
    }
  });
});

// Map QueuedEmail back to a flat row matching what claimDueEmails returns.
function toRow(q: QueuedEmail): Record<string, unknown> {
  return {
    email_id: q.emailId,
    template_id: q.templateId,
    from_email: q.fromEmail,
    from_name: q.fromName,
    to_email: q.toEmail,
    to_name: q.toName,
    cc_emails: q.ccEmails,
    bcc_emails: q.bccEmails,
    reply_to_email: q.replyToEmail,
    subject: q.subject,
    html_content: q.htmlContent,
    text_content: q.textContent,
    template_data: q.templateData,
    attachments: q.attachments,
    type: q.type,
    priority: q.priority,
    status: q.status,
    scheduled_for: q.scheduledFor,
    max_retries: q.maxRetries,
    current_retries: q.currentRetries,
    last_attempt_at: q.lastAttemptAt,
    sent_at: q.sentAt,
    failure_reason: q.failureReason,
    provider_id: q.providerId,
    provider_message_id: q.providerMessageId,
    tracking: q.tracking,
    metadata: q.metadata,
    campaign_id: q.campaignId,
    user_id: q.userId,
    tags: q.tags,
    idempotency_key: q.idempotencyKey,
  };
}
