// Tick-based scheduler for periodic audit service jobs.
//
// Mirrors the implementation in services/notifications/src/scheduler/scheduler.ts.
// Kept local to avoid a cross-service dependency. Each service that needs a
// lightweight scheduler carries its own copy of this trivially-testable module.

import type { Logger } from 'winston';

export type ScheduledJob = {
  name: string;
  // Period between runs in milliseconds.
  intervalMs: number;
  // Run on the very next tick after construction (true) or wait
  // intervalMs first (false, the default).
  runOnStart?: boolean;
  // The async body. Errors are caught + logged; the next run schedules
  // normally.
  run: () => Promise<void>;
};

export type SchedulerOptions = {
  logger: Logger;
  tickIntervalMs?: number;
  // Now provider — injectable so tests can advance time deterministically.
  now?: () => number;
};

export type RunningScheduler = {
  stop: () => Promise<void>;
  tick: () => Promise<string[]>;
};

const DEFAULT_TICK_MS = 60_000;

export const startScheduler = (jobs: ScheduledJob[], opts: SchedulerOptions): RunningScheduler => {
  const tickIntervalMs = opts.tickIntervalMs ?? DEFAULT_TICK_MS;
  const now = opts.now ?? Date.now;
  let running = true;
  let timer: NodeJS.Timeout | undefined;
  let inflight = Promise.resolve();

  const nextRunAt = new Map<string, number>();
  for (const job of jobs) {
    nextRunAt.set(job.name, job.runOnStart ? 0 : now() + job.intervalMs);
  }

  const tick = async (): Promise<string[]> => {
    if (!running) {
      return [];
    }
    const ts = now();
    const fired: string[] = [];
    for (const job of jobs) {
      const due = nextRunAt.get(job.name) ?? 0;
      if (due > ts) {
        continue;
      }
      fired.push(job.name);
      nextRunAt.set(job.name, ts + job.intervalMs);
      try {
        await job.run();
        opts.logger.info('scheduler.job_ok', { name: job.name });
      } catch (err) {
        opts.logger.error('scheduler.job_failed', {
          name: job.name,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return fired;
  };

  const schedule = (): void => {
    if (!running) {
      return;
    }
    timer = setTimeout(() => {
      inflight = tick()
        .catch(err => {
          opts.logger.error('scheduler.tick_error', { err });
          return [] as string[];
        })
        .finally(() => {
          schedule();
        }) as unknown as Promise<void>;
    }, tickIntervalMs);
  };

  schedule();
  opts.logger.info('scheduler started', {
    jobs: jobs.map(j => ({ name: j.name, intervalMs: j.intervalMs })),
    tickIntervalMs,
  });

  return {
    tick,
    stop: async () => {
      running = false;
      if (timer) {
        clearTimeout(timer);
      }
      await inflight.catch(() => undefined);
    },
  };
};
