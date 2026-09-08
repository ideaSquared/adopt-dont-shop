import type { Logger } from 'winston';
import { describe, expect, it, vi } from 'vitest';

import { startScheduler, type ScheduledJob } from './scheduler.js';

// Ported from services/notifications/src/scheduler/scheduler.test.ts. The
// notifications suite additionally covers anchor-grid/weekday-drift edge
// cases (ADS-1066/1127) for its weekly digest cadence — this service only
// needs a daily purge job, so this file keeps the core behaviour
// guarantees (due/not-due, runOnStart, error handling, cross-instance
// claim) without duplicating that grid-math coverage for a cadence this
// service doesn't use.

const quietLogger = (): Logger =>
  ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }) as unknown as Logger;

describe('scheduler', () => {
  it('does not fire a job that is not yet due', async () => {
    const runs: string[] = [];
    const jobs: ScheduledJob[] = [
      {
        name: 'daily-purge',
        intervalMs: 24 * 60 * 60 * 1000,
        run: async () => {
          runs.push('daily-purge');
        },
      },
    ];
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 60_000,
      now: () => 1_000_000,
    });
    try {
      const fired = await scheduler.tick();
      expect(fired).toEqual([]);
      expect(runs).toEqual([]);
    } finally {
      await scheduler.stop();
    }
  });

  it('runs a job with runOnStart=true on the next tick', async () => {
    const runs: string[] = [];
    const jobs: ScheduledJob[] = [
      {
        name: 'daily-purge',
        intervalMs: 60_000,
        runOnStart: true,
        run: async () => {
          runs.push('daily-purge');
        },
      },
    ];
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 60_000,
      now: () => 1_000_000,
    });
    try {
      const fired = await scheduler.tick();
      expect(fired).toEqual(['daily-purge']);
      expect(runs).toEqual(['daily-purge']);
    } finally {
      await scheduler.stop();
    }
  });

  it('catches errors from a job, logs, and calls onJobFailure', async () => {
    const logger = quietLogger();
    const onJobFailure = vi.fn();
    const jobs: ScheduledJob[] = [
      {
        name: 'flaky',
        intervalMs: 60_000,
        runOnStart: true,
        run: async () => {
          throw new Error('boom');
        },
      },
    ];
    const scheduler = startScheduler(jobs, {
      logger,
      tickIntervalMs: 60_000,
      now: () => 1_000_000,
      onJobFailure,
    });
    try {
      await scheduler.tick();
      expect(logger.error).toHaveBeenCalledWith(
        'scheduler.job_failed',
        expect.objectContaining({ name: 'flaky', err: 'boom' })
      );
      expect(onJobFailure).toHaveBeenCalledWith('flaky');
    } finally {
      await scheduler.stop();
    }
  });

  it('refires a due job on a subsequent tick once interval has elapsed', async () => {
    const runs: number[] = [];
    let now = 1_000_000;
    const jobs: ScheduledJob[] = [
      {
        name: 'hourly',
        intervalMs: 3600_000,
        runOnStart: true,
        run: async () => {
          runs.push(now);
        },
      },
    ];
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 60_000,
      now: () => now,
    });
    try {
      await scheduler.tick();
      now += 30 * 60_000;
      const midRun = await scheduler.tick();
      expect(midRun).toEqual([]);
      now += 31 * 60_000;
      const lateRun = await scheduler.tick();
      expect(lateRun).toEqual(['hourly']);
      expect(runs.length).toBe(2);
    } finally {
      await scheduler.stop();
    }
  });

  it('skips the job (does not run, not in fired) when the claim is lost', async () => {
    const runs: string[] = [];
    const claimRun = vi.fn(async () => false);
    const jobs: ScheduledJob[] = [
      {
        name: 'daily-purge',
        intervalMs: 60_000,
        runOnStart: true,
        run: async () => {
          runs.push('daily-purge');
        },
      },
    ];
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 60_000,
      now: () => 1_000_000,
      claimRun,
    });
    try {
      const fired = await scheduler.tick();
      expect(claimRun).toHaveBeenCalledTimes(1);
      expect(fired).toEqual([]);
      expect(runs).toEqual([]);
    } finally {
      await scheduler.stop();
    }
  });

  it('runs the job when the claim is won, keyed by the job’s own scheduled instant', async () => {
    const runs: string[] = [];
    const claimCalls: Array<{ job: string; scheduledFor: Date }> = [];
    const claimRun = vi.fn(async (job: string, scheduledFor: Date) => {
      claimCalls.push({ job, scheduledFor });
      return true;
    });
    const jobs: ScheduledJob[] = [
      {
        name: 'daily-purge',
        intervalMs: 60_000,
        runOnStart: true,
        run: async () => {
          runs.push('daily-purge');
        },
      },
    ];
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 60_000,
      now: () => 1_000_000,
      claimRun,
    });
    try {
      const fired = await scheduler.tick();
      expect(fired).toEqual(['daily-purge']);
      expect(runs).toEqual(['daily-purge']);
      expect(claimCalls).toEqual([{ job: 'daily-purge', scheduledFor: new Date(960_000) }]);
    } finally {
      await scheduler.stop();
    }
  });

  it('skips the job when the claim query errors — never risks a duplicate', async () => {
    const runs: string[] = [];
    const logger = quietLogger();
    const claimRun = vi.fn(async () => {
      throw new Error('db down');
    });
    const jobs: ScheduledJob[] = [
      {
        name: 'daily-purge',
        intervalMs: 60_000,
        runOnStart: true,
        run: async () => {
          runs.push('daily-purge');
        },
      },
    ];
    const scheduler = startScheduler(jobs, {
      logger,
      tickIntervalMs: 60_000,
      now: () => 1_000_000,
      claimRun,
    });
    try {
      const fired = await scheduler.tick();
      expect(fired).toEqual([]);
      expect(runs).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'scheduler.claim_error',
        expect.objectContaining({ name: 'daily-purge', err: 'db down' })
      );
    } finally {
      await scheduler.stop();
    }
  });

  it('seeds a non-runOnStart, cross-instance-claimed job to the next shared interval boundary', async () => {
    const claimCalls: Date[] = [];
    const claimRun = vi.fn(async (_job: string, scheduledFor: Date) => {
      claimCalls.push(scheduledFor);
      return true;
    });
    let now = 250;
    const jobs: ScheduledJob[] = [
      { name: 'daily-purge', intervalMs: 1000, run: async () => undefined },
    ];
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 100,
      now: () => now,
      claimRun,
    });
    try {
      now = 1000;
      const fired = await scheduler.tick();
      expect(fired).toEqual(['daily-purge']);
      expect(claimCalls).toEqual([new Date(1000)]);
    } finally {
      await scheduler.stop();
    }
  });

  it('returns no fired jobs when tick() is called after stop()', async () => {
    const jobs: ScheduledJob[] = [
      { name: 'daily-purge', intervalMs: 60_000, runOnStart: true, run: async () => undefined },
    ];
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 60_000,
      now: () => 1_000_000,
    });
    await scheduler.stop();
    const fired = await scheduler.tick();
    expect(fired).toEqual([]);
  });

  it('drives the background tick loop off real timers and reschedules itself', async () => {
    vi.useFakeTimers();
    try {
      const runs: string[] = [];
      const jobs: ScheduledJob[] = [
        {
          name: 'daily-purge',
          intervalMs: 1000,
          runOnStart: true,
          run: async () => {
            runs.push('daily-purge');
          },
        },
      ];
      const scheduler = startScheduler(jobs, {
        logger: quietLogger(),
        tickIntervalMs: 1000,
      });
      try {
        // First scheduled tick fires the runOnStart job.
        await vi.advanceTimersByTimeAsync(1000);
        expect(runs).toEqual(['daily-purge']);
        // The loop reschedules itself — advancing another full interval
        // fires again without any further manual `tick()` call.
        await vi.advanceTimersByTimeAsync(1000);
        expect(runs).toEqual(['daily-purge', 'daily-purge']);
      } finally {
        await scheduler.stop();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('logs and keeps rescheduling when a tick throws synchronously', async () => {
    vi.useFakeTimers();
    try {
      const logger = quietLogger();
      const jobs: ScheduledJob[] = [
        {
          name: 'daily-purge',
          intervalMs: 1000,
          run: async () => undefined,
        },
      ];
      // A `now` that throws simulates tick() itself failing outside the
      // per-job try/catch, exercising the scheduler's own tick_error path.
      // Call 1 is the nextRunAt seed during startScheduler() (must
      // succeed); call 2 is tick()'s own `const ts = now()`.
      let calls = 0;
      const scheduler = startScheduler(jobs, {
        logger,
        tickIntervalMs: 1000,
        now: () => {
          calls += 1;
          if (calls === 2) {
            throw new Error('clock unavailable');
          }
          return 1_000_000;
        },
      });
      try {
        await vi.advanceTimersByTimeAsync(1000);
        expect(logger.error).toHaveBeenCalledWith(
          'scheduler.tick_error',
          expect.objectContaining({ err: expect.any(Error) })
        );
      } finally {
        await scheduler.stop();
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
