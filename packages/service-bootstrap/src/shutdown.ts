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

export type ShutdownDeadlineOptions = {
  logger: Logger;
  /** Overall deadline in ms. Default 25 000. */
  timeoutMs?: number;
  /** Names the step in flight for the deadline log line (evaluated when the
   *  deadline fires, so it reflects the step reached, not the step at call
   *  time). */
  currentStep?: () => string;
};

// withShutdownDeadline — race an arbitrary teardown `sequence` against an
// overall deadline. On timeout it logs the step in flight and calls
// process.exit(1); on normal completion it clears the timer and returns.
// Extracted so both runServiceShutdown (fixed HTTP→gRPC→NATS→pool order) and
// bespoke teardowns (the gateway's io/redis/http/nats/grpc-clients sequence)
// share one bounded-shutdown guarantee.
export const withShutdownDeadline = async (
  sequence: () => Promise<void>,
  opts: ShutdownDeadlineOptions
): Promise<void> => {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const step = opts.currentStep?.();
      reject(new Error(`shutdown deadline exceeded${step ? ` in step: ${step}` : ''}`));
    }, timeoutMs);
  });

  try {
    await Promise.race([sequence(), deadline]);
  } catch (err) {
    const step = opts.currentStep?.();
    opts.logger.error(`shutdown deadline exceeded${step ? ` — step in flight: ${step}` : ''}`, {
      err,
    });
    process.exit(1);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

// runServiceShutdown — execute the four-step teardown sequence.
// Each step is individually try/caught so a failure in one step
// does not skip the remaining steps.
export const runServiceShutdown = async (deps: ShutdownDeps): Promise<void> => {
  const { httpServer, grpc, nats, pool, logger } = deps;

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

  await withShutdownDeadline(sequence, {
    logger,
    timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    currentStep: () => currentStep,
  });
};
