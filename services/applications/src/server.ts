import { createMicroserviceServer, type ReadinessDeps } from '@adopt-dont-shop/service-bootstrap';
import type { FastifyInstance } from 'fastify';

import type { ApplicationsConfig } from './config.js';
import { type ServiceLogger } from './logger.js';

export type CreateServerOptions = {
  config: ApplicationsConfig;
  logger?: ServiceLogger;
  isReady?: () => boolean;
  readiness?: ReadinessDeps;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  return createMicroserviceServer({
    serviceName: 'service.applications',
    config: opts.config,
    logger: opts.logger,
    isReady: opts.isReady,
    readiness: opts.readiness,
  });
};

export type { ApplicationsConfig };
