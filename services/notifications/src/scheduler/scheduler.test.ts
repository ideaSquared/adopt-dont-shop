import type { Logger } from 'winston';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMetricsRegistry, __resetMetricsForTest } from '@adopt-dont-shop/observability';

import { __resetNotificationsMetricsForTest } from '../metrics.js';
import { startScheduler, type ScheduledJob } from './scheduler.js';

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
        name: 'weekly',
        intervalMs: 7 * 24 * 60 * 60 * 1000,
        run: async () => {
          runs.push('weekly');
        },
      },
    ];
    const now = 1_000_000;
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 60_000,
      now: () => now,
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
        name: 'digest',
        intervalMs: 60_000,
        runOnStart: true,
        run: async () => {
          runs.push('digest');
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
      expect(fired).toEqual(['digest']);
      expect(runs).toEqual(['digest']);
    } finally {
      await scheduler.stop();
    }
  });

  it('catches errors from a job and continues scheduling', async () => {
    const logger = quietLogger();
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
    });
    try {
      await scheduler.tick();
      expect(logger.error).toHaveBeenCalledWith(
        'scheduler.job_failed',
        expect.objectContaining({ name: 'flaky', err: 'boom' })
      );
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
      // Advance 30 minutes — still not due.
      now += 30 * 60_000;
      const midRun = await scheduler.tick();
      expect(midRun).toEqual([]);
      // Advance past the hour boundary — now due.
      now += 31 * 60_000;
      const lateRun = await scheduler.tick();
      expect(lateRun).toEqual(['hourly']);
      expect(runs.length).toBe(2);
    } finally {
      await scheduler.stop();
    }
  });
});

describe('scheduler metrics + cross-instance claim', () => {
  beforeEach(() => {
    // Fresh registry + counter singletons so the failure counter starts at 0
    // and re-registers on the new registry.
    __resetMetricsForTest();
    __resetNotificationsMetricsForTest();
  });

  it('increments notifications_scheduled_job_failures_total when a job throws', async () => {
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
      logger: quietLogger(),
      tickIntervalMs: 60_000,
      now: () => 1_000_000,
    });
    try {
      await scheduler.tick();
      const text = await getMetricsRegistry().metrics();
      expect(text).toContain('notifications_scheduled_job_failures_total{job="flaky"} 1');
    } finally {
      await scheduler.stop();
    }
  });

  it('skips the job (does not run, not in fired) when the claim is lost', async () => {
    const runs: string[] = [];
    const claimRun = vi.fn(async () => false);
    const jobs: ScheduledJob[] = [
      {
        name: 'weekly',
        intervalMs: 60_000,
        runOnStart: true,
        run: async () => {
          runs.push('weekly');
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
        name: 'weekly',
        intervalMs: 60_000,
        runOnStart: true,
        run: async () => {
          runs.push('weekly');
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
      expect(fired).toEqual(['weekly']);
      expect(runs).toEqual(['weekly']);
      // runOnStart seeds nextRunAt to 0 (already interval-aligned) — the
      // job's own scheduled instant, not a quantisation of the observed
      // tick time (1_000_000).
      expect(claimCalls).toEqual([{ job: 'weekly', scheduledFor: new Date(0) }]);
    } finally {
      await scheduler.stop();
    }
  });

  it('seeds a non-runOnStart, cross-instance-claimed job to the next shared interval boundary (ADS-1066)', async () => {
    const claimCalls: Date[] = [];
    const claimRun = vi.fn(async (_job: string, scheduledFor: Date) => {
      claimCalls.push(scheduledFor);
      return true;
    });
    const jobs: ScheduledJob[] = [
      {
        name: 'weekly',
        intervalMs: 1000,
        run: async () => undefined,
      },
    ];
    // Boot at 250ms into the [0, 1000) window — the next shared boundary is 1000.
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 100,
      now: () => 250,
      claimRun,
    });
    try {
      await scheduler.tick(); // not due yet at ts=250
      expect(claimRun).not.toHaveBeenCalled();
    } finally {
      await scheduler.stop();
    }
  });

  it(
    'keeps independently-booted replicas agreeing on the claim slot across many periods, ' +
      'even when their boot instants straddle an interval boundary (ADS-1066)',
    async () => {
      const intervalMs = 1000;
      const claimed = new Set<string>();
      const sharedClaimRun = async (job: string, scheduledFor: Date): Promise<boolean> => {
        const key = `${job}::${scheduledFor.toISOString()}`;
        if (claimed.has(key)) {
          return false;
        }
        claimed.add(key);
        return true;
      };

      const makeReplica = (bootNow: number) => {
        let now = bootNow;
        const runs: number[] = [];
        const jobs: ScheduledJob[] = [
          {
            name: 'weekly-digest',
            intervalMs,
            run: async () => {
              runs.push(now);
            },
          },
        ];
        const scheduler = startScheduler(jobs, {
          logger: quietLogger(),
          tickIntervalMs: 100,
          now: () => now,
          claimRun: sharedClaimRun,
        });
        return {
          runs,
          tickAt: (t: number) => {
            now = t;
            return scheduler.tick();
          },
          stop: () => scheduler.stop(),
        };
      };

      // Boot phases 1ms apart, straddling the interval boundary at ts=1000 —
      // under the pre-fix wall-clock-quantised claim this alone was enough
      // to make the two replicas disagree on the slot for every subsequent
      // period, not just this one.
      const replicaA = makeReplica(999);
      const replicaB = makeReplica(1000);

      try {
        for (let period = 1; period <= 5; period++) {
          const due = period * intervalMs;
          await replicaA.tickAt(due);
          await replicaB.tickAt(due);
        }
        // Exactly one replica ran the job each period — never both, never
        // neither — across 5 consecutive periods.
        expect(replicaA.runs.length + replicaB.runs.length).toBe(5);
      } finally {
        await replicaA.stop();
        await replicaB.stop();
      }
    }
  );

  it('skips the job when the claim query errors — never risks a duplicate', async () => {
    const runs: string[] = [];
    const logger = quietLogger();
    const claimRun = vi.fn(async () => {
      throw new Error('db down');
    });
    const jobs: ScheduledJob[] = [
      {
        name: 'weekly',
        intervalMs: 60_000,
        runOnStart: true,
        run: async () => {
          runs.push('weekly');
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
        expect.objectContaining({ name: 'weekly', err: 'db down' })
      );
    } finally {
      await scheduler.stop();
    }
  });
});
