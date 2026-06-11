// Shared shutdown sequencer — HTTP close → gRPC shutdown → NATS drain
// → pool end, each step try/caught so one failure doesn't skip the rest.

import type { FastifyInstance } from 'fastify';
import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';

import type { createLogger } from '@adopt-dont-shop/observability';

type Logger = ReturnType<typeof createLogger>;

export type ShutdownDeps = {
  httpServer: Pick<FastifyInstance, 'close'>;
  grpc?: { shutdown: () => Promise<void> };
  nats?: Pick<NatsConnection, 'drain'>;
  pool?: Pick<Pool, 'end'>;
  logger: Logger;
};

// runServiceShutdown — execute the four-step teardown sequence.
// Each step is individually try/caught so a failure in one step
// does not skip the remaining steps.
export const runServiceShutdown = async (deps: ShutdownDeps): Promise<void> => {
  const { httpServer, grpc, nats, pool, logger } = deps;

  try {
    await httpServer.close();
  } catch (err) {
    logger.error('http close error', { err });
  }

  try {
    await grpc?.shutdown();
  } catch (err) {
    logger.error('grpc shutdown error', { err });
  }

  try {
    await nats?.drain();
  } catch (err) {
    logger.error('nats drain error', { err });
  }

  try {
    await pool?.end();
  } catch (err) {
    logger.error('pool end error', { err });
  }
};
