// Tick-based scheduler for periodic notifications jobs. Each job is
// registered with an interval; the scheduler walks the registered jobs
// every tick and runs any whose `nextRunAt` has passed.
//
// Why not node-cron / agenda? Both pull in a heavy dep for the small set
// of scheduled tasks this service is designed to run. The tick loop matches
// the CAD-style "minimal external surface" approach and is trivial to test
// with a mocked clock.
//
// ADS-1245: the only registered job (the weekly digest) was a send-nothing
// scaffold and has been shelved, so nothing is wired into this scheduler
// today. This module + scheduler/claim.ts are kept as dormant, tested infra
// for when the real digest (or another periodic job) is built.
//
// Replicas + locking: cross-instance locking is OPTIONAL, via the
// `claimRun` hook (see SchedulerOptions). When wired, the scheduler claims
// each job's interval-quantised slot before running so only one replica
// runs the job; when omitted it runs single-instance (test / single-replica
// behaviour). The claim is an `INSERT ... ON CONFLICT DO NOTHING` on
// `scheduled_job_runs` (scheduler/claim.ts) — chosen over FOR UPDATE SKIP
// LOCKED because a single-slot claim needs no pre-seeded row to lock; the
// email queue worker still uses SKIP LOCKED to drain its many-row queue.

import type { Logger } from 'winston';

import { recordScheduledJobFailure } from '../metrics.js';

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
  // Phase offset (ms since epoch) the interval grid is anchored to, instead
  // of the raw epoch (0). Lets a claimed job's fire instant land on a chosen
  // weekday/time-of-day rather than whatever the epoch happens to align to,
  // while preserving the shared grid cross-instance claiming depends on —
  // shifting the anchor shifts every replica's boundary identically.
  // Default 0 (epoch-aligned, today's behaviour) (ADS-1127).
  anchorMs?: number;
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
  // Cross-instance run claim. When provided, the scheduler tries to claim
  // the job's scheduled slot before running it; only the replica that wins
  // the claim runs the job (the others skip). `scheduledFor` is the slot the
  // run belongs to, quantised to the job's interval so concurrent replicas
  // compute the same key. Returns true when this replica may run the job.
  // Omitted → no locking (single-instance / test behaviour).
  claimRun?: (job: string, scheduledFor: Date) => Promise<boolean>;
};

export type RunningScheduler = {
  stop: () => Promise<void>;
  // Exposed for tests + the smoke script — runs one tick synchronously
  // and returns the names of jobs that fired.
  tick: () => Promise<string[]>;
};

const DEFAULT_TICK_MS = 60_000;

// The next interval-aligned instant at or after `ts` (inclusive — `ts`
// itself, when already on the grid), on the grid of instants
// `anchorMs + k * intervalMs` (k integer). `anchorMs` defaults to 0 (the
// epoch), which is why grid-aligned jobs land on whatever weekday/time the
// epoch happens to be; a non-zero anchor shifts the whole grid to a chosen
// phase. Two replicas booted at different times but within the same
// interval window converge on this same boundary — the shared anchor
// cross-instance claiming depends on.
const nextIntervalBoundary = (ts: number, intervalMs: number, anchorMs = 0): number =>
  anchorMs + Math.ceil((ts - anchorMs) / intervalMs) * intervalMs;

// The interval-aligned instant `ts` currently falls within — i.e. the most
// recent boundary at or before `ts` (floor, the mirror of the boundary
// above). Used to seed a runOnStart job: it must fire immediately, so it
// needs the CURRENT period's boundary, not the next one.
const currentIntervalBoundary = (ts: number, intervalMs: number, anchorMs = 0): number =>
  anchorMs + Math.floor((ts - anchorMs) / intervalMs) * intervalMs;

