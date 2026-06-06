// EtherealProvider — staging-friendly catcher backed by a nodemailer
// test account. Useful in dev/staging when we want real SMTP flow but
// don't want to spam real inboxes; the preview URL is logged for each
// send so a developer can open the captured message.

import nodemailer, { type Transporter } from 'nodemailer';

import type { createLogger } from '@adopt-dont-shop/observability';

import type { EmailProvider, ProviderSendResult, QueuedEmail } from '../types.js';

import { sanitizeEmail } from './base.js';

// Match the monolith — without these caps a hung SMTP socket would
// stall the queue worker indefinitely.
const SMTP_TIMEOUT_MS = 10_000;

export type EtherealProviderDeps = {
  logger: ReturnType<typeof createLogger>;
};

type EtherealAccount = {
  user: string;
  pass: string;
};

const createTransporter = async (account: EtherealAccount): Promise<Transporter> =>
  nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: account.user, pass: account.pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });

export const createEtherealProvider = (deps: EtherealProviderDeps): EmailProvider => {
  let transporter: Transporter | null = null;

  const ensureTransporter = async (): Promise<Transporter> => {
    if (transporter) {
      return transporter;
    }
    const account = await nodemailer.createTestAccount();
    deps.logger.info('email.ethereal.account', {
      user: account.user,
      web: 'https://ethereal.email',
    });
    transporter = await createTransporter({ user: account.user, pass: account.pass });
    return transporter;
  };

  return {
    async send(email: QueuedEmail): Promise<ProviderSendResult> {
      try {
        const t = await ensureTransporter();
        const sanitized = sanitizeEmail(email);
        const info = await t.sendMail(sanitized);
        deps.logger.info('email.ethereal.send_ok', {
          messageId: info.messageId,
          to: sanitized.to,
          subject: sanitized.subject,
          previewUrl: nodemailer.getTestMessageUrl(info),
        });
        return { success: true, messageId: info.messageId };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        deps.logger.error('email.ethereal.send_error', {
          to: email.toEmail,
          subject: email.subject,
          error: message,
        });
        return { success: false, error: message };
      }
    },
    getName: () => 'ethereal',
    validateConfiguration: () => true,
  };
};
