// Provider factory — selects an email provider by name. Boot wires
// the env-driven choice; tests construct providers directly.
//
// ADS-549 lesson preserved: in production, an unknown / unconfigured
// provider must NOT silently fall back to console — every transactional
// email would disappear into stdout. Callers (loadProvider() at boot)
// surface the error so the process can exit non-zero.

import type { createLogger } from '@adopt-dont-shop/observability';

import type { EmailProvider } from '../types.js';

import { createConsoleProvider } from './console.js';
import { createEtherealProvider } from './ethereal.js';
import { createResendProvider, type ResendProviderConfig } from './resend.js';

export type EmailProviderConfig =
  | { kind: 'console' }
  | { kind: 'ethereal' }
  | { kind: 'resend'; resend: ResendProviderConfig };

export type ProviderFactoryDeps = {
  config: EmailProviderConfig;
  logger: ReturnType<typeof createLogger>;
};

export const createProvider = (deps: ProviderFactoryDeps): EmailProvider => {
  switch (deps.config.kind) {
    case 'console':
      return createConsoleProvider({ logger: deps.logger });
    case 'ethereal':
      return createEtherealProvider({ logger: deps.logger });
    case 'resend':
      return createResendProvider({ config: deps.config.resend, logger: deps.logger });
  }
};
