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
runs immutable `:sha-<long>` or `:vX.Y.Z` tags per service, never
`:latest`. Each service has its own image and its own per-service tag
override in `docker-compose.prod.yml`
(`SERVICE_GATEWAY_TAG`, `SERVICE_AUTH_TAG`, …). The default is
`DEPLOY_SHA`, but a single service can be pinned to a different
SHA when rolling forward / back independently.

```bash
# What's running across the whole stack right now?
docker compose -f docker-compose.prod.yml images
```

## Rollback procedure

You can roll back **a single service** (preferred when only one
service regressed) or **the entire stack** (when the regression spans
multiple services or you can't pinpoint it).

### Single service rollback (preferred)

```bash
# 1. Identify the previous good tag for the affected service.
export SERVICE_PETS_TAG=sha-abc1234     # or vX.Y.Z

# 2. Pull + restart just that service. The other services keep their
#    current tags.
docker compose -f docker-compose.prod.yml pull service-pets
docker compose -f docker-compose.prod.yml up -d service-pets

# 3. Confirm the new (old) image is live for that service.
docker compose -f docker-compose.prod.yml images service-pets

# 4. Health check.
curl -sf https://${PROD_HOSTNAME}/health/simple
docker compose -f docker-compose.prod.yml ps
```

### Whole-stack rollback

```bash
# 1. Identify the previous good DEPLOY_SHA.
export DEPLOY_SHA=sha-abc1234

# 2. Pull + restart everything.
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# 3. Confirm tags across the stack.
docker compose -f docker-compose.prod.yml images
```

## Schema-compatibility caveat

The deploy contract is **forward-only schemas**: a deploy may add
columns but the previous binary must still run against the new schema.
That assumption is documented in
[`docs/operations/deploy.md`](../operations/deploy.md).

If the failed deploy ran a migration that the previous binary cannot
tolerate (e.g. removed a column it still reads, added a `NOT NULL`
constraint it doesn't populate), an image rollback alone won't help —
the old binary will fail against the new schema.

There is **no `pnpm db:migrate:undo` script**. The runner is
`node-pg-migrate` driven `up`-only by `@adopt-dont-shop/db`
(`packages/db/src/migrate.ts`). To reverse a schema change you must
write a corrective migration that performs the reverse DDL, ship it
in a new image, and let the service's boot `db:migrate` apply it.

If the affected migration has a working `down()`, you can run it
directly via `node-pg-migrate` from inside the service container, but
this is bypassing the deploy pipeline — only do it with a DBA on the
line and a backup taken first. See
[`migration-failure.md`](./migration-failure.md) path E for the
"schema is ahead of binary" recovery sequence.

## Verify

- Error rate drops to pre-deploy baseline within 5 min.
- `/health/simple` returns 200 and `docker compose ps` shows every
  service healthy.
- `HighFiveHundredRate` (and any latency alerts) resolve.
- `docker compose ... images` shows the old tag on the affected
  services.

## Capture

```bash
# Record the bad image SHA before it scrolls out of logs. Pull the
# gateway + the affected service(s) you rolled back.
docker compose -f docker-compose.prod.yml logs --since 2h --no-color \
  service-gateway service-<name> > /tmp/rollback-incident-$(date +%s).log

# Note in the Linear follow-up:
#  - bad tag, previous good tag, time window of the spike, link to
#    the failing CI build, which services were rolled back.
```

Open a Linear ticket on the offending release and link the original
PR. If a corrective migration was needed too, link that PR alongside.

## When NOT to roll back

- Migration succeeded but the binary is fine — the issue is data, not
  code. Roll back makes it worse.
- The spike started >30 min after the deploy with no other deploy in
  between — likely traffic / dependency, not the release. Investigate
  via [`5xx-spike.md`](./5xx-spike.md) first.
- You're not sure which tag is the previous good one — pull the
  release notes / `git log` on `main` before issuing `docker compose
  up`. A rollback to a worse tag costs more than 5 min of investigation.
