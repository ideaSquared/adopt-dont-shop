# Host Reboot / Cold Start

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** during the reboot every `service-*` job is unreachable, so
> expect a burst of `ServiceDown` (`critical`, `infra/prometheus/rules/service-down.yml`)
> that should self-resolve as containers come back.

## Symptoms

- The single prod host rebooted (kernel update, provider maintenance, crash).
- The whole site was briefly unreachable; alerts fired for every service.
- You need to confirm the stack came back cleanly, or bring it back by hand.

## Background — what recovers on its own

Every container runs `restart: always` (certbot `unless-stopped`), so the Docker
daemon restarts them automatically on boot. File-secrets under
`/opt/ads/production/secrets/` are **kept on disk** (ADS-1247) precisely so a
reboot re-resolves the bind mounts and services don't come up reading empty
secrets. So a clean reboot usually needs **no** manual action — this runbook is
to verify that, and to recover the cases where it didn't.

## Preconditions

See [`README.md`](./README.md#preconditions): prod SSH, `docker compose -f
docker-compose.prod.yml`. Note the two compose roots: the app stack at
`/opt/ads/production/` and the shared TLS edge at `/opt/ads/gateway/`
(`docker-compose.gateway.yml`).

## Triage in 60 seconds

1. Is the Docker daemon up?

   ```bash
   systemctl is-active docker
   ```

   Expected: `active`. If not, `sudo systemctl start docker` and wait.

2. Did the containers come back?

   ```bash
   cd /opt/ads/production
   docker compose -f docker-compose.prod.yml ps
   ```

   Expected: every service `Up (healthy)`. Any `Created`/`Exited`/`restarting`
   → continue to Mitigation.

## Diagnosis

- **A service is `restarting`.** Likely a dependency wasn't healthy yet at its
  start (`depends_on: nats/database: service_healthy`), or a genuine failure.
  Check its logs:
  ```bash
  docker compose -f docker-compose.prod.yml logs --tail=100 --no-color service-<name>
  ```
  A migration error → [`migration-failure.md`](./migration-failure.md); a NATS
  connection error → [`nats-down.md`](./nats-down.md).
- **The DB volume didn't mount / `database` won't start** → host disk or volume
  problem; see [`postgres-disk-full.md`](./postgres-disk-full.md).
- **`.env` missing or `DEPLOY_SHA` unset** → compose can't resolve image tags
  (`DEPLOY_SHA must be set`). The `.env` lives on the host and should survive a
  reboot; if it's gone, the last deploy's environment must be restored (escalate).

## Mitigation

1. **Reconcile the app stack to desired state** (idempotent — recreates only
   what's missing):

   ```bash
   cd /opt/ads/production
   docker compose -f docker-compose.prod.yml up -d
   ```

   Expected: any stopped/missing container is (re)created; already-running ones
   are untouched.

2. **Bring up the TLS edge** if it didn't restart:

   ```bash
   cd /opt/ads/gateway
   docker compose -f docker-compose.gateway.yml up -d
   ```

   Expected: `ads_gateway` (nginx) and `ads_certbot` `Up`.

3. **Start order matters only transiently** — infra (`database`, `redis`,
   `nats`) must be healthy before the services that depend on them. `up -d`
   handles the ordering; if a service raced ahead and is stuck `restarting`,
   a single `docker compose -f docker-compose.prod.yml up -d service-<name>`
   once infra is healthy clears it.

## Verify

- `docker compose -f docker-compose.prod.yml ps` shows every service `Up (healthy)`.
- `curl -sf https://${PROD_HOSTNAME}/health/simple` returns 200.
- TLS still valid: `curl -sI https://${PROD_HOSTNAME}` (no cert error) — a long
  outage can straddle a cert expiry; if so, [`tls-cert-renewal.md`](./tls-cert-renewal.md).
- `ServiceDown` alerts resolve on their own once services are healthy.

## Rollback

Nothing here is destructive — `up -d` only converges to the compose file's
desired state. There's nothing to roll back.

## Escalate

If a service won't stay up after infra is healthy, if `.env` / `DEPLOY_SHA` is
missing, or the DB volume is unrecoverable, DM the secondary on-call. Hand over
which containers are down and their logs.

## Capture

```bash
docker compose -f docker-compose.prod.yml ps > /tmp/reboot-incident-$(date +%s).txt
docker compose -f docker-compose.prod.yml logs --since 30m --no-color \
  >> /tmp/reboot-incident-$(date +%s).txt
```

## Related

- [`nats-down.md`](./nats-down.md), [`postgres-disk-full.md`](./postgres-disk-full.md),
  [`migration-failure.md`](./migration-failure.md) — the specific dependency that
  didn't come back.
- [`tls-cert-renewal.md`](./tls-cert-renewal.md) — if the outage crossed a cert expiry.
