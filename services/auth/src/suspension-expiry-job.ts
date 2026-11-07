// Scheduled lift of ended timed suspensions.
//
// Runs every minute and once on start (so a restart catches up straight away).
// The scheduler's claimRun records each interval slot in scheduled_job_runs
// (migration 037), so across replicas exactly one runs a given slot; the sweep
// itself also locks rows with FOR UPDATE SKIP LOCKED. The login path lifts
// lazily as a second line of defence (see grpc/suspension-expiry.ts).

import {
  claimScheduledRun,
  startScheduler,
  type RunningScheduler,
} from '@adopt-dont-shop/scheduler';

import type { Logger } from 'winston';

import type { HandlerDeps } from './grpc/handlers.js';
import { liftExpiredSuspensions } from './grpc/suspension-expiry.js';

export const SUSPENSION_EXPIRY_JOB_NAME = 'suspension-expiry-lift';
const SUSPENSION_EXPIRY_INTERVAL_MS = 60_000;

export type StartSuspensionExpirySchedulerOptions = {
  deps: HandlerDeps;
  logger: Logger;
};

// Stop the scheduler, but never let an in-flight sweep hold shutdown past the
// time budget (the process has a fixed grace period for HTTP, gRPC and NATS).
export const stopSchedulerWithin = async (
  scheduler: RunningScheduler,
  opts: { timeoutMs: number; logger: Logger }
): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<'timeout'>(resolve => {
    timer = setTimeout(() => resolve('timeout'), opts.timeoutMs);
  });
  try {
    const outcome = await Promise.race([scheduler.stop().then(() => 'stopped' as const), timedOut]);
    if (outcome === 'timeout') {
      opts.logger.warn('suspension expiry scheduler did not stop in time; continuing shutdown', {
        timeoutMs: opts.timeoutMs,
      });
    }
  } catch (err) {
    opts.logger.error('suspension expiry scheduler stop error', { err });
  } finally {
    clearTimeout(timer);
  }
};

export const startSuspensionExpiryScheduler = (
  opts: StartSuspensionExpirySchedulerOptions
): RunningScheduler =>
  startScheduler(
    [
      {
        name: SUSPENSION_EXPIRY_JOB_NAME,
        intervalMs: SUSPENSION_EXPIRY_INTERVAL_MS,
        runOnStart: true,
        run: async () => {
          const { liftedCount } = await liftExpiredSuspensions(opts.deps);
          // A count only: never the users, their emails or tokens.
          opts.logger.info('suspension expiry sweep complete', { liftedCount });
        },
      },
    ],
    {
      logger: opts.logger,
      claimRun: (job, scheduledFor) => claimScheduledRun(opts.deps.pool, job, scheduledFor),
    }
  );
