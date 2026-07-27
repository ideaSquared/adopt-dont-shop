# Troubleshooting the dev stack (ADS-955)

Symptom → diagnosis → fix for the Docker dev stack (`pnpm docker:dev`).
Unlike the rest of `docs/runbooks/` (production on-call playbooks), this one
is for **local development** — no prod host, no PagerDuty. If you hit a
failure mode not covered here, add it once you've solved it (see
"Contributing to this doc" at the bottom).

Background reading: [`docs/DOCKER.md`](../DOCKER.md) for architecture, and
`scripts/docker-dev.mjs` for the exact preflight `pnpm docker:dev` runs
before bringing the stack up.

## Index

| Symptom | Jump to |
| --- | --- |
| Hangs at "Checking Postgres data volume" / "waiting for database to be healthy" | [1](#1-pnpm-dockerdev-hangs-checking-the-database) |
| A `service-*` container is stuck `Restarting` — migrations | [2](#2-service--stuck-restarting--migrations-havent-run-or-failed) |
| A `service-*` container restart-loops right after `nats` comes up | [3](#3-service--restart-loops-when-nats-isnt-ready-yet) |
| `502 Bad Gateway` from `http://localhost` | [4](#4-502-bad-gateway-from-nginx-at-httplocalhost) |
| `pnpm docker:dev` fails/warns about Redis port 6379 on Windows | [5](#5-windows-redis-host-port-6379-is-reserved) |
| Postgres rejects the current `.env` password | [6](#6-postgres-volume-rejects-the-current-env-password) |
| A new/updated dependency isn't showing up in the container | [7](#7-dockerdev-never-picks-up-a-new-dependency) |
| TS errors: `@adopt-dont-shop/lib.*` has no exported member … | [8](#8-type-checker-complains-about-adopt-dont-shoplib-missing-exports) |
| Editing a `lib.*` package doesn't hot-reload the browser | [9](#9-hmr-not-firing-after-editing-a-lib-package) |
| `.env` is missing a required var | [10](#10-env-missing-a-required-var) |
| Playwright can't connect to `localhost:3000` / `http://localhost` | [11](#11-playwright-cant-connect-to-the-app-url) |
| `docker:dev:build` needed after a lockfile change | [12](#12-lockfile-changed-but-the-dev-image-is-stale) |

---

### 1. `pnpm docker:dev` hangs "Checking the database"

**Diagnosis.** `scripts/docker-dev.mjs`'s `checkPostgresVolume()` step starts
`database` alone and polls it with a real `psql` login (up to 15 attempts,
1s apart) before bringing up the rest of the stack. If Postgres itself never
becomes healthy, this loop can look like a hang.

```bash
docker compose ps database
docker compose logs database --tail=50
```

**Fix.**

- If `database` shows `unhealthy` / keeps restarting, check the log for
  `FATAL` — usually a corrupted volume from an interrupted previous run.
  `pnpm docker:reset` (destroys the DB) is the reliable fix if this isn't
  production data you care about.
- If `database` is healthy but `psql` auth keeps failing, see
  [#6](#6-postgres-volume-rejects-the-current-env-password) below — that's
  the same script, just a different branch of it.

---

### 2. `service-*` stuck `Restarting` — migrations haven't run or failed

**Diagnosis.** In dev, `docker-compose.dev.yml` chains each schema-owning
service's command as
`db:migrate --if-present && db:seed --if-present && dev`. Every part of
that chain must succeed with exit code 0 for the container to reach `dev`
and start serving `/health/simple` — Docker's healthcheck can't help if the
process exits before the server even binds. A failed migration crashes the
container, and `restart: unless-stopped` (set in the base `docker-compose.yml`)
keeps retrying it forever.

```bash
docker compose ps                       # look for "Restarting" next to a service-* row
docker compose logs service-auth --tail=100   # substitute the actual failing service
```

**Fix.**

- Read the migration error in the log — usually a syntax error in a new
  migration file, or a migration that assumes state from a previous one
  that never ran.
- If a migration is genuinely broken, fix it (see
  [`docs/backend/writing-migrations.md`](../backend/writing-migrations.md))
  and restart just that service:
  ```bash
  docker compose restart service-auth
  ```
- If the schema is in an unrecoverable half-migrated state locally,
  `pnpm docker:reset && pnpm docker:dev:detach` re-initialises from scratch
  (every service re-migrates on a fresh volume).

---

### 3. `service-*` restart-loops when NATS isn't ready yet

**Diagnosis.** Every extracted service `depends_on: nats: condition:
service_healthy`, so Compose won't *start* a service until `nats`'s own
healthcheck (`GET :8222/healthz`) passes. But JetStream can report the HTTP
healthz endpoint healthy microseconds before it's actually ready to accept
a client connection — a service that connects at that exact window can
crash on boot and restart-loop briefly until NATS settles (usually a few
seconds, not minutes).

```bash
docker compose logs nats --tail=50
docker compose logs service-chat --tail=50   # or whichever service is looping
```

**Fix.**

- If it self-resolves within ~30s (watch `docker compose ps` — the restart
  count should stop climbing), this was the startup race — no action needed.
- If it does **not** self-resolve, `nats` itself is the problem, not the
  race: check `docker compose logs nats` for a JetStream storage error
  (commonly a corrupted `nats_data` volume). Reset just that volume:
  ```bash
  docker compose down nats
  docker volume rm $(docker volume ls -q --filter name=nats_data)
  docker compose up -d nats
  ```

---

### 4. `502 Bad Gateway` from nginx at `http://localhost`

**Diagnosis.** nginx (`profiles: proxy, full`) proxies to `app-client` /
`app-admin` / `app-rescue` and, via `/api`, to `service-gateway`. Frontend
app containers have a 40s `start_period` on their healthchecks — on a cold
start (first `pnpm docker:dev`, or right after `docker:dev:build`), nginx
can come up and start accepting connections before the upstream app has
finished its first Vite build.

```bash
docker compose ps app-client app-admin app-rescue service-gateway nginx
docker compose logs nginx --tail=50
```

**Fix.**

- If the upstream containers are still `starting` (not yet `healthy`),
  wait — this resolves itself once the first Vite build finishes (~10-30s
  depending on machine).
- If an upstream is `unhealthy` or exited, that's the real problem — check
  its own logs (`docker compose logs app-client`) rather than chasing the
  502 at the nginx layer.
- If everything is healthy but nginx still 502s, the nginx config may be
  stale from a volume mount issue — `docker compose restart nginx`.

---

### 5. Windows: Redis host port 6379 is reserved

**Diagnosis.** `pnpm docker:dev`'s preflight (`checkRedisPort()` in
`scripts/docker-dev.mjs`) detects this automatically on Windows and fails
fast with the fix — but if you're diagnosing it manually:

```bash
netsh interface ipv4 show excludedportrange protocol=tcp
```

If `6380` (or whatever `REDIS_HOST_PORT` currently resolves to) falls
inside a listed range, the Hyper-V/WSL2 dynamic port allocator owns it.

**Fix.** Set a free host port in `.env` (the preflight suggests one) and
re-run:

```env
REDIS_HOST_PORT=6390
```

```bash
pnpm docker:dev
```

This only affects **host-side** access to Redis (e.g. `redis-cli` from
Windows). Every service talks to Redis over the Docker network at
`redis:6379` regardless and is unaffected.

---

### 6. Postgres volume rejects the current `.env` password

**Diagnosis.** Postgres only sets its superuser password on first volume
init. If `POSTGRES_PASSWORD` changes in `.env` after that (e.g. you pulled
a teammate's `.env.example` update, or ran `pnpm secrets:generate` again),
the existing `postgres_data` volume still authenticates with the *old*
password and every service crash-loops on
`password authentication failed for user`.

`pnpm docker:dev`'s preflight already detects and prompts for this — if
you're past that prompt or diagnosing manually:

```bash
docker compose exec -e PGPASSWORD="$POSTGRES_PASSWORD" database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'select 1'
```

A non-zero exit / `password authentication failed` confirms the mismatch.

**Fix.** Wipe and re-initialise the volume (destroys local dev data):

```bash
pnpm docker:reset
pnpm docker:dev:detach     # each service re-migrates on the fresh volume
pnpm db:seed               # optional — reload dev seed data
```

If you don't want to lose local data, instead change `POSTGRES_PASSWORD`
back to whatever the volume was actually initialised with.

---

### 7. `docker:dev` never picks up a new dependency

**Diagnosis.** The dev stack bakes one shared image (`Dockerfile.dev`) with
a full `pnpm install` at build time; source is bind-mounted for HMR but
`node_modules` is **not** — it comes from the image via anonymous volumes
(see the top of `docker-compose.dev.yml`). Adding a dependency to any
`package.json` only changes source on disk; the baked `node_modules` inside
the image is unaffected until the image rebuilds.

```bash
docker compose exec app-client sh -c "ls node_modules/<new-package> 2>/dev/null || echo MISSING"
```

**Fix.** Force a rebuild of the shared dev image:

```bash
pnpm docker:dev:build
```

`scripts/docker-dev.mjs` also does this automatically whenever it detects
`pnpm-lock.yaml` or `Dockerfile.dev` changed since the last run (hashed
into `.turbo/.docker-dev-state.json`) — this manual step is for the rare
case that detection misses (e.g. you edited the lockfile outside git).

---

### 8. Type checker complains about `@adopt-dont-shop/lib.*` missing exports

**Diagnosis.** `lib.types` is special-cased: instead of Vite watch, a
sidecar container (`lib-types-watcher`) runs `tsc --watch` and writes to
`packages/lib.types/dist/`. Every other package (including the backend
services, which import `lib.types` via its built `dist/`, not source)
depends on that sidecar staying up. If it crashed, exited, or was never
started (e.g. you brought up a partial profile), consumers see stale or
missing exports.

```bash
docker compose ps lib-types-watcher
docker compose logs lib-types-watcher --tail=50
```

**Fix.**

```bash
docker compose up -d lib-types-watcher
```

If it's up but `dist/` looks stale, a `tsc --watch` process can wedge on a
large batch of simultaneous file changes (e.g. a branch switch) — restart it:

```bash
docker compose restart lib-types-watcher
```

---

### 9. HMR not firing after editing a `lib.*` package

**Diagnosis.** Two different mechanisms depending on which lib:

- `lib.types` — see [#8](#8-type-checker-complains-about-adopt-dont-shoplib-missing-exports); it's a `dist/` rebuild, not Vite HMR, and the
  consuming app only picks it up once `tsc --watch` finishes writing.
- Every other `lib.*` — Vite aliases point straight at that package's
  `src/`, so editing it should hot-reload like editing the app's own
  source. If it doesn't, this is usually the general polling issue: see
  [`docs/DOCKER.md#slow--no-file-watching-windowsmacos`](../DOCKER.md#slow--no-file-watching-windowsmacos).

```bash
docker compose exec app-client env | grep CHOKIDAR    # macOS/Windows should show USEPOLLING=true
```

**Fix.** On macOS/Windows, confirm the polling vars made it into `.env`
(`pnpm bootstrap` writes them per-host — see ADS-766); on Linux this should
never be the cause since native inotify is used. If polling is already
correct and HMR still doesn't fire, check the Vite dev server logs for the
app in question (`docker compose logs app-client`) for a "file watcher
limit reached" style error.

---

### 10. `.env` missing a required var

**Diagnosis.** This happens when `.env` was hand-created (copied from
`.env.example`) instead of going through `pnpm bootstrap`, which auto-generates
the application secrets. `pnpm docker:dev`'s preflight checks a subset of
these (`POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`,
`GF_SECURITY_ADMIN_PASSWORD`) and fails fast with the missing key names.
For the full required set:

```bash
pnpm validate:env
```

**Fix.**

```bash
pnpm bootstrap       # safe to re-run; only fills placeholder values, never overwrites real ones
# or, narrower:
pnpm secrets:generate >> .env
```

See [`docs/env-reference.md`](../env-reference.md) for what every variable
does and whether it's required.

---

### 11. Playwright can't connect to the app URL

**Diagnosis.** `e2e/` runs against a **fully up** Docker stack — it does
not start one for you. A connection-refused error almost always means the
stack (or the specific app under test) isn't running yet, not a Playwright
config problem.

```bash
docker compose ps
curl -fsS http://localhost/health
```

**Fix.**

```bash
pnpm docker:dev:detach   # start the stack in the background first
pnpm test:e2e            # then run the suite
```

If the stack is up but one app is still `unhealthy`/`starting`, wait for it
— see [#4](#4-502-bad-gateway-from-nginx-at-httplocalhost) if it's stuck.

---

### 12. Lockfile changed but the dev image is stale

**Diagnosis.** Same root cause as [#7](#7-dockerdev-never-picks-up-a-new-dependency) but from the other
direction — you pulled a branch/rebased and `pnpm-lock.yaml` changed
upstream, but your locally running containers are still on the old image.
`pnpm docker:dev` detects this automatically via a hash of
`pnpm-lock.yaml` + `Dockerfile.dev` and rebuilds (or pulls the prebuilt
GHCR image) before starting — if you're not going through that entry
point, or want to force it:

```bash
pnpm docker:dev:build
```

---

## Contributing to this doc

Hit a failure mode not listed here? Add a symptom → diagnosis → fix entry
once you've solved it — the point of this doc is that the next person
doesn't have to re-derive the fix from `docker-dev.mjs` and
`docker-compose.dev.yml` from scratch.
