# ADR 0009 — Deployment strategy & high availability (ADS-1045)

- Status: Proposed
- Date: 2026-08-05
- Scope: `.github/workflows/deploy.yml`, `.github/workflows/rollback.yml`,
  `docker-compose.prod.yml` — production release mechanics and single-host
  topology. No code or config is changed by this ADR; it is a decision
  proposal only.

## Context

ADS-1045 flags that the production deploy is an **in-place, single-replica,
single-host** recreate with **post-cutover** health checks and **no automatic
rollback**. Each of those is verifiable in the repo today:

- **In-place cutover.** The deploy job SSHes to the host and runs
  `docker compose -f $COMPOSE_FILE $OVERLAY_ARGS --env-file .env up -d`
  (`.github/workflows/deploy.yml:736`). Plain `docker compose up` recreates
  every container whose image tag changed by **stopping the old container,
  then starting the new one** — there is no overlap. Because the new
  `DEPLOY_SHA` was already written to `.env` a few lines earlier
  (`deploy.yml:627`), every service and app container is recreated on the same
  pass, so the whole stack turns over within one window.
- **Single replica, single host, every component a SPOF.**
  `docker-compose.prod.yml` declares exactly one container per service. There
  is no `replicas:` key anywhere in the file; each service instead pins a fixed
  `container_name` (`ads_prod_gateway` at `docker-compose.prod.yml:262`,
  `ads_prod_db` at `:152`, and so on), and the `deploy:` blocks carry only
  `resources` limits (`docker-compose.prod.yml:62-69`) — no `replicas`, no
  `update_config`. There is one `database` (`:150`), one `redis` (`:186`), one
  `nats` (`:224`), one gateway, one of each of the ten gRPC services, and one
  `nginx`, all on a single Hetzner host (`deploy.yml:600`,
  `secrets.HETZNER_HOST`). Any one of Postgres / Redis / NATS / the host itself
  is a hard single point of failure with no standby.
- **Health checks run AFTER cutover.** Only once `up -d` has already swapped
  the containers does the workflow wait for health: the shared
  `scripts/wait-for-services.sh` gate over all eleven services
  (`deploy.yml:744-755`) and the `/api/v1/auth/login` route smoke check
  (`deploy.yml:761-770`). By the time these run, live traffic is already
  hitting the new containers.
- **No automatic rollback.** The job runs under `set -euo pipefail`
  (`deploy.yml:606`), so if the health gate or smoke check fails the script
  exits non-zero **and stops there** — the new (unhealthy) containers keep
  running. The previous good SHA is still on disk in `.last_sha`, but that file
  is only _written_ on success (`deploy.yml:777`) and nothing _reads_ it on
  failure. Recovery is entirely manual: a human must notice the outage and
  dispatch `rollback.yml`, which is `workflow_dispatch`-only and **requires the
  operator to type the target SHA by hand** (`.github/workflows/rollback.yml:3-16`).

Net effect: every deploy has a downtime window (old container down before new
container is up), a failed deploy is a **live outage that persists until a
human intervenes**, and even a perfect deploy leaves every stateful component
without redundancy. This ADR proposes how far to close that gap, and what to
consciously accept.

## Options considered

Ordered by cost/complexity, cheapest first.

### Option A — Stay single-host; add auto-rollback + start-first + a documented SPOF budget

Keep the one-host compose topology but remove the _worst_ failure mode and
shrink the downtime window:

1. **Automatic rollback-on-failed-health.** When the health gate or smoke
   check fails, the deploy script re-points `DEPLOY_SHA` to the value in
   `.last_sha` and re-runs `docker compose up -d` before exiting non-zero, so a
   bad deploy self-heals back to the last-known-good SHA instead of sitting
   broken. This works with plain compose today — no orchestrator needed.
2. **Start-first recreate** to shrink (not eliminate) the per-service downtime
   window. **Caveat, verified:** `deploy.update_config.order: start-first` is a
   **Swarm-only** directive — `docker compose up` (what `deploy.yml:736` runs)
   silently ignores `update_config`. So "start-first" here means _either_
   migrating the deploy to `docker stack deploy` (Swarm) _or_ scripting a
   manual blue-green swap in the workflow (start the new container under a
   temp name, health-check it, then swap). The YAML block alone is not enough.
