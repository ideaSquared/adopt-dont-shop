// Shared shutdown sequencer — HTTP close → gRPC shutdown → NATS drain
// → pool end, each step try/caught so one failure doesn't skip the rest.
//
// An overall deadline (default 25 000 ms, overridable via timeoutMs) races
// against the full sequence. If the sequence exceeds the deadline, the
// function logs which step was in flight and calls process.exit(1).
// Normal completion still exits 0 — callers are responsible for that call.

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
  /** Overall deadline in ms. Default 25 000 (under the typical 30 s
   *  orchestrator grace period). */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 25_000;

// runServiceShutdown — execute the four-step teardown sequence.
// Each step is individually try/caught so a failure in one step
// does not skip the remaining steps.
export const runServiceShutdown = async (deps: ShutdownDeps): Promise<void> => {
  const { httpServer, grpc, nats, pool, logger } = deps;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let currentStep = 'http';

  const sequence = async (): Promise<void> => {
    currentStep = 'http';
    try {
      await httpServer.close();
    } catch (err) {
      logger.error('http close error', { err });
    }

    currentStep = 'grpc';
    try {
      await grpc?.shutdown();
    } catch (err) {
      logger.error('grpc shutdown error', { err });
    }

    currentStep = 'nats';
    try {
      await nats?.drain();
    } catch (err) {
      logger.error('nats drain error', { err });
    }

    currentStep = 'pool';
    try {
      await pool?.end();
    } catch (err) {
      logger.error('pool end error', { err });
    }
  };

  const deadline = new Promise<never>((_, reject) =>
    setTimeout(() => {
      reject(new Error(`shutdown deadline exceeded in step: ${currentStep}`));
    }, timeoutMs)
  );

  try {
    await Promise.race([sequence(), deadline]);
  } catch (err) {
    logger.error(`shutdown deadline exceeded — step in flight: ${currentStep}`, { err });
    process.exit(1);
  }
};
