import Fastify, { type FastifyInstance } from 'fastify';

import { createLogger } from '@adopt-dont-shop/observability';

import type { CmsConfig } from './config.js';

export type CreateServerOptions = {
  config: CmsConfig;
  logger?: ReturnType<typeof createLogger>;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  const { config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName: 'service.cms' });
  const server = Fastify({ logger: false, trustProxy: true });

  server.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    logger.error('request failed', { method: req.method, url: req.url, message: err.message });
    void reply.status(err.statusCode ?? 500).send({ error: 'internal_error' });
  });

  // Health endpoint — same path the rest of the stack uses.
  server.get('/health/simple', async () => ({
    status: 'ok',
    service: 'service.cms',
    environment: config.environment,
  }));

  return server;
};
