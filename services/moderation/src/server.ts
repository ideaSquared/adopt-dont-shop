import { createMicroserviceServer } from '@adopt-dont-shop/service-bootstrap';
import type { FastifyInstance } from 'fastify';

import type { createLogger } from '@adopt-dont-shop/observability';

import type { ModerationConfig } from './config.js';

export type CreateServerOptions = {
  config: ModerationConfig;
  logger?: ReturnType<typeof createLogger>;
  isReady?: () => boolean;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  return createMicroserviceServer({
    serviceName: 'service.moderation',
    config: opts.config,
    logger: opts.logger,
    isReady: opts.isReady,
  });
};

export type { ModerationConfig };
