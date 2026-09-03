# Deploy Rollback

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** usually accompanies `HighErrorRate` / `HighGrpcErrorRate`
> (`warning`, `infra/prometheus/rules/high-error-rate.yml`) or a manual decision
> after a bad release. No dedicated deploy alert.

## Symptoms

- Error rate spiked immediately after the new image went live (time-aligns with
  the deploy timestamp — check Grafana annotations).
- A user-visible feature regressed (functional bug, not a perf blip).
- A new error class in logs that didn't exist on the previous SHA.
- The post-deploy health/smoke check in `.github/workflows/deploy.yml` failed —
  in which case the deploy **already auto-rolled back** (see below).

## Preconditions

- `gh` authenticated on your workstation with access to the `deploy.yml` /
  `rollback.yml` workflows. **The sanctioned rollback runs through GitHub
  Actions, not by hand on the host.**
- Prod SSH only if you need to read `.last_sha` or inspect running images.
- You know the previous good 40-character SHA (see step 0).

## How prod image tags work

Production pulls each service from GHCR by the **full 40-character git SHA** of
the commit that built it, pushed by `.github/workflows/deploy.yml`:

```
ghcr.io/ideasquared/adopt-dont-shop/<service>:<40-char git SHA>
```

Every image line in `docker-compose.prod.yml` resolves as
`${SERVICE_<NAME>_TAG:-${DEPLOY_SHA}}` — a fleet-wide `DEPLOY_SHA` unless a
per-service `SERVICE_*_TAG` override is set. Production also pushes `:latest` to
the same digest, but **rollback always targets an immutable SHA**, never
`:latest`. (The `sha-…` / `vX.Y.Z` tags on Docker Hub come from
`release.yml` and are **not** what prod pulls — ignore them here.)

```bash
# What's running across the whole stack right now?
docker compose -f docker-compose.prod.yml images
# Expected: every service on the same 40-char SHA (unless a hotfix override
# is in place). A service on an unexpected SHA is your regression suspect.
```

## Triage in 60 seconds

1. Did the deploy's own health/smoke check fail? Then the deploy **already
   auto-rolled back** to the last good SHA (`deploy.yml` `rollback_and_fail`
   restores `.last_sha` and re-runs `up -d`). Confirm before doing anything:

   ```bash
   cat /opt/ads/production/.last_sha
   ```

   Expected: the SHA now serving is the previous good one, not the failed
   deploy's. If so, the stack is already back — investigate the failed build,
   don't roll again.

2. Did the spike start >30 min after the last deploy, with no deploy in between?
   Then this is probably not a release regression → open
   [`5xx-spike.md`](./5xx-spike.md).

## Diagnosis

Match the symptom to a cause before rolling back:

| Signal                                                  | Likely cause                 | Action                                                                                      |
| ------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| Error rate change time-aligns with the deploy timestamp | Bad release                  | Roll back (below)                                                                           |
| A new error class only on the new SHA                   | Bad release                  | Roll back (below)                                                                           |
| One service regressed, others fine                      | Bad single-service image     | Roll back one service                                                                       |
| Deploy ran a migration the old binary can't tolerate    | Forward-only schema conflict | **Do not** roll the image back alone — see [migration caveat](#schema-compatibility-caveat) |

## Mitigation

### 0. Sanctioned path — roll the whole environment back (preferred)

Use the workflow. It rewrites `DEPLOY_SHA` in `/opt/ads/production/.env`, runs
`docker compose up -d`, runs the full health-check loop, and records `.last_sha`
— so the change **persists across reboots and the next deploy** in a way that a
hand-edit does not.

```bash
# From your workstation. sha = the previous good 40-char SHA.
make rollback env=production sha=<40-char SHA>
# equivalent to: gh workflow run rollback.yml -f environment=production -f sha=<sha>
```

Find the previous good SHA from `cat /opt/ads/production/.last_sha` on the host,
the last successful deploy run log, or `git log --oneline main` (the tag is the
commit SHA). Watch the workflow run to confirm health checks pass.

### Rolling back one service

When only one service regressed and you don't want a full-stack redeploy,
dispatch `deploy.yml` with a per-service tag override. The workflow validates
the key (`^(SERVICE|APP)_[A-Z_]+_TAG$`) and value, appends it to the host
`.env`, and recreates only that one service.

```bash
gh workflow run deploy.yml \
  -f environment=production \
  -f tag_overrides="SERVICE_PETS_TAG=<previous-good-sha>"
```

