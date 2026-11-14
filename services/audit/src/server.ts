import { createMicroserviceServer, type ReadinessDeps } from '@adopt-dont-shop/service-bootstrap';
import type { FastifyInstance } from 'fastify';

import type { AuditConfig } from './config.js';
import { type ServiceLogger } from './logger.js';

export type CreateServerOptions = {
  config: AuditConfig;
  logger?: ServiceLogger;
  isReady?: () => boolean;
  readiness?: ReadinessDeps;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  return createMicroserviceServer({
    serviceName: 'service.audit',
    config: opts.config,
    logger: opts.logger,
    isReady: opts.isReady,
    readiness: opts.readiness,
  });
};

export type { AuditConfig };
