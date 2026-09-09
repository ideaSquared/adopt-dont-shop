import type { Logger } from 'winston';
import { describe, expect, it, vi } from 'vitest';

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

  it('calls onJobFailure with the job name when a job throws (caller wires its own metric)', async () => {
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
      logger: quietLogger(),
      tickIntervalMs: 60_000,
      now: () => 1_000_000,
      onJobFailure,
    });
    try {
      await scheduler.tick();
      expect(onJobFailure).toHaveBeenCalledWith('flaky');
    } finally {
      await scheduler.stop();
    }
  });

  it('does not call onJobFailure (and does not throw) when it is omitted and a job fails', async () => {
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
      await expect(scheduler.tick()).resolves.toEqual(['flaky']);
    } finally {
      await scheduler.stop();
    }
  });

  it('does not call onJobFailure when the job succeeds', async () => {
    const onJobFailure = vi.fn();
    const jobs: ScheduledJob[] = [
      {
        name: 'ok',
        intervalMs: 60_000,
        runOnStart: true,
        run: async () => undefined,
      },
    ];
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 60_000,
      now: () => 1_000_000,
      onJobFailure,
    });
    try {
      await scheduler.tick();
      expect(onJobFailure).not.toHaveBeenCalled();
    } finally {
      await scheduler.stop();
    }
  });

  it('tick() is a no-op after stop()', async () => {
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
    await scheduler.stop();
    const fired = await scheduler.tick();
    expect(fired).toEqual([]);
    expect(runs).toEqual([]);
  });

  it('fires jobs via the internal timer loop, not just manual tick() calls', async () => {
    vi.useFakeTimers();
    try {
      const runs: string[] = [];
      const jobs: ScheduledJob[] = [
        {
          name: 'x',
          intervalMs: 100,
          runOnStart: true,
          run: async () => {
            runs.push('x');
          },
        },
      ];
      const scheduler = startScheduler(jobs, {
        logger: quietLogger(),
        tickIntervalMs: 50,
      });
      // Runs the internal setTimeout -> tick() -> reschedule chain across
      // several 50ms ticks, exercising the timer loop end to end rather
      // than the test-only synchronous tick() escape hatch. The 100ms
      // interval fires once immediately (runOnStart) and again once 100ms
      // has elapsed.
      await vi.advanceTimersByTimeAsync(120);
      expect(runs).toEqual(['x', 'x']);
      await scheduler.stop();
    } finally {
      vi.useRealTimers();
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

describe('scheduler cross-instance claim', () => {
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
      // A claimed runOnStart job seeds to the CURRENT interval boundary
      // (floor(1_000_000 / 60_000) * 60_000 = 960_000) — the job's own
      // scheduled instant, grid-aligned for cross-replica agreement, but
      // deliberately NOT the Unix epoch (0): with due-anchored progression,
      // an epoch-anchored due would fire on every subsequent tick forever
      // instead of once per interval.
      expect(claimCalls).toEqual([{ job: 'weekly', scheduledFor: new Date(960_000) }]);
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
    let now = 250;
    const jobs: ScheduledJob[] = [
      {
        name: 'weekly',
        intervalMs: 1000,
        run: async () => undefined,
      },
    ];
    // Boot at 250ms into the [0, 1000) window. The old, buggy seed
    // (now() + intervalMs) would be 1250 — this proves the new seed is the
    // shared boundary (1000) instead, by asserting it's due (and claims)
    // exactly there, one full 750ms earlier than the old seed would allow.
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 100,
      now: () => now,
      claimRun,
    });
    try {
      now = 1000;
      const fired = await scheduler.tick();
      expect(fired).toEqual(['weekly']);
      expect(claimCalls).toEqual([new Date(1000)]);
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
      // under a wall-clock-quantised claim this alone is enough to make two
      // replicas disagree on the slot for every subsequent period, not just
      // this one.
      const replicaA = makeReplica(999);
      const replicaB = makeReplica(1000);

      try {
        for (let period = 1; period <= 5; period++) {
          const due = period * intervalMs;
          await replicaA.tickAt(due);
          await replicaB.tickAt(due);
        }
        // Exactly one replica ran the job each period — never both, never
        // neither. Asserting the exact sorted set of run instants (not just
        // the total count) rules out a pathological double-fire in one
        // period masked by a skipped period elsewhere.
        const allRuns = [...replicaA.runs, ...replicaB.runs].sort((a, b) => a - b);
        expect(allRuns).toEqual([1000, 2000, 3000, 4000, 5000]);
      } finally {
        await replicaA.stop();
        await replicaB.stop();
      }
    }
  );

  it('does not epoch-anchor a runOnStart job — no firing storm on every tick until due catches up to real time', async () => {
    const runs: number[] = [];
    // A realistic "far from the epoch" boot time, with an interval much
    // larger than the tick spacing (proportionally like a weekly digest
    // ticking every 60s) — this is the shape that exposes the bug this
    // package fixes relative to an epoch-seeded fork: with an
    // epoch-anchored due (0) and due-anchored progression, due only ever
    // advances by intervalMs (1000) per fire while real time starts
    // ~100_000ms ahead, so it would stay permanently overdue and fire on
    // literally every tick instead of once per interval.
    let now = 100_000;
    const jobs: ScheduledJob[] = [
      {
        name: 'digest',
        intervalMs: 1000,
        runOnStart: true,
        run: async () => {
          runs.push(now);
        },
      },
    ];
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 10,
      now: () => now,
    });
    try {
      const first = await scheduler.tick();
      expect(first).toEqual(['digest']); // fires immediately, as documented

      // Advance by far less than a full interval — a healthy scheduler must
      // NOT consider it due again yet.
      now += 10;
      const second = await scheduler.tick();
      expect(second).toEqual([]);
      expect(runs).toEqual([100_000]);
    } finally {
      await scheduler.stop();
    }
  });

  it(
    'ADS-1127: a real 7-day job with no anchorMs grid-aligns to Thursday 00:00 UTC ' +
      'regardless of boot time',
    async () => {
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const claimCalls: Date[] = [];
      const claimRun = async (_job: string, scheduledFor: Date): Promise<boolean> => {
        claimCalls.push(scheduledFor);
        return true;
      };
      // A realistic boot time, decades from the epoch and on an arbitrary
      // weekday — the fire day is fully determined by the epoch's weekday
      // once anchorMs is 0.
      const bootNow = Date.UTC(2026, 8, 1, 12, 0, 0); // 2026-09-01T12:00:00Z (Tuesday)
      const jobs: ScheduledJob[] = [
        {
          name: 'weekly-digest',
          intervalMs: ONE_WEEK_MS,
          // anchorMs intentionally omitted.
          run: async () => undefined,
        },
      ];
      let now = bootNow;
      const scheduler = startScheduler(jobs, {
        logger: quietLogger(),
        tickIntervalMs: 100,
        now: () => now,
        claimRun,
      });
      try {
        // Jump straight to the seeded (epoch-aligned) boundary and tick.
        now = Math.ceil(bootNow / ONE_WEEK_MS) * ONE_WEEK_MS;
        const fired = await scheduler.tick();
        expect(fired).toEqual(['weekly-digest']);
        expect(claimCalls).toHaveLength(1);
        const firedAt = claimCalls[0];
        // 1970-01-01T00:00:00Z (the epoch) was a Thursday — every
        // epoch-anchored weekly boundary inherits that weekday and midnight
        // time.
        expect(firedAt.getUTCDay()).toBe(4); // Thursday
        expect(firedAt.getUTCHours()).toBe(0);
        expect(firedAt.getUTCMinutes()).toBe(0);
      } finally {
        await scheduler.stop();
      }
    }
  );

  it(
    'ADS-1127 fix: anchoring the weekly grid to the intended weekday/time fires there ' +
      'instead of drifting to Thursday 00:00 UTC',
    async () => {
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      // 1970-01-05T09:00:00Z is a Monday (the epoch, 1970-01-01, was a
      // Thursday, so +4 days lands on Monday). Anchoring the grid to this
      // instant — rather than the epoch — makes every subsequent weekly
      // boundary land on Monday 09:00 UTC instead of Thursday 00:00 UTC.
      const anchorMs = Date.UTC(1970, 0, 5, 9, 0, 0);
      const claimCalls: Date[] = [];
      const claimRun = async (_job: string, scheduledFor: Date): Promise<boolean> => {
        claimCalls.push(scheduledFor);
        return true;
      };
      const bootNow = Date.UTC(2026, 8, 1, 12, 0, 0); // 2026-09-01T12:00:00Z (Tuesday)
      const jobs: ScheduledJob[] = [
        {
          name: 'weekly-digest',
          intervalMs: ONE_WEEK_MS,
          anchorMs,
          run: async () => undefined,
        },
      ];
      let now = bootNow;
      const scheduler = startScheduler(jobs, {
        logger: quietLogger(),
        tickIntervalMs: 100,
        now: () => now,
        claimRun,
      });
      try {
        now = anchorMs + Math.ceil((bootNow - anchorMs) / ONE_WEEK_MS) * ONE_WEEK_MS;
        const fired = await scheduler.tick();
        expect(fired).toEqual(['weekly-digest']);
        expect(claimCalls).toHaveLength(1);
        const firedAt = claimCalls[0];
        expect(firedAt.getUTCDay()).toBe(1); // Monday
        expect(firedAt.getUTCHours()).toBe(9);
        expect(firedAt.getUTCMinutes()).toBe(0);
      } finally {
        await scheduler.stop();
      }
    }
  );

  it(
    'anchors the weekly grid to a configured offset instead of the epoch (ADS-1127), ' +
      'and still lets independently-booted replicas agree on the claim slot',
    async () => {
      const intervalMs = 1000;
      // Shift the grid so boundaries fall at 300, 1300, 2300, ... instead of
      // 0, 1000, 2000 — standing in for "anchor to the desired weekday/hour"
      // rather than the raw epoch.
      const anchorMs = 300;
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
            anchorMs,
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

      // Boot straddling an anchored boundary (1300), not an epoch-aligned one.
      const replicaA = makeReplica(1299);
      const replicaB = makeReplica(1300);

      try {
        for (let period = 1; period <= 3; period++) {
          const due = anchorMs + period * intervalMs;
          await replicaA.tickAt(due);
          await replicaB.tickAt(due);
        }
        // Fire instants land on the anchored grid (1300, 2300, 3300), never
        // the epoch-aligned one (1000, 2000, 3000) — and exactly one replica
        // runs each period.
        const allRuns = [...replicaA.runs, ...replicaB.runs].sort((a, b) => a - b);
        expect(allRuns).toEqual([1300, 2300, 3300]);
      } finally {
        await replicaA.stop();
        await replicaB.stop();
      }
    }
  );

  it('defaults anchorMs to 0 — omitting it keeps the epoch-aligned grid', async () => {
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
    const scheduler = startScheduler(jobs, {
      logger: quietLogger(),
      tickIntervalMs: 100,
      now: () => 250,
      claimRun,
    });
    try {
      const fired = await scheduler.tick();
      expect(fired).toEqual([]);
      // Not due yet (boundary is 1000, the epoch-aligned grid) — proves the
      // seed wasn't shifted by an implicit anchor.
      expect(claimCalls).toEqual([]);
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
