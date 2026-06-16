// ResendProvider — production transactional email provider. Wraps the
// Resend SDK with a per-send timeout so a hung API call can't stall the
// queue worker.

import { Resend } from 'resend';

import type { createLogger } from '@adopt-dont-shop/observability';

import type { EmailProvider, ProviderSendResult, QueuedEmail } from '../types.js';

import { sanitizeEmail } from './base.js';

// 10s per-send budget. Resend's SDK doesn't accept an AbortSignal, so we
// race the call against a timer (same pattern the monolith uses).
const RESEND_SEND_TIMEOUT_MS = 10_000;

export type ResendProviderConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
};

export type ResendProviderDeps = {
  config: ResendProviderConfig;
  logger: ReturnType<typeof createLogger>;
  // Injectable for tests — defaults to a real Resend client.
  client?: Pick<Resend, 'emails'>;
};

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Resend send exceeded ${ms}ms timeout`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export const createResendProvider = (deps: ResendProviderDeps): EmailProvider => {
  const client = deps.client ?? new Resend(deps.config.apiKey);

  return {
    async send(email: QueuedEmail): Promise<ProviderSendResult> {
      const sanitized = sanitizeEmail(email);
      const payload = {
        from: sanitized.from,
        to: sanitized.to,
        subject: sanitized.subject,
        html: sanitized.html,
        ...(sanitized.text ? { text: sanitized.text } : {}),
        ...(deps.config.replyTo ? { replyTo: deps.config.replyTo } : {}),
      };

      // Stable idempotency key so a retry after a post-send bookkeeping
      // failure (provider succeeded, then markSent threw and the row was
      // re-queued) does NOT deliver the email twice — Resend dedupes on the
      // Idempotency-Key header. emailId is stable across retries of the row.
      const idempotencyKey = email.idempotencyKey ?? email.emailId;

      try {
        const result = await withTimeout(
          client.emails.send(payload, { idempotencyKey }),
          RESEND_SEND_TIMEOUT_MS
        );
        if (result.error !== null) {
          deps.logger.error('email.resend.send_failed', {
            to: sanitized.to,
            subject: sanitized.subject,
            error: result.error.message,
          });
          return { success: false, error: result.error.message };
        }
        deps.logger.info('email.resend.send_ok', {
          messageId: result.data.id,
          to: sanitized.to,
          subject: sanitized.subject,
        });
        return { success: true, messageId: result.data.id };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        deps.logger.error('email.resend.send_error', {
          to: sanitized.to,
          subject: sanitized.subject,
          error: message,
        });
        return { success: false, error: message };
      }
    },
    getName: () => 'resend',
    validateConfiguration: () => Boolean(deps.config.apiKey) && Boolean(deps.config.fromEmail),
  };
};
