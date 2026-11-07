import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from 'winston';

const startSchedulerMock = vi.fn();
const claimScheduledRunMock = vi.fn();
vi.mock('@adopt-dont-shop/scheduler', () => ({
  startScheduler: (...args: unknown[]) => startSchedulerMock(...args),
  claimScheduledRun: (...args: unknown[]) => claimScheduledRunMock(...args),
}));

const liftExpiredSuspensionsMock = vi.fn();
vi.mock('./grpc/suspension-expiry.js', () => ({
  liftExpiredSuspensions: (...args: unknown[]) => liftExpiredSuspensionsMock(...args),
}));

import {
  SUSPENSION_EXPIRY_JOB_NAME,
  startSuspensionExpiryScheduler,
  stopSchedulerWithin,
} from './suspension-expiry-job.js';
import type { HandlerDeps } from './grpc/handlers.js';

const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() } as unknown as Logger;
const deps = { pool: { tag: 'pool' } } as unknown as HandlerDeps;

type Job = { name: string; intervalMs: number; runOnStart?: boolean; run: () => Promise<void> };
type Options = { claimRun: (job: string, scheduledFor: Date) => Promise<boolean> };

const start = () => {
  const running = { tick: vi.fn(), stop: vi.fn() };
  startSchedulerMock.mockReturnValue(running);
  const result = startSuspensionExpiryScheduler({ deps, logger });
  const [jobs, options] = startSchedulerMock.mock.calls[0] as [Job[], Options];
  return { result, running, job: jobs[0], jobs, options };
};

describe('startSuspensionExpiryScheduler', () => {
  beforeEach(() => {
    startSchedulerMock.mockReset();
    claimScheduledRunMock.mockReset();
    liftExpiredSuspensionsMock.mockReset();
    vi.mocked(logger.info).mockReset();
  });

  it('registers one job that runs every minute and also on start, so a restart catches up', () => {
    const { jobs, job } = start();

    expect(jobs).toHaveLength(1);
    expect(job).toMatchObject({
      name: SUSPENSION_EXPIRY_JOB_NAME,
      intervalMs: 60_000,
      runOnStart: true,
    });
  });

  it('claims each run slot across replicas, so exactly one replica lifts per interval', async () => {
    claimScheduledRunMock.mockResolvedValue(true);
    const { options } = start();
    const slot = new Date('2026-06-10T12:00:00.000Z');

    await expect(options.claimRun(SUSPENSION_EXPIRY_JOB_NAME, slot)).resolves.toBe(true);

    expect(claimScheduledRunMock).toHaveBeenCalledWith(
      (deps as unknown as { pool: unknown }).pool,
      SUSPENSION_EXPIRY_JOB_NAME,
      slot
    );
  });

  it('lifts expired suspensions when the job runs, and logs how many (never who)', async () => {
    liftExpiredSuspensionsMock.mockResolvedValue({ liftedCount: 3 });
    const { job } = start();

    await job.run();

    expect(liftExpiredSuspensionsMock).toHaveBeenCalledWith(deps);
    expect(logger.info).toHaveBeenCalledWith('suspension expiry sweep complete', {
      liftedCount: 3,
    });
  });

  it('returns the scheduler handle so shutdown can stop it', () => {
    const { result, running } = start();
    expect(result).toBe(running);
  });
});

describe('stopSchedulerWithin', () => {
  it('returns once the scheduler has stopped', async () => {
    const stop = vi.fn().mockResolvedValue(undefined);

    await stopSchedulerWithin({ tick: vi.fn(), stop }, { timeoutMs: 5_000, logger });

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('gives up after the time budget when an in-flight sweep will not finish, so shutdown is not held up', async () => {
    vi.useFakeTimers();
    try {
      const stop = vi.fn().mockReturnValue(new Promise<void>(() => undefined));
      const done = stopSchedulerWithin({ tick: vi.fn(), stop }, { timeoutMs: 5_000, logger });

      await vi.advanceTimersByTimeAsync(5_000);
      await done;

      expect(logger.warn).toHaveBeenCalledWith(
        'suspension expiry scheduler did not stop in time; continuing shutdown',
        { timeoutMs: 5_000 }
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('swallows a stop failure so the rest of shutdown still runs', async () => {
    const stop = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(
      stopSchedulerWithin({ tick: vi.fn(), stop }, { timeoutMs: 5_000, logger })
    ).resolves.toBeUndefined();
  });
});