export const startScheduler = (jobs: ScheduledJob[], opts: SchedulerOptions): RunningScheduler => {
  const tickIntervalMs = opts.tickIntervalMs ?? DEFAULT_TICK_MS;
  const now = opts.now ?? Date.now;
  let running = true;
  let timer: NodeJS.Timeout | undefined;
  let inflight = Promise.resolve();

  // nextRunAt per job — each job's own intended (logical) run instant, not
  // an observed wall-clock reading.
  //
  // runOnStart=true must fire on the next tick, so it seeds near "now",
  // never to the Unix epoch (0): with the due-anchored progression below
  // (`due + intervalMs`, not `ts + intervalMs`), an epoch-anchored due only
  // ever advances by one intervalMs per fire while real time is far ahead —
  // it would stay permanently "overdue" and fire on every subsequent tick
  // instead of once per interval (a firing storm, not a one-off backlog).
  // Claimed jobs seed to the CURRENT interval boundary (floor) so it still
  // fires immediately while staying shared/grid-aligned across replicas
  // that boot within the same period; unclaimed jobs just use `now()`.
  //
  // For a cross-instance-claimed job (claimRun set) with runOnStart=false,
  // seed to the next shared interval grid boundary (ceil) rather than
  // `now() + intervalMs` (ADS-1066): otherwise two replicas' boot-derived
  // due instants can straddle an arbitrary epoch-aligned boundary and
  // permanently disagree on every subsequent claim. Jobs with no claimRun
  // keep the plain boot-offset seed — there's no cross-replica agreement to
  // preserve, and it avoids a thundering herd of near-immediate first runs
  // on deploy.
  const nextRunAt = new Map<string, number>();
  for (const job of jobs) {
    const initial = job.runOnStart
      ? opts.claimRun
        ? currentIntervalBoundary(now(), job.intervalMs, job.anchorMs)
        : now()
      : opts.claimRun
        ? nextIntervalBoundary(now(), job.intervalMs, job.anchorMs)
        : now() + job.intervalMs;
    nextRunAt.set(job.name, initial);
  }

  // Try to claim a job's scheduled slot across instances. Returns true when
  // this replica may run the job — always true when no claimRun is wired
  // (single-instance / test behaviour). `due` is the job's own tracked
  // nextRunAt — a deterministic function of which logical run this is —
  // rather than the tick's observed `now()`, which drifts with tick
  // granularity and jitters the boundary independently per replica.
  const claimSlot = async (job: ScheduledJob, due: number): Promise<boolean> => {
    if (!opts.claimRun) {
      return true;
    }
    // Defensive floor — `due` is already interval-aligned by construction
    // (see nextRunAt seeding above and the due-anchored progression below),
    // so this is normally a no-op. Must floor relative to the job's own
    // anchor, not the epoch — otherwise a non-zero anchorMs would floor
    // `due` onto the wrong grid and corrupt the claim key.
    const scheduledFor = new Date(currentIntervalBoundary(due, job.intervalMs, job.anchorMs));
    try {
      const won = await opts.claimRun(job.name, scheduledFor);
      if (!won) {
        opts.logger.info('scheduler.job_claimed_elsewhere', {
          name: job.name,
          scheduledFor: scheduledFor.toISOString(),
        });
      }
      return won;
    } catch (err) {
      // A claim error means we can't prove we're the sole runner — skip
      // rather than risk a duplicate send; the next interval retries.
      opts.logger.error('scheduler.claim_error', {
        name: job.name,
        err: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  };

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
      // Schedule the next run BEFORE awaiting — a slow job can take longer
      // than intervalMs, in which case the next tick still finds it due
      // (intentional — caller may want overlapping runs blocked, but the
      // current implementation simply re-runs as soon as the previous
      // finishes). Anchored to `due` (the run we just fired), not the
      // observed `ts` — keeps the schedule a stable, non-drifting arithmetic
      // progression instead of walking forward by however late each tick
      // happened to observe the job as due (ADS-1066).
      nextRunAt.set(job.name, due + job.intervalMs);
      // Cross-instance lock: only the replica that wins the slot runs it.
      if (!(await claimSlot(job, due))) {
        continue;
      }
      fired.push(job.name);
      try {
        await job.run();
        opts.logger.info('scheduler.job_ok', { name: job.name });
      } catch (err) {
        opts.logger.error('scheduler.job_failed', {
          name: job.name,
          err: err instanceof Error ? err.message : String(err),
        });
        recordScheduledJobFailure(job.name);
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