3. **Document the accepted SPOF** with an explicit RTO/RPO and a
   maintenance-window policy for deploys, so the residual single-host risk is a
   consciously-owned decision rather than an accident.

- **Pros:** Lowest cost. Auto-rollback needs no new infrastructure and kills
  the "failed deploy = open-ended outage" mode outright. RTO/RPO + maintenance
  windows make the residual risk explicit and reviewable.
- **Cons:** Postgres / Redis / NATS / host stay single points of failure — this
  option caps availability at "one host's uptime, minus planned windows." True
  zero-downtime start-first is more than a YAML line (see caveat).

### Option B — Multi-replica stateless services on the one host, behind the proxy

Run `replicas > 1` for the stateless tier (gateway + the ten gRPC services)
behind the existing `nginx`, so a rolling recreate can drain one replica while
another serves. **Blockers, verified:** every service sets a fixed
`container_name` (`docker-compose.prod.yml:262`, …), and Compose refuses to
scale a service that has one — those must be removed first. Stateful singletons
(Postgres/Redis/NATS) are unchanged and remain SPOFs.

- **Pros:** Real rolling deploys and app-tier resilience to a single container
  crash, still on one box.
- **Cons:** Only masks _stateless_ failures; the host and every stateful
  singleton are still SPOFs, so the availability ceiling barely moves. Needs
  container_name removal, per-service internal DNS/load-balancing across
  replicas, and connection-pool math against the single Postgres. Moderate work
  for a ceiling still set by one host.

### Option C — Move to an orchestrator with rolling deploys + managed HA Postgres

Adopt Docker Swarm / Nomad / Kubernetes across ≥2 hosts: native rolling updates
with real `order: start-first`, health-gated automatic rollback built into the
platform, and a replicated/managed Postgres (streaming replication or a managed
provider) plus Redis/NATS clustering.

- **Pros:** The only option that actually removes the host and datastore SPOFs
  and delivers genuine zero-downtime deploys and HA.
- **Cons:** Largest cost by far — new infrastructure, multi-host networking,
  stateful-service HA operations, and a migration off the current single-host
  compose model. Disproportionate to today's scale if the single-host risk is
  acceptable with a documented RTO/RPO.

## Decision

**Adopt Option A now; defer Options B and C to a follow-up epic.**

Rationale: the highest-severity issue in ADS-1045 is not the single replica —
it is that a _failed_ deploy is an _unbounded live outage_ waiting on a human.
Automatic rollback-on-failed-health fixes exactly that, works with the current
`docker compose up` mechanics with **no** orchestrator change, and is
low-risk to add. Pair it with an explicitly documented SPOF budget (RTO/RPO)
and a maintenance-window policy so the residual single-host risk is a decision
on record, not a surprise.

Sequence the start-first piece as a fast-follow, not a blocker: because
`deploy.update_config` is Swarm-only (see Option A caveat), genuine start-first
means choosing between a Swarm migration and a scripted blue-green swap — a
larger change than auto-rollback and best decided once the maintainer answers
the open questions below. Multi-host HA and managed Postgres (Options B/C) are
real work with real value but should ride their own epic; this ADR should not
smuggle a platform migration in under a deploy-hardening ticket.

## Implementation sketch

Described, **not applied** — illustrative only.

**1. Start-first block (Swarm only — will NOT take effect under
`docker compose up`).** If and only if the deploy moves to `docker stack
deploy`, each stateless service would gain:

```yaml
# docker-compose.prod.yml — ONLY honoured by `docker stack deploy` (Swarm),
# ignored by the current `docker compose up -d` at deploy.yml:736.
deploy:
  replicas: 2
  update_config:
    order: start-first # boot the new task before stopping the old
    failure_action: rollback
  rollback_config:
    order: stop-first
```

Under plain compose, the equivalent is a scripted swap in the workflow (start
`service-x-next`, health-check it, repoint nginx, remove the old container).

**2. Auto-rollback step in `deploy.yml` (works with plain compose today).**
After the existing health gate (`deploy.yml:744-770`), wrap the failure path so
it reverts to `.last_sha` instead of exiting broken:

