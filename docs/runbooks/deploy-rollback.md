# Deploy Rollback

**Page severity:** depends on the trigger. Usually accompanies
`HighFiveHundredRate` (`critical`) or a manual decision after a bad
release.

## When to roll back

- Error rate spiked immediately after the new image went live.
- A user-visible feature regressed (functional bug, not a perf blip).
- The post-deploy smoke check in `.github/workflows/deploy.yml`
  failed.

If a **migration** also ran in this deploy, read the
[Schema-compatibility caveat](#schema-compatibility-caveat) before
rolling the image back.

## Symptoms that look like a deploy regression

- Error rate change time-aligns with the deploy timestamp (check
  Grafana annotations).
- New error class in logs that didn't exist on the previous SHA.
- Latency regression localised to specific routes touched by the
  release.

## Image-tag refresher

From [`docs/operations/deploy.md`](../operations/deploy.md): production
runs immutable `:sha-<long>` or `:vX.Y.Z` tags, never `:latest`. The
previous good tag is in the deploy log / release notes.

```bash
# What's running right now?
docker compose -f docker-compose.prod.yml images service-backend
```

## Rollback procedure

```bash
# 1. Identify the previous good tag.
export IMAGE_TAG=v1.2.3        # or sha-<long> from release notes

# 2. Pull + restart with the old tag.
DEPLOY_SHA=${IMAGE_TAG} \
  docker compose -f docker-compose.prod.yml pull service-backend
DEPLOY_SHA=${IMAGE_TAG} \
  docker compose -f docker-compose.prod.yml up -d service-backend

# 3. Confirm the new (old) image is live.
docker compose -f docker-compose.prod.yml images service-backend

# 4. Health check.
curl -sf https://${PROD_HOSTNAME}/health
curl -sf https://${PROD_HOSTNAME}/api/v1/ready | jq
```

The `service-backend-migrate` init container also pins to
`${DEPLOY_SHA}`, so re-running it would replay the migration set the
*old* tag knows about. **Do not** restart `service-backend-migrate`
during an image rollback unless you're also reverting a migration —
see below.

## Schema-compatibility caveat

The deploy contract is **forward-only schemas**: a deploy may add
columns but the previous binary must still run against the new schema.
That assumption is documented in
[`docs/operations/deploy.md`](../operations/deploy.md#rollback).

If the failed deploy ran a migration that the previous binary cannot
tolerate (e.g. removed a column it still reads, added a `NOT NULL`
constraint it doesn't populate):

```bash
# 1. Roll the migration back FIRST.
docker compose -f docker-compose.prod.yml run --rm service-backend-migrate \
  npx sequelize-cli db:migrate:undo

# 2. Then roll the image back per the procedure above.
```

Confirm the migration that ran during this deploy actually has a
working `down()` — many do not (see
`db-backup-runbook.md` for the broader "forward-only" warning). If
`down()` is missing, you cannot roll back cleanly; jump to
[`migration-failure.md`](./migration-failure.md) and call the on-call
DBA.

## Verify

- Error rate drops to pre-deploy baseline within 5 min.
- `/api/v1/ready` returns 200.
- `HighFiveHundredRate` (and any latency alerts) resolve.
- `docker compose ... images service-backend` shows the old tag.

## Capture

```bash
# Record the bad image SHA before it scrolls out of logs.
docker compose -f docker-compose.prod.yml logs --since 2h --no-color \
  service-backend > /tmp/rollback-incident-$(date +%s).log

# Note in the Linear follow-up:
#  - bad tag, previous good tag, time window of the spike, link to
#    the failing CI build.
```

Open a Linear ticket on the offending release and link the original
PR. If the migration also needed reverting, attach the `db:migrate:undo`
output too.

## When NOT to roll back

- Migration succeeded but the binary is fine — the issue is data, not
  code. Roll back makes it worse.
- The spike started >30 min after the deploy with no other deploy in
  between — likely traffic / dependency, not the release. Investigate
  via [`5xx-spike.md`](./5xx-spike.md) first.
- You're not sure which tag is the previous good one — pull the
  release notes / `git log` on `main` before issuing `docker compose
  up`. A rollback to a worse tag costs more than 5 min of investigation.
