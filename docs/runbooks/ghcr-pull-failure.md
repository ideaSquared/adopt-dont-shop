# GHCR Pull Failure Blocking Deploy / Rollback

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** none — this shows up as a **failed workflow run**, not a
> metric. It's dangerous because it blocks the deploy **and** the rollback path
> (both pull from GHCR), so a bad deploy you can't roll back is the worst case.

## Symptoms

- A `deploy.yml` or `rollback.yml` run fails at the image pull / `docker compose
up -d` step with `denied`, `unauthorized`, `manifest unknown`, `not found`, or
  a network error against `ghcr.io`.
- `rollback.yml` fails its **"Verify GHCR_TOKEN scope"** step (ADS-671): the
  token must be `read:packages`-only; `write:packages` / `delete:packages` /
  `repo` scopes are rejected.
- On the host, `docker compose -f docker-compose.prod.yml pull` errors.

## Preconditions

See [`README.md`](./README.md#preconditions): prod SSH, `cd /opt/ads/production`,
`docker compose -f docker-compose.prod.yml`, `gh` on your workstation. Images
live at `ghcr.io/ideasquared/adopt-dont-shop/<service>:<40-char SHA>`; the
workflows authenticate as `ideasquared` with the `GHCR_TOKEN` repo secret.

## Triage in 60 seconds

1. Is it auth, a missing image, or the registry itself? Try the pull on the host:

   ```bash
   docker compose -f docker-compose.prod.yml pull service-gateway
   ```

   Read the error:
   - `unauthorized` / `denied` → token/login problem (step 1 below).
   - `manifest unknown` / `not found` → the SHA's image doesn't exist (step 2).
   - timeout / TLS / DNS → GHCR reachability or a GHCR outage (step 3).

2. Is GHCR itself up? Check `https://www.githubstatus.com/` for a Packages
   incident before assuming it's your token.

## Diagnosis & Mitigation

1. **Auth (`unauthorized`/`denied`).** Re-login on the host with the same token
   the workflow uses, then retry:

   ```bash
   printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u ideasquared --password-stdin
   docker compose -f docker-compose.prod.yml pull service-gateway
   ```

   Expected: `Login Succeeded`, then the pull proceeds. If login fails, the
   token is expired, revoked, or misscoped — it must be `read:packages` (a
   `write:packages` token also makes `rollback.yml` refuse to run). Rotating the
   `GHCR_TOKEN` repo secret is the fix (escalate — see below).

2. **Missing image (`manifest unknown`).** The SHA you're deploying/rolling to
   was never pushed. Confirm what exists:

   ```bash
   docker buildx imagetools inspect \
     ghcr.io/ideasquared/adopt-dont-shop/service-gateway:<40-char SHA>
   ```

   Expected: a manifest. If it 404s, that SHA's build didn't publish — pick a SHA
   from a **successful** `deploy.yml` run (or `cat /opt/ads/production/.last_sha`)
   instead. Only `deploy.yml` publishes prod service images to GHCR.

3. **Registry unreachable.** If GHCR is timing out from the host but githubstatus
   shows green, check host egress to `ghcr.io:443` (firewall / DNS). If GHCR
   itself has an incident, you cannot deploy or roll back until it recovers — the
   running containers keep serving in the meantime (**do not** `docker compose
down`, which would need a pull to come back up).

## Verify

- `docker compose -f docker-compose.prod.yml pull` completes with no error.
- Re-run the failed `deploy.yml` / `rollback.yml` and it passes the pull step.
- `docker compose -f docker-compose.prod.yml images` shows the intended SHA.

## Rollback

Nothing here changes running state until a pull succeeds, so there is nothing to
undo. The hazard is the opposite: **do not stop running containers** while pulls
are failing — a stopped service can't be recreated without a working pull.

## Escalate

If the `GHCR_TOKEN` needs rotating (expired/revoked/misscoped) or GHCR has an
active incident during a live regression you need to roll back, DM the secondary
on-call immediately — a broken pull path means the normal rollback is
unavailable. Hand over the exact error and the SHA involved.

## Capture

- The failed workflow run URL and the pull error text.
- `docker compose -f docker-compose.prod.yml images` output (what's currently
  running).

## Related

- [`deploy-rollback.md`](./deploy-rollback.md) — the rollback this failure blocks.
- [`../operations/deploy.md`](../operations/deploy.md) — the deploy pipeline and
  GHCR token scoping.