```bash
# Illustrative — appended after the wait-for-services + smoke check.
if ! ./scripts/wait-for-services.sh "$COMPOSE_FILE" 30 2 "${HEALTH_TARGETS[@]}"; then
  echo "Health gate failed — rolling back to last-known-good."
  LAST_GOOD="$(cat .last_sha)"                       # written on prior success (deploy.yml:777)
  sed -i "s/^DEPLOY_SHA=.*/DEPLOY_SHA=$LAST_GOOD/" .env
  docker compose -f "$COMPOSE_FILE" --env-file .env up -d
  ./scripts/wait-for-services.sh "$COMPOSE_FILE" 30 2 "${HEALTH_TARGETS[@]}"
  echo "Rolled back to $LAST_GOOD." >&2
  exit 1                                             # deploy still fails, but the stack is healthy
fi
```

Note the ordering bug this must avoid: `DEPLOY_SHA` in `.env` is already the
_new_ SHA (`deploy.yml:627`), and `.last_sha` still holds the _previous_ good
SHA because it is only overwritten on success (`deploy.yml:777`). The rollback
must read `.last_sha` **before** any code path rewrites it.

**3. Documented RTO/RPO + maintenance-window section** (new subsection in
`docs/operations/deploy.md` or `docs/infrastructure/INFRASTRUCTURE.md`), stating
at minimum: the accepted **RTO** (how long a full host/datastore loss may take
to recover from backup — bounded by the restore runbook), the accepted **RPO**
(worst-case data loss, bounded by snapshot cadence in
`docs/operations/snapshot-policy.md`), the deploy **maintenance window** policy
(when in-place deploys may run and expected user-visible downtime), and an
explicit statement that Postgres/Redis/NATS/host are unreplicated SPOFs by
current design.

## Risks & rollout

- **Start-first requires two versions to coexist briefly.** Any start-first or
  multi-replica scheme means old and new code serve traffic simultaneously for
  a window, which is only safe if schema changes are backward-compatible. This
  ties directly to the expand/contract migration work in ADS-1044 (proposed
  ADR 0008, landing in a separate PR): start-first must not ship ahead of
  expand/contract discipline, or a
  not-yet-contracted column can break the still-running old version.
- **Auto-rollback and already-applied migrations.** Each service migrates its
  own schema on container start (the `Dockerfile.service` entrypoint runs
  `db:migrate`). If a deploy applies a forward migration and _then_ fails
  health, rolling the _images_ back to `.last_sha` does **not** roll the
  _schema_ back — the old image may run against a newer schema. Auto-rollback is
  therefore only safe under the same expand/contract guarantee (ADS-1044;
  proposed ADR 0008): forward migrations must be additive and
  old-code-compatible.
  Destructive/contracting migrations must never ship in the same deploy as the
  code that depends on them.
- **Stateful singletons still SPOF under Option A.** Auto-rollback and
  start-first do nothing for a Postgres/Redis/NATS/host failure. Option A's
  value is bounded to deploy safety; the documented RTO/RPO is what makes that
  boundary an accepted decision rather than a gap.
- **Rollout order.** Ship auto-rollback + the RTO/RPO doc first (self-contained,
  low blast radius). Decide Swarm-vs-scripted-swap for start-first only after
  the open questions are answered. Treat multi-host HA as a separate epic.

## Open questions for the maintainer

1. **Accept the single-host SPOF with a documented RTO/RPO, or invest in
   multi-host now?** Option A accepts it explicitly; Options B/C start buying it
   down at materially higher cost. What availability target actually matters for
   this product today?
2. **What RTO/RPO are we willing to commit to?** These numbers drive everything
   downstream (snapshot cadence, whether a warm standby is needed) and belong in
   the docs regardless of which option is chosen.
3. **Managed / replicated Postgres for HA — on the roadmap or out of scope?**
   It is the single biggest lever on real availability and the biggest
   operational commitment; deciding it gates Option C.
4. **Start-first via Swarm migration or a scripted blue-green swap?** Since
   `deploy.update_config` is inert under `docker compose up`, this is an
   either/or that shapes how much of `deploy.yml` changes.
5. **Is an orchestrator (Swarm/Nomad/K8s) on the roadmap at all?** If yes, some
   of Option A's scripting is throwaway and we may prefer to invest once; if no,
   Option A is the durable answer.
