// ConsoleEmailProvider — default dev provider. Writes the email to
// the service's structured logger so the developer can see what would
// have been delivered. Never used in prod (the boot path crashes if the
// requested provider isn't configured rather than silently falling
// back).

import type { createLogger } from '@adopt-dont-shop/observability';

import type { EmailProvider, ProviderSendResult, QueuedEmail } from '../types.js';

import { generateMessageId, sanitizeEmail } from './base.js';

export type ConsoleProviderDeps = {
  logger: ReturnType<typeof createLogger>;
};

export const createConsoleProvider = (deps: ConsoleProviderDeps): EmailProvider => ({
  async send(email: QueuedEmail): Promise<ProviderSendResult> {
    const sanitized = sanitizeEmail(email);
    const messageId = generateMessageId();

    deps.logger.info('email.console.send', {
      messageId,
      from: sanitized.from,
      to: sanitized.to,
      cc: email.ccEmails,
      bcc: email.bccEmails,
      subject: sanitized.subject,
      type: email.type,
      priority: email.priority,
      tags: email.tags,
      attachmentCount: email.attachments.length,
      htmlPreview: sanitized.html.slice(0, 400),
    });

    return { success: true, messageId };
  },
  getName: () => 'console',
  validateConfiguration: () => true,
});
