// Email channel adapter — the missing sibling of the push worker.
//
// Subscribes to `notifications.created` and, for the transactional
// notification types that warrant an email, enqueues one into email_queue
// (the existing email worker then sends it). This is what makes domain
// events (applications.approved, rescue.staffInvited, …) actually reach a
// user's inbox; before this, the subscriber translators only ever wrote an
// in-app row and the "email fires from a sibling worker" comment was a
// promise with no implementation.
//
// Dedup is via the email_queue idempotency key (deterministic per
// notification): a redelivered event hits the unique constraint instead of
// enqueuing a second email — no processed_events row needed, the insert IS
// the claim and it's atomic with the enqueue.

import { randomUUID } from 'node:crypto';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { subscribe, type SubscriptionHandle } from '@adopt-dont-shop/events';

import { loadNotificationPrefs, shouldDeliver } from '../preferences-gate.js';

import { insertEmail } from './queue.js';

const DURABLE = 'notifications-email-channel';

// Types that warrant a transactional email alongside the in-app record.
// High-frequency / low-importance types (chat messages, the pet feed,
// marketing) are intentionally excluded — emailing each would be spam, and
// the in-app channel + digest already cover them. Category + channel
// preferences still gate everything below via shouldDeliver.
const EMAIL_WORTHY_TYPES = new Set<string>([
  'application_status',
  'adoption_approved',
  'adoption_rejected',
  'home_visit_scheduled',
  'interview_scheduled',
  'reference_request',
  'account_security',
  'rescue_invitation',
]);

export type Recipient = { email: string; name?: string };
export type ResolveRecipient = (userId: string) => Promise<Recipient | null>;

type NotificationCreatedEvent = {
  notificationId: string;
  userId: string;
  type: string;
  channel: string;
};

type NotificationRowLite = {
  title: string;
  message: string;
};

export type EmailChannelWorkerOptions = {
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
  resolveRecipient: ResolveRecipient;
  fromEmail: string;
  fromName: string;
};

export type RunningEmailChannelWorker = { stop: () => Promise<void> };

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderHtml = (title: string, message: string): string =>
  `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`;

export const startEmailChannelWorker = (
  opts: EmailChannelWorkerOptions
): RunningEmailChannelWorker => {
  const subscription: SubscriptionHandle = subscribe<NotificationCreatedEvent>(
    opts.nats,
    {
      subject: 'notifications.created',
      durable: DURABLE,
      onError: err => opts.logger.error('email.channel.subscriber_error', { err }),
    },
    async ev => {
      if (!ev.userId || !EMAIL_WORTHY_TYPES.has(ev.type)) {
        return;
      }

      const prefs = await loadNotificationPrefs(opts.pool, ev.userId);
      if (!shouldDeliver(prefs, { type: ev.type, channel: 'email', now: new Date() })) {
        return;
      }

      const rows = await opts.pool.query<NotificationRowLite>(
        `SELECT title, message FROM notifications.notifications WHERE notification_id = $1`,
        [ev.notificationId]
      );
      const row = rows.rows[0];
      if (!row) {
        return;
      }

      const recipient = await opts.resolveRecipient(ev.userId);
      if (!recipient) {
        opts.logger.warn('email.channel.no_recipient', {
          userId: ev.userId,
          notificationId: ev.notificationId,
        });
        return;
      }

      try {
        await insertEmail(opts.pool, {
          emailId: randomUUID(),
          fromEmail: opts.fromEmail,
          fromName: opts.fromName,
          toEmail: recipient.email,
          toName: recipient.name ?? null,
          subject: row.title,
          htmlContent: renderHtml(row.title, row.message),
          textContent: row.message,
          type: 'notification',
          priority: 'normal',
          userId: ev.userId,
          // Deterministic key → a redelivered notifications.created hits the
          // unique constraint instead of enqueuing a duplicate email.
          idempotencyKey: `notif-email:${ev.notificationId}`,
        });
      } catch (err) {
        const pgErr = err as { code?: string; constraint?: string };
        if (pgErr.code === '23505' && pgErr.constraint === 'email_queue_idempotency_key_unique') {
          // Already enqueued for this notification — a redelivery no-op.
          return;
        }
        throw err;
      }
    }
  );

  opts.logger.info('email channel worker started', { subject: 'notifications.created' });
  return {
    stop: async () => {
      await subscription.drain().catch(() => undefined);
    },
  };
};
