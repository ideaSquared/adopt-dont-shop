import { createMicroserviceServer } from '@adopt-dont-shop/service-bootstrap';
import type { FastifyInstance } from 'fastify';

import type { createLogger } from '@adopt-dont-shop/observability';

import type { CmsConfig } from './config.js';

export type CreateServerOptions = {
  config: CmsConfig;
  logger?: ReturnType<typeof createLogger>;
  isReady?: () => boolean;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  return createMicroserviceServer({
    serviceName: 'service.cms',
    config: opts.config,
    logger: opts.logger,
    isReady: opts.isReady,
  });
};
