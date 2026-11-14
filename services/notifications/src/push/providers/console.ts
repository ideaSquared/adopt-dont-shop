// ConsolePushProvider — dev-only default. Writes the would-be push
// to the structured logger so developers can see what mobile / web
// clients would have received. ADS-549-style guard lives in the
// factory: production refuses 'console'.

import type { PushProvider, PushSendRequest, PushSendResult } from '../types.js';
import { type ServiceLogger } from '../../logger.js';

export type ConsolePushDeps = {
  logger: ServiceLogger;
};

const generateMessageId = (): string =>
  `push_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

export const createConsolePushProvider = (deps: ConsolePushDeps): PushProvider => ({
  async send(request: PushSendRequest): Promise<PushSendResult> {
    const messageId = generateMessageId();
    deps.logger.info('push.console.send', {
      messageId,
      platform: request.platform,
      hasData: Boolean(request.data && Object.keys(request.data).length),
    });
    return { success: true, messageId };
  },
  getName: () => 'console',
  validateConfiguration: () => true,
});
