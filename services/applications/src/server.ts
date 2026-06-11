import { createMicroserviceServer } from '@adopt-dont-shop/service-bootstrap';
import type { FastifyInstance } from 'fastify';

import type { createLogger } from '@adopt-dont-shop/observability';

import type { ApplicationsConfig } from './config.js';

export type CreateServerOptions = {
  config: ApplicationsConfig;
  logger?: ReturnType<typeof createLogger>;
  isReady?: () => boolean;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  return createMicroserviceServer({
    serviceName: 'service.applications',
    config: opts.config,
    logger: opts.logger,
    isReady: opts.isReady,
  });
};

export type { ApplicationsConfig };
