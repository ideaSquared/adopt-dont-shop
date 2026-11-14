// ConsoleEmailProvider — default dev provider. Writes the email to
// the service's structured logger so the developer can see what would
// have been delivered. Never used in prod (the boot path crashes if the
// requested provider isn't configured rather than silently falling
// back).

import type { EmailProvider, ProviderSendResult, QueuedEmail } from '../types.js';

import { generateMessageId } from './base.js';
import { type ServiceLogger } from '../../logger.js';

export type ConsoleProviderDeps = {
  logger: ServiceLogger;
};

export const createConsoleProvider = (deps: ConsoleProviderDeps): EmailProvider => ({
  async send(email: QueuedEmail): Promise<ProviderSendResult> {
    const messageId = generateMessageId();

    // ADS-1257: never log recipients or rendered HTML — a
    // password-reset / verification email's HTML carries the raw one-time
    // token, which would otherwise land in dev/staging logs.
    deps.logger.info('email.console.send', {
      messageId,
      type: email.type,
      priority: email.priority,
      attachmentCount: email.attachments.length,
    });

    return { success: true, messageId };
  },
  getName: () => 'console',
  validateConfiguration: () => true,
});
