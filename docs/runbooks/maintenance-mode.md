# Maintenance Mode

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** none fires this directly — it's an action, not an alarm.
> `GatewayRateLimitSpike` (`warning`, `infra/prometheus/rules/gateway-resilience.yml`)
> annotates this runbook as one response to a rate-limit surge. Use it to shed
> traffic during another incident, a planned outage, or a controlled brownout.

## Preconditions

- Access to the **Statsig console** (`console.statsig.com`) for the project —
  this is where the flag lives. There is **no** maintenance-mode API on the
  gateway.
- For the hard-offline fallback: prod SSH, `cd /opt/ads/production`,
  `docker compose -f docker-compose.prod.yml`.

## What "maintenance mode" means here

The kill switch is the dynamic config
`APPLICATION_SETTINGS.maintenance_mode` (boolean), declared in
`lib.feature-flags/src/types/index.ts:69-76`:

```ts
export interface ApplicationSettingsConfig {
  max_applications_per_user: number;
  auto_approve_verified_rescues: boolean;
  maintenance_mode: boolean;
  new_registrations_enabled: boolean;
  adoption_approval_workflow_enabled: boolean;
}
```

There is also a coarser per-feature gate
`ALLOW_BULK_OPERATIONS` in `KNOWN_GATES` for shedding bulk write
traffic without taking the whole app down.

**When set to `true`**, the frontends consume the flag via the
`useDynamicConfig(KNOWN_CONFIGS.APPLICATION_SETTINGS)` hook and
render the maintenance banner / block protected actions. The gateway
continues to serve `/health/simple` and read endpoints unless you
also stop the container.

## When to use it

| Situation                                          | Action                              |
| -------------------------------------------------- | ----------------------------------- |
| Another incident is in flight, error rate climbing | `maintenance_mode = true`           |
| Planned migration with destructive cutover         | `maintenance_mode = true` window    |
| Bulk-write feature misbehaving, rest of app fine   | `ALLOW_BULK_OPERATIONS = false`     |
| Need to register no new users for an hour          | `new_registrations_enabled = false` |
| You want to take the site fully offline            | Stop nginx (not maintenance mode)   |

Maintenance mode does **not** prevent direct API hits — it's a UX
contract enforced by the frontend. Determined clients can still call
the API. If you need a hard block, stop nginx (preferred) or stop
`service-gateway` directly.

## Flipping the flag

`application_settings` is a **Statsig dynamic config**, not a value in any of
our services. The frontends read it via `useDynamicConfig(KNOWN_CONFIGS.APPLICATION_SETTINGS)`
(`packages/lib.feature-flags/src/hooks/useDynamicConfig.ts`). There is **no
gateway route** to change it — `services/gateway/src/routes/config.ts` only
serves a static public-config literal, and the admin app's Configuration page
(`apps/admin/src/pages/Configuration.tsx`) **displays** the flag read-only. So:

1. Sign in to the **Statsig console** (`console.statsig.com`) for the project.
2. Open **Dynamic Configs → `application_settings`**.
3. Edit the config so `maintenance_mode` → `true`. Change only that key — the
   config also holds `max_applications_per_user`, `new_registrations_enabled`,
   etc. Save.
4. Confirm in an incognito window that the maintenance banner appears (the
   frontends re-fetch on Statsig's polling cadence, ~30s).

There is no read-then-write clobber risk here — the Statsig editor edits the
existing config in place rather than replacing it wholesale.

## Verify maintenance mode is active

- Hit the public site in an incognito window — maintenance banner is
  visible within 30s.
- The Statsig console shows `application_settings.maintenance_mode = true`, and
  the admin app's Configuration page reflects `true` after its next poll.
- Backend logs do **not** show a flood of errors — maintenance mode
  shouldn't be generating its own noise. If they do, the frontends
  aren't honouring it; investigate before assuming traffic is shed.

## Lifting maintenance mode

Flip `maintenance_mode` back to `false` in the Statsig console (same path as
above). Then confirm:

- Banner disappears from the public site within 30s.
- A test write path (e.g. submit a saved-pet) succeeds end-to-end.
- Watch request volume and error rate on the Grafana **service-overview**
  dashboard for 5 min after lifting (the gateway exposes the
  `http_request_duration_seconds` histogram — its `_count` series is the request
  counter, e.g. `sum(rate(http_request_duration_seconds_count[5m]))`; there is
  no `http_requests_total`). Surfacing a still-broken dependency immediately
  after the flag flips is a common pattern.

## Hard offline (when maintenance mode isn't enough)

If determined direct-API traffic is making the underlying incident
worse:

```bash
# Take nginx down — returns connection-refused, not 5xx.
docker compose -f docker-compose.prod.yml stop nginx
# ...incident work...
docker compose -f docker-compose.prod.yml start nginx
```

This is louder than maintenance mode (no friendly banner, just a
connection failure) but it's the cleanest way to guarantee zero
traffic reaches the gateway / backing services.

## Escalate

Maintenance mode is a stopgap, not a fix. If the underlying incident isn't
resolving and you've been in maintenance mode for **30 minutes**, DM the
secondary on-call — an extended brownout is a business decision, not just an
engineering one. If you cannot reach the Statsig console at all, fall back to
hard-offline (stop nginx) and escalate the Statsig access problem separately.

## Capture

In the post-incident write-up, record:

- Time maintenance mode was enabled and lifted.
- Who flipped the flag.
- Which dependent flags (`new_registrations_enabled`,
  `ALLOW_BULK_OPERATIONS`) were also touched and whether they were
  restored.

A maintenance flag left on after the incident is the most common
follow-up bug — double-check the config on the morning after.
