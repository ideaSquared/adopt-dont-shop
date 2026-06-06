// ConsolePushProvider — dev-only default. Writes the would-be push
// to the structured logger so developers can see what mobile / web
// clients would have received. ADS-549-style guard lives in the
// factory: production refuses 'console'.

import type { createLogger } from '@adopt-dont-shop/observability';

import type { PushProvider, PushSendRequest, PushSendResult } from '../types.js';

export type ConsolePushDeps = {
  logger: ReturnType<typeof createLogger>;
};

const generateMessageId = (): string =>
  `push_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

export const createConsolePushProvider = (deps: ConsolePushDeps): PushProvider => ({
  async send(request: PushSendRequest): Promise<PushSendResult> {
    const messageId = generateMessageId();
    deps.logger.info('push.console.send', {
      messageId,
      platform: request.platform,
      // Token preview only — never log the full token even in dev.
      tokenPreview: `${request.token.slice(0, 10)}…`,
      title: request.title,
      body: request.body,
      hasData: Boolean(request.data && Object.keys(request.data).length),
    });
    return { success: true, messageId };
  },
  getName: () => 'console',
  validateConfiguration: () => true,
});
