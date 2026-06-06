// Push provider factory. Matches the email/factory shape — boot wires
// the env-driven choice (console / fcm) and surfaces config errors as
// fatal validation rather than silent fallback.

import type { createLogger } from '@adopt-dont-shop/observability';

import type { PushProvider } from '../types.js';

import { createConsolePushProvider } from './console.js';
import { createFcmPushProvider, type FcmConfig } from './fcm.js';

export type PushProviderConfig = { kind: 'console' } | { kind: 'fcm'; fcm: FcmConfig };

export type ProviderFactoryDeps = {
  config: PushProviderConfig;
  logger: ReturnType<typeof createLogger>;
};

export const createPushProvider = (deps: ProviderFactoryDeps): PushProvider => {
  switch (deps.config.kind) {
    case 'console':
      return createConsolePushProvider({ logger: deps.logger });
    case 'fcm':
      return createFcmPushProvider({ config: deps.config.fcm, logger: deps.logger });
  }
};
