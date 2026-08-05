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

  it('runs the job when the claim is won, keyed by the interval-quantised slot', async () => {
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
      // slot = floor(1_000_000 / 60_000) * 60_000 = 960_000
      expect(claimCalls).toEqual([{ job: 'weekly', scheduledFor: new Date(960_000) }]);
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
