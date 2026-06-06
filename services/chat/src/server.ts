// services/chat — Phase 6 extraction. Owns the chat.* schema and
// exposes ChatService over gRPC.
//
// Classical (no event sourcing — chat messages are append-only by
// nature but they're not a state machine). WS-heavy: the gateway
// terminates Socket.IO and this service publishes
// chat.messageCreated / chat.messageRead / chat.reactionAdded on
// NATS for fan-out via the existing Phase 1.5 WS subscriber.
//
// Phase 6.1 (this commit) is just the boot skeleton; schema (6.2),
// gRPC (6.3), NATS publishers (6.4), gateway routing (6.5), and
// cutover (6.6) arrive in subsequent commits.

import { createLogger } from '@adopt-dont-shop/observability';
import Fastify, { type FastifyInstance } from 'fastify';

import type { ChatConfig } from './config.js';

export type CreateServerOptions = {
  config: ChatConfig;
  // Optional logger injection — tests pass a quiet logger so the
  // suite output stays readable. Real boot uses createLogger so the
  // service emits structured lines through the same pipeline as the
  // rest of the stack.
  logger?: ReturnType<typeof createLogger>;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  const { config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName: 'service.chat' });

  // Disable Fastify's built-in pino — winston handles service-level
  // lines (boot, shutdown, error handler), and OTel's HTTP
  // auto-instrumentation already covers per-request spans. Same
  // shape as the other extracted services.
  const server = Fastify({
    logger: false,
    trustProxy: true,
  });

  server.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    logger.error('request failed', {
      method: req.method,
      url: req.url,
      message: err.message,
    });
    void reply.status(err.statusCode ?? 500).send({ error: 'internal_error' });
  });

  // Health endpoint — matches the rest of the stack's
  // `/health/simple` path so the existing Docker compose healthcheck
  // pattern picks this service up unchanged.
  server.get('/health/simple', async () => ({
    status: 'ok',
    service: 'service.chat',
    environment: config.environment,
  }));

  return server;
};

export type { ChatConfig };
