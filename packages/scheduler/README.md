# @adopt-dont-shop/scheduler

## Purpose

A tick-based scheduler for periodic backend jobs, with an optional
cross-instance run claim so a multi-replica service runs each job exactly
once per interval instead of once per replica.

This is a service-only shared package (not a `lib.*`) — imported by
`services/*` entry points only. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

Extracted (ADS-1325) from `services/notifications/src/scheduler/` —
notifications had the newer implementation (a per-job `anchorMs` phase
offset, ADS-1127, plus the cross-instance `claimRun` hook, ADS-1052);
`services/audit` carried an older, unpatched fork that seeded a
`runOnStart` job's due instant to the Unix epoch (`0`) instead of "now", so
it never converged onto a healthy per-interval cadence, and had no
`claimRun` wiring at all — its two GDPR-saga jobs fired on every replica and
re-fired on every restart. Both services now import this package instead of
carrying their own copy.

## Location in the architecture

A shared utility every service with periodic, in-process jobs can boot
through — see [`docs/README.md`](../../docs/README.md#libraries) for where
the shared backend packages sit. Pairs with a service's own Postgres pool
(the claim table lives in the calling service's schema) and
[`@adopt-dont-shop/observability`](../observability/README.md) (a caller
typically wires `onJobFailure` to its own Prometheus counter).

## Scripts

```bash
pnpm build        # tsc build
pnpm dev          # tsc --watch
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Public API / exports

The canonical list lives in [`src/index.ts`](src/index.ts):

- `startScheduler(jobs, options)` — starts the tick loop; returns
  `{ tick, stop }`.
- `claimScheduledRun(conn, jobName, scheduledFor)` — the cross-instance
  claim primitive (`INSERT ... ON CONFLICT DO NOTHING` against a
  `scheduled_job_runs` table the calling service migrates itself).

```typescript
import { startScheduler, claimScheduledRun, type ScheduledJob } from '@adopt-dont-shop/scheduler';

const jobs: ScheduledJob[] = [
  {
    name: 'gdpr-sweep',
    intervalMs: 5 * 60 * 1000,
    runOnStart: true,
    run: async () => {
      await runGdprSweep({ pool, nats, logger, deadlineMs, maxRetries });
    },
  },
];

const scheduler = startScheduler(jobs, {
  logger,
  // Optional — omit to run single-instance (no cross-replica locking).
  claimRun: (job, scheduledFor) => claimScheduledRun(pool, job, scheduledFor),
  // Optional — the scheduler carries no metrics dependency of its own.
  onJobFailure: job => myFailureCounter.inc({ job }),
});

// On shutdown:
await scheduler.stop();
```

`anchorMs` on a job shifts its interval grid off the Unix epoch (e.g. to
land a weekly job on a chosen weekday/time instead of whatever day the
epoch falls on); `runOnStart` fires a job on the next tick instead of
waiting a full `intervalMs` first.

### The claim table

`claimScheduledRun` expects a `scheduled_job_runs` table in the calling
service's own schema (no cross-schema FK — same convention as every other
table in this repo). Add a migration that mirrors
[`services/notifications/src/migrations/010_create_scheduled_job_runs.ts`](../../services/notifications/src/migrations/010_create_scheduled_job_runs.ts),
with `(job_name, scheduled_for)` as the primary key.

## Environment variables consumed

None — this package takes config via function arguments only (`logger`,
`claimRun`, `onJobFailure`, `tickIntervalMs`, `now`). See
[`docs/env-reference.md`](../../docs/env-reference.md) for the shared list.

## Testing notes

`src/scheduler.test.ts` injects `now` so every test is deterministic and
runs with no real timers, plus a couple of cases that exercise the real
`setTimeout`-driven loop via `vi.useFakeTimers()`. `src/claim.test.ts` stubs
the Postgres `Pool`/`PoolClient` with an in-memory claimed-slot set
modelling `INSERT ... ON CONFLICT DO NOTHING`. See
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner
of `/packages/`.
