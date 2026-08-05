import { createMicroserviceServer, type ReadinessDeps } from '@adopt-dont-shop/service-bootstrap';
import type { FastifyInstance } from 'fastify';

import type { createLogger } from '@adopt-dont-shop/observability';

import type { RescueConfig } from './config.js';

export type CreateServerOptions = {
  config: RescueConfig;
  logger?: ReturnType<typeof createLogger>;
  isReady?: () => boolean;
  readiness?: ReadinessDeps;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  return createMicroserviceServer({
    serviceName: 'service.rescue',
    config: opts.config,
    logger: opts.logger,
    isReady: opts.isReady,
    readiness: opts.readiness,
  });
};

export type { RescueConfig };
