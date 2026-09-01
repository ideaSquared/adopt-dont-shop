# ADR 0011 — Interim availability posture for the eyes-on launch (ADS-1252)

- Status: Accepted (2026-08-28). The first promotion-trigger item —
  auto-rollback-on-failed-health — is now **implemented** in `deploy.yml` (see
  the note under "Promotion triggers"). The rest of the HA build (start-first,
  multi-host, managed datastores) remains deferred per the decision below.
- Date: 2026-08-28
- Scope: production availability / SLA posture. Builds on
  [ADR 0009](./0009-deployment-strategy-and-ha.md) (deployment-strategy & HA
  option survey) and the recovery objectives already recorded in
  [`docs/db-backup-runbook.md`](../db-backup-runbook.md).

## Context

ADR 0009 surveyed the single-host / single-replica / no-auto-rollback
deployment posture flagged by ADS-1045 and chose "Option A" (auto-rollback +
a documented SPOF budget now; multi-replica / orchestrator deferred). It shipped
as _Proposed_ with five open questions for the maintainer, and its
implementation was never scheduled.

ADS-1252 is the explicit fork 0009 left open: **either build the
HA / auto-rollback / zero-downtime work, or consciously accept and document the
single-host SPOF budget with an RTO/RPO.** The product is a small-scale,
eyes-on launch; the ticket itself rates this P3 ("accepted tradeoff for a
small-scale eyes-on launch; blocks any availability SLA"). This ADR records the
**accept-and-document** decision for this phase and sequences the build behind
explicit promotion triggers, so the residual risk is owned rather than drifting.

It does not re-survey the options — 0009 does that. It records the launch-phase
decision and the numbers that make the acceptance concrete.

## Decision

**For the current eyes-on launch phase, accept the single-host SPOF budget,
adopt the recovery objectives already documented for the database as the
platform-wide availability budget, and defer the HA build behind the promotion
triggers below.**

1. **Adopt the existing recovery objectives as the launch availability budget.**
   [`docs/db-backup-runbook.md`](../db-backup-runbook.md) already commits to
   **RPO 24h** (daily 02:00 UTC logical dump; anything written since the last
   snapshot is lost on a full restore) and **RTO ≤ 2h** for the database restore
   itself. A full-host loss additionally requires provisioning a replacement
   host and re-running the deploy before that restore, so the **whole-platform
   RTO is "host provisioning + ≤2h DB restore"** — hours, not minutes, with no
   warm standby. These are numbers the maintainer is ratifying, not new
   invention; wanting a tighter target is itself a promotion trigger (PITR,
   [ADR 0007](./0007-postgres-backups-pitr-restore.md), and/or a standby).
2. **Accept the deploy-window downtime.** In-place `docker compose up -d` stops
   each old container before starting the new one (ADR 0009 context), so every
   deploy carries a short per-service downtime window. Deploys run as a
   maintenance activity, not a zero-downtime rollout.
3. **Accept the stateful singletons as SPOFs.** One Postgres, one Redis, one
   NATS, one host — no standby. Recovery is restore-from-backup within the
   RTO/RPO above.

### Promotion triggers (when the deferred build becomes due)

The build is deferred, not cancelled. Any one of these flips it back on, in
ADR 0009's Option A → B → C order:

- **Auto-rollback-on-failed-health (0009 Option A, step 1)** — the cheapest item
  and the one that removes the worst failure mode: a failed deploy sitting as an
  open-ended live outage waiting on a human. It works with plain
  `docker compose` today. **Implemented (2026-08-28):** the "Deploy to server"
  step in `deploy.yml` now reverts `DEPLOY_SHA` to `.last_sha` and re-ups the
  stack when the health gate or route smoke check fails, before exiting non-zero
  — so a bad rollout self-heals to the last-known-good version instead of
  waiting on a manual `rollback.yml` dispatch. (Reverts images only; safe under
  the expand/contract migration contract — proposed ADR 0008.)
- **A committed availability SLA, or an RPO/RTO tighter than 24h / 2h** → build
  PITR (ADR 0007) and/or a warm Postgres standby.
- **Traffic that can no longer absorb the deploy-window downtime** → build
  start-first / blue-green (0009 Option A step 2 — Swarm migration or a scripted
  swap; `deploy.update_config` is inert under plain `docker compose`).
- **Host-loss tolerance becomes a requirement** → multi-host + managed /
  replicated datastores (0009 Option C).

Each trigger's build must observe the expand/contract migration contract
([ADR 0008](./0008-pre-deploy-migration-strategy.md)): start-first and
multi-replica rollouts are only safe once old and new code can coexist against
one schema.

## What sign-off ratifies

- The **24h RPO / ≤2h DB-RTO** (plus host-provisioning time for a full-host
  loss) as the accepted launch availability budget.
- That **Postgres / Redis / NATS / host are unreplicated SPOFs by current
  design**, recovered by restore-from-backup.
- That **deploys carry a short maintenance-window downtime**.
- The **promotion triggers** above as the agreed conditions that move each
  deferred item into build.

## Open questions carried from ADR 0009

0009's open questions #2 (committed RTO/RPO) and #3 (managed / replicated
Postgres) are answered _for this phase_ by the acceptance above (24h / 2h; no
managed Postgres yet). #1 (accept SPOF vs. invest now), #4 (Swarm vs. scripted
swap) and #5 (orchestrator on the roadmap at all) remain open and are deferred
with the build — they only need answering when a promotion trigger fires.
