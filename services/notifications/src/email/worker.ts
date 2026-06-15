// Email queue worker. Polls `email_queue` for status='queued' rows that
// are due to send, claims them with FOR UPDATE SKIP LOCKED (so multiple
// service instances don't double-send), and dispatches each via the
// configured provider. Provider success → markSent. Provider failure →
// markFailed with retriable=true so the row goes back to 'queued' and
// the next poll picks it up; once `current_retries >= max_retries` the
// row terminates as 'failed'.
//
// User preference enforcement: if the email is tied to a user_id AND
// the user has opted out (global_unsubscribe / is_email_enabled=false /
// is_blacklisted), the row is short-circuited to 'unsubscribed' without
// being handed to the provider.

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { isEmailChannelOpen } from './preferences.js';
import { claimDueEmails, markFailed, markSent } from './queue.js';
import type { EmailProvider, QueuedEmail } from './types.js';

export type EmailWorkerOptions = {
  pool: Pool;
  nats: NatsConnection;
  provider: EmailProvider;
  logger: Logger;
  // Poll interval in ms. Default 2s — short enough for snappy dev
  // feedback, long enough that idle pool consumption is negligible.
  pollIntervalMs?: number;
  // Max rows claimed per tick. Default 25 — bounded so a backlog
  // doesn't monopolise the worker for one slow provider call.
  batchSize?: number;
  // How long (ms) a row may sit in 'sending' before it's treated as
  // orphaned by a crashed worker and reclaimed. Must comfortably exceed
  // the provider send timeout (Resend's is 10s) so an in-flight send is
  // never stolen. Default 120s.
  staleSendingMs?: number;
};

export type RunningEmailWorker = {
  stop: () => Promise<void>;
  // Exposed for tests + the smoke script — runs one batch synchronously
  // and returns the count of emails dispatched.
  tick: () => Promise<number>;
};

const DEFAULT_POLL_MS = 2_000;
const DEFAULT_BATCH = 25;
const DEFAULT_STALE_SENDING_MS = 120_000;

const dispatchOne = async (
  pool: Pool,
  provider: EmailProvider,
  email: QueuedEmail,
  logger: Logger
): Promise<void> => {
  // Preference check (when tied to a user).
  if (email.userId) {
    const open = await isEmailChannelOpen(pool, email.userId);
    if (!open) {
      // Re-using `markFailed` with retriable=false would terminate as
      // 'failed' which mis-categorises an opt-out. The DB transition
      // we want is sending → unsubscribed.
      await pool.query(
        `UPDATE email_queue
         SET status = 'unsubscribed',
             failure_reason = 'user opted out of email',
             updated_at = now(),
             version = version + 1
         WHERE email_id = $1`,
        [email.emailId]
      );
      logger.info('email.worker.unsubscribed', { emailId: email.emailId, userId: email.userId });
      return;
    }
  }

  const result = await provider.send(email);
  if (result.success) {
    await markSent(pool, email.emailId, result.messageId ?? null);
    logger.info('email.worker.sent', {
      emailId: email.emailId,
      provider: provider.getName(),
      messageId: result.messageId,
    });
  } else {
    // Treat all provider failures as retriable — the markFailed query
    // terminates the row once current_retries >= max_retries.
    await markFailed(pool, email.emailId, result.error ?? 'provider returned failure', true);
    logger.warn('email.worker.failed', {
      emailId: email.emailId,
      provider: provider.getName(),
      error: result.error,
    });
  }
};

export const startEmailWorker = (opts: EmailWorkerOptions): RunningEmailWorker => {
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_MS;
  const batchSize = opts.batchSize ?? DEFAULT_BATCH;
  const staleSendingMs = opts.staleSendingMs ?? DEFAULT_STALE_SENDING_MS;
  let running = true;
  let timer: NodeJS.Timeout | undefined;
  let inflight = Promise.resolve<number>(0);

  const tick = async (): Promise<number> => {
    if (!running) {
      return 0;
    }
    let claimed: QueuedEmail[] = [];
    try {
      claimed = await claimDueEmails(opts.pool, batchSize, staleSendingMs);
    } catch (err) {
      opts.logger.error('email.worker.claim_error', { err });
      return 0;
    }
    if (claimed.length === 0) {
      return 0;
    }

    // Dispatches run in parallel — a single slow provider call doesn't
    // block the rest of the batch.
    await Promise.all(
      claimed.map(email =>
        dispatchOne(opts.pool, opts.provider, email, opts.logger).catch(err => {
          opts.logger.error('email.worker.dispatch_error', {
            emailId: email.emailId,
            err,
          });
          // Mark as retriable failure so it doesn't get stuck in 'sending'.
          return markFailed(
            opts.pool,
            email.emailId,
            err instanceof Error ? err.message : String(err),
            true
          ).catch(() => undefined);
        })
      )
    );
    return claimed.length;
  };

  const schedule = (): void => {
    if (!running) {
      return;
    }
    timer = setTimeout(() => {
      inflight = tick()
        .catch(err => {
          opts.logger.error('email.worker.tick_error', { err });
          return 0;
        })
        .finally(() => {
          schedule();
        });
    }, pollIntervalMs);
  };

  schedule();

  return {
    tick,
    stop: async () => {
      running = false;
      if (timer) {
        clearTimeout(timer);
      }
      // Drain whatever is in flight so a shutdown doesn't leave rows
      // stuck in 'sending' indefinitely.
      await inflight.catch(() => undefined);
    },
  };
};
