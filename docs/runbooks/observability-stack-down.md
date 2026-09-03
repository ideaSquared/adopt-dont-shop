# Observability Stack Down (flying blind)

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** none can fire — `infra/prometheus/rules/` only watches the
> `service-*` jobs, and if Prometheus/Alertmanager is the thing that's down, no
> alert reaches you at all. Discovery is usually "Grafana is blank" or "alerts
> went quiet during a known incident".

## Symptoms

- Grafana dashboards show `No data` / won't load.
- Prometheus → Status → Targets shows scrape targets `DOWN`, or Prometheus
  itself is unreachable.
- No Discord alerts during an incident you know is happening (Alertmanager down
  or unable to reach the webhook).
- Loki/Tempo Explore returns nothing.

**The app is unaffected.** The observability stack is an opt-in overlay
(`docker-compose.observability.yml`); if it's down, app services' shipping
endpoints just go inert. Fixing this restores visibility, it does not fix a
user-facing outage — if there's a real incident, mitigate that in parallel using
direct `docker compose` / `psql` inspection.

## Preconditions

See [`README.md`](./README.md#preconditions): prod SSH, `cd /opt/ads/production`.
The overlay is only present if observability was enabled
([`observability-enable.md`](./observability-enable.md)); its containers are the
`prometheus`, `loki`, `tempo`, `alertmanager`, and `grafana` services. Run
compose with **both** files so the overlay services resolve:

```bash
DC="docker compose -f docker-compose.prod.yml -f docker-compose.observability.yml"
```

## Triage in 60 seconds

1. What's down?

   ```bash
   $DC ps prometheus loki tempo alertmanager grafana
   ```

   Expected: all `Up`. Note which are `exited`/`restarting`.

2. Is it the whole overlay or one container? All five down at once points at the
   overlay not being loaded (host `.env` `OBSERVABILITY_ENABLED` unset after a
   deploy, or a reboot that didn't include the overlay) rather than a crash.

## Diagnosis

- **One container `restarting`** → read its logs, usually a bad config or full
  disk:
  ```bash
  $DC logs --tail=100 --no-color <prometheus|grafana|alertmanager|loki|tempo>
  ```
  Alertmanager specifically fails to start if its Discord webhook secret file is
  missing (`/etc/alertmanager/secrets/discord_webhook_url`) — see
  [`observability-enable.md`](./observability-enable.md) step 4.
- **All five absent** → the overlay isn't in the running compose. Confirm
  `OBSERVABILITY_ENABLED=true` in `/opt/ads/production/.env` and that the deploy
  layered the overlay in.
- **Prometheus up but targets `DOWN`** → the app services aren't exposing
  `/metrics` (or a network issue), not an observability-stack fault; that's a
  service problem ([`5xx-spike.md`](./5xx-spike.md)).
- **Disk pressure** → Loki/Tempo/Prometheus retention on a near-full host;
  [`postgres-disk-full.md`](./postgres-disk-full.md) covers reclaiming space.

## Mitigation

1. **Restart the down container(s):**

   ```bash
   $DC up -d prometheus loki tempo alertmanager grafana
   ```

   Expected: each returns to `Up`. For a single crashed one, `$DC restart <name>`.

2. **Alertmanager won't start** → ensure the webhook secret file exists, then
   restart (full procedure in [`observability-enable.md`](./observability-enable.md)):

   ```bash
   ls -l observability/alertmanager/secrets/discord_webhook_url
   $DC up -d alertmanager
   ```

3. **Overlay missing entirely** → re-enable it: set `OBSERVABILITY_ENABLED=true`
   in the host `.env` and re-run the deploy (or, on the host,
   `$DC --env-file .env up -d`).

## Verify

- `$DC ps` shows all five overlay services `Up`.
- Prometheus → Status → Targets shows the `service-*` jobs `UP`.
- Grafana **service-overview** repopulates.
- Alertmanager → Status is reachable; a test alert reaches the Discord channel
  (`amtool` from [`observability-enable.md`](./observability-enable.md)).

## Rollback

Restarting the overlay is non-destructive; the named metric/log/trace volumes
persist across restarts. Nothing to undo.

## Escalate

If the stack is down **during** a live user-facing incident and you can't
quickly restore visibility, escalate the incident on direct inspection (don't
wait on Grafana) and DM the secondary to help restore observability in parallel.
If disk is the cause, that's its own escalation.

## Capture

```bash
$DC ps > /tmp/obs-incident-$(date +%s).txt
$DC logs --since 1h --no-color prometheus alertmanager grafana \
  >> /tmp/obs-incident-$(date +%s).txt
```

## Related

- [`observability-enable.md`](./observability-enable.md) — how the overlay is
  provisioned and how Alertmanager is wired.
- [`postgres-disk-full.md`](./postgres-disk-full.md) — when retention volumes
  fill the host.