Multiple overrides are comma-separated: `"SERVICE_AUTH_TAG=<sha1>,SERVICE_PETS_TAG=<sha2>"`.
To return a service to the fleet-wide `DEPLOY_SHA`, redeploy without its
override and remove the `SERVICE_*_TAG` line from `/opt/ads/production/.env`.

| Variable                    | Compose service         | Internal port |
| --------------------------- | ----------------------- | ------------- |
| `SERVICE_GATEWAY_TAG`       | `service-gateway`       | 4000          |
| `SERVICE_AUTH_TAG`          | `service-auth`          | 5002          |
| `SERVICE_NOTIFICATIONS_TAG` | `service-notifications` | 5001          |
| `SERVICE_PETS_TAG`          | `service-pets`          | 5003          |
| `SERVICE_RESCUE_TAG`        | `service-rescue`        | 5004          |
| `SERVICE_APPLICATIONS_TAG`  | `service-applications`  | 5005          |
| `SERVICE_CHAT_TAG`          | `service-chat`          | 5006          |
| `SERVICE_MODERATION_TAG`    | `service-moderation`    | 5007          |
| `SERVICE_MATCHING_TAG`      | `service-matching`      | 5008          |
| `SERVICE_AUDIT_TAG`         | `service-audit`         | 5009          |
| `SERVICE_CMS_TAG`           | `service-cms`           | 5010          |
| `APP_CLIENT_TAG`            | `app-client`            | 8080          |
| `APP_ADMIN_TAG`             | `app-admin`             | 8080          |
| `APP_RESCUE_TAG`            | `app-rescue`            | 8080          |

### Break-glass — manual host rollback (last resort)

Only if GitHub Actions is unavailable. Editing the host directly works, **but
the next deploy overwrites `/opt/ads/production/.env`** — so this is temporary
and you must follow up with the sanctioned path.

```bash
cd /opt/ads/production
# 1. Persist the SHA in .env — an `export` in your shell alone does NOT survive
#    a container recreate.
sed -i 's/^DEPLOY_SHA=.*/DEPLOY_SHA=<previous-good-sha>/' .env
# 2. Pull + restart.
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Schema-compatibility caveat

The deploy contract is **forward-only schemas**: a deploy may add columns but
the previous binary must still run against the new schema. If the failed deploy
ran a migration the previous binary cannot tolerate (dropped a column it reads,
added a `NOT NULL` it doesn't populate), an image rollback alone won't help.

There is **no `pnpm db:migrate:undo`** — the runner (`packages/db/src/migrate.ts`)
is `up`-only. To reverse a schema change, ship a corrective forward migration in
a new image. See [`migration-failure.md`](./migration-failure.md) path E for the
"schema is ahead of binary" recovery sequence — do it with a DBA on the line and
a backup taken first.

## Verify

- Error rate drops to the pre-deploy baseline within 5 min and stays there.
  Expected: `HighErrorRate` / latency alerts resolve.
- `curl -sf https://${PROD_HOSTNAME}/health/simple` returns 200.
  Expected: HTTP 200 body `ok`.
- `docker compose -f docker-compose.prod.yml images` shows the rolled-back SHA
  on the affected services.

## Rollback

Rolling forward again is symmetric: `make rollback env=production sha=<newer SHA>`
targets any SHA, so an over-eager rollback is itself reversible the same way. A
manual host edit is undone by the next `deploy.yml` run (it rewrites `.env`).

## Escalate

If error rate has not returned to baseline **15 minutes** after the rollback
completed, or you cannot identify the previous good SHA, DM the secondary
on-call. Hand over: the bad SHA, the SHA you rolled to, the spike window, and
the failing CI run link. If a migration is involved, escalate to the DBA before
touching the schema.

## Capture

```bash
docker compose -f docker-compose.prod.yml logs --since 2h --no-color \
  service-gateway service-<name> > /tmp/rollback-incident-$(date +%s).log
```

Open a Linear ticket on the offending release, link the original PR, note the
bad tag, the previous good tag, the spike window, and which services were rolled
back. If a corrective migration was needed, link that PR too.

## Related

- [`5xx-spike.md`](./5xx-spike.md) — when the spike isn't deploy-aligned.
- [`migration-failure.md`](./migration-failure.md) — schema-ahead-of-binary.
- [`ghcr-pull-failure.md`](./ghcr-pull-failure.md) — when the rollback can't pull
  the old image.
- [`../operations/deploy.md`](../operations/deploy.md) — the normal deploy
  procedure and the forward-only contract.
