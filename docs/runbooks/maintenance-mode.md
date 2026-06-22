# Maintenance Mode

**Page severity:** N/A — this is an action, not an alarm. Used to
shed traffic during another incident, a planned outage, or a
controlled brownout.

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

| Situation                                         | Action                            |
| ------------------------------------------------- | --------------------------------- |
| Another incident is in flight, error rate climbing | `maintenance_mode = true`         |
| Planned migration with destructive cutover         | `maintenance_mode = true` window  |
| Bulk-write feature misbehaving, rest of app fine   | `ALLOW_BULK_OPERATIONS = false`   |
| Need to register no new users for an hour          | `new_registrations_enabled = false` |
| You want to take the site fully offline            | Stop nginx (not maintenance mode) |

Maintenance mode does **not** prevent direct API hits — it's a UX
contract enforced by the frontend. Determined clients can still call
the API. If you need a hard block, stop nginx (preferred) or stop
`service-gateway` directly.

## Flipping the flag

The flag is stored in the feature-flags backend (see
`lib.feature-flags`). Use the admin UI when you have a browser; use
the API when you have a terminal at 03:00.

### Via the admin UI

1. Sign in to `https://admin.${PROD_HOSTNAME}` as an admin.
2. Navigate to **Feature Flags → Dynamic Configs**.
3. Edit `application_settings`.
4. Toggle `maintenance_mode` → `true`. Save.
5. Open the public site in an incognito window to confirm the
   banner appears (frontend polls every ~30s).

### Via the API (terminal-only fallback)

```bash
# Replace the JSON below with your real admin token + base URL.
ADMIN_TOKEN="..."

# 1. Read the current config so you don't clobber other fields.
curl -sf -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  https://${PROD_HOSTNAME}/api/v1/feature-flags/configs/application_settings \
  | jq

# 2. PATCH only the field you're changing. The exact route shape is
#    in lib.feature-flags / the admin app's services layer — confirm
#    against the admin UI's network tab if uncertain.
curl -sf -X PATCH -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"value":{"maintenance_mode":true}}' \
  https://${PROD_HOSTNAME}/api/v1/feature-flags/configs/application_settings
```

**Always read-then-write.** PUT-ing a fresh body without reading
first will silently wipe `max_applications_per_user`, etc.

## Verify maintenance mode is active

- Hit the public site in an incognito window — maintenance banner is
  visible within 30s.
- `curl -sf https://${PROD_HOSTNAME}/api/v1/feature-flags/configs/application_settings | jq '.value.maintenance_mode'`
  returns `true`.
- Backend logs do **not** show a flood of errors — maintenance mode
  shouldn't be generating its own noise. If they do, the frontends
  aren't honouring it; investigate before assuming traffic is shed.

## Lifting maintenance mode

```bash
# Same as above, with maintenance_mode flipped back.
curl -sf -X PATCH -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"value":{"maintenance_mode":false}}' \
  https://${PROD_HOSTNAME}/api/v1/feature-flags/configs/application_settings
```

Confirm:

- Banner disappears from the public site within 30s.
- A test write path (e.g. submit a saved-pet) succeeds end-to-end.
- Watch `http_requests_total` and error rate for 5 min after
  lifting; surfacing a still-broken dependency immediately after the
  flag flips is a common pattern.

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

## Capture

In the post-incident write-up, record:

- Time maintenance mode was enabled and lifted.
- Who flipped the flag.
- Which dependent flags (`new_registrations_enabled`,
  `ALLOW_BULK_OPERATIONS`) were also touched and whether they were
  restored.

A maintenance flag left on after the incident is the most common
follow-up bug — double-check the config on the morning after.
