// Tick-based scheduler for periodic notifications jobs. Each job is
// registered with an interval; the scheduler walks the registered jobs
// every tick and runs any whose `nextRunAt` has passed.
//
// Why not node-cron / agenda? Both pull in a heavy dep for the one
// scheduled task this service currently runs (the weekly digest). The
// tick loop matches the CAD-style "minimal external surface" approach
// and is trivial to test with a mocked clock.
//
// Replicas + locking: this implementation does NOT lock across
// instances yet. The first follow-up before running multiple replicas
// is to swap the in-memory `nextRunAt` for a row in a `scheduled_jobs`
// table that's claimed with FOR UPDATE SKIP LOCKED (same pattern as
// the email queue worker).

import type { Logger } from 'winston';

export type ScheduledJob = {
  name: string;
  // Period between runs in milliseconds. The scheduler's tick interval
  // bounds the precision — a 1 hour job with a 60s tick may run up to
  // 60s late, which is fine for digest-style cadence.
  intervalMs: number;
  // Run on the next tick after construction (true) or wait
  // intervalMs first (false, the default — avoids a thundering herd
  // when the service boots).
  runOnStart?: boolean;
  // The async body. Errors are caught + logged; the next run schedules
  // normally (one bad week shouldn't stop the digest forever).
  run: () => Promise<void>;
};

export type SchedulerOptions = {
  logger: Logger;
  // Tick frequency in ms. Default 60s — short enough that jobs run
  // close to their nominal cadence, long enough that idle CPU is
  // negligible. Tests pass a smaller value.
  tickIntervalMs?: number;
  // Now provider — injectable so tests can advance time deterministically.
  now?: () => number;
};

export type RunningScheduler = {
  stop: () => Promise<void>;
  // Exposed for tests + the smoke script — runs one tick synchronously
  // and returns the names of jobs that fired.
  tick: () => Promise<string[]>;
};

const DEFAULT_TICK_MS = 60_000;

export const startScheduler = (jobs: ScheduledJob[], opts: SchedulerOptions): RunningScheduler => {
  const tickIntervalMs = opts.tickIntervalMs ?? DEFAULT_TICK_MS;
  const now = opts.now ?? Date.now;
  let running = true;
  let timer: NodeJS.Timeout | undefined;
  let inflight = Promise.resolve();

  // nextRunAt per job. runOnStart=true → fire next tick.
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
      // Schedule the next run BEFORE awaiting — a slow job can take longer
      // than intervalMs, in which case the next tick still finds it due
      // (intentional — caller may want overlapping runs blocked, but the
      // current implementation simply re-runs as soon as the previous
      // finishes).
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
        .then(() => undefined)
        .finally(() => {
          schedule();
        });
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
