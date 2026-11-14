// ResendProvider — production transactional email provider. Wraps the
// Resend SDK with a per-send timeout so a hung API call can't stall the
// queue worker.

import { Resend } from 'resend';

import type { EmailProvider, ProviderSendResult, QueuedEmail } from '../types.js';

import { sanitizeEmail } from './base.js';
import { type ServiceLogger } from '../../logger.js';

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
  logger: ServiceLogger;
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
          // The provider's error text can echo the recipient: log its class, never the message.
          deps.logger.error('email.resend.send_failed', {
            type: email.type,
            errorClass: result.error.name,
          });
          return { success: false, error: result.error.message };
        }
        deps.logger.info('email.resend.send_ok', { messageId: result.data.id, type: email.type });
        return { success: true, messageId: result.data.id };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        deps.logger.error('email.resend.send_error', {
          type: email.type,
          errorClass: err instanceof Error ? err.name : null,
        });
        return { success: false, error: message };
      }
    },
    getName: () => 'resend',
    validateConfiguration: () => Boolean(deps.config.apiKey) && Boolean(deps.config.fromEmail),
  };
};
