// services/chat — HTTP server. Delegates to @adopt-dont-shop/service-bootstrap
// with the service name bound.

import { createLogger } from '@adopt-dont-shop/observability';
import { createMicroserviceServer } from '@adopt-dont-shop/service-bootstrap';
import type { FastifyInstance } from 'fastify';

import type { ChatConfig } from './config.js';

export type CreateServerOptions = {
  config: ChatConfig;
  // Optional logger injection — tests pass a quiet logger so the
  // suite output stays readable. Real boot uses createLogger so the
  // service emits structured lines through the same pipeline as the
  // rest of the stack.
  logger?: ReturnType<typeof createLogger>;
  // Readiness probe — /health/simple returns 503 until this returns
  // true. Defaults to () => true so existing call-sites compile
  // unchanged. index.ts flips a local boolean after gRPC binds.
  isReady?: () => boolean;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  return createMicroserviceServer({
    serviceName: 'service.chat',
    config: { environment: opts.config.environment },
    logger: opts.logger,
    isReady: opts.isReady,
  });
};

export type { ChatConfig };
