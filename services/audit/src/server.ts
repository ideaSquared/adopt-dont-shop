import { createMicroserviceServer } from '@adopt-dont-shop/service-bootstrap';
import type { FastifyInstance } from 'fastify';

import type { createLogger } from '@adopt-dont-shop/observability';

import type { AuditConfig } from './config.js';

export type CreateServerOptions = {
  config: AuditConfig;
  logger?: ReturnType<typeof createLogger>;
  isReady?: () => boolean;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  return createMicroserviceServer({
    serviceName: 'service.audit',
    config: opts.config,
    logger: opts.logger,
    isReady: opts.isReady,
  });
};

export type { AuditConfig };
