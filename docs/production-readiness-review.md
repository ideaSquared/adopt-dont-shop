# Production Readiness Review — Adopt Don't Shop

**Date:** 2026-08-04
**Scope:** Full monorepo — Fastify gateway + 10 gRPC microservices, 3 React/Vite SPAs, ~40 shared packages (~1,400 source files, 708 Vitest + 51 Playwright specs).
**Method:** Read-only review across seven dimensions (security/auth, config/secrets, reliability/observability, database/migrations, CI/CD/infra, testing, frontend). Load-bearing findings were independently verified against the code; each is cited with `file:line`.

---

## Verdict

**The application is well-engineered and security-mature; it is not yet operationally production-ready.**

The codebase shows exceptional discipline: zero skipped/`.only` tests, ~1 `@ts-ignore` and 6 TODOs in non-test source, parameterized SQL throughout, pinned JWT algorithms with refresh-token family reuse detection, signed internal principal tokens with a single central enforcement choke point, strict edge CSP/HSTS, cosign-signed SHA-pinned images, and file-mounted Docker secrets. The **security review found no CRITICAL or HIGH issues**.

The blockers are almost entirely in **runtime resilience, observability, database capacity, backups, and deployment mechanics** — the parts that decide whether the system survives its first Postgres restart, its first bad deploy, and its first incident-at-3am. Two of these are code-level and cheap to fix; the rest are infrastructure decisions that should be made and documented deliberately before go-live.

---

## Priority summary

| #   | Severity    | Finding                                                                                                                                    | Theme           |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| 1   | 🔴 Critical | Idle DB-pool errors crash every service; no `uncaughtException`/`unhandledRejection` handlers                                              | Reliability     |
| 2   | 🔴 Critical | No observability stack deployed in prod/staging — the system runs blind                                                                    | Observability   |
| 3   | 🟠 High     | Postgres connection ceiling reached at baseline; horizontal scaling impossible                                                             | Database        |
| 4   | 🟠 High     | Backups are logical-only, unverified, no PITR; restore never proven                                                                        | Database        |
| 5   | 🟠 High     | Migrations auto-run on boot; non-concurrent index builds cause deploy-time write outages                                                   | Database/Deploy |
| 6   | 🟠 High     | In-place single-replica deploy on a single host; health-checked after cutover, no auto-rollback                                            | Deploy/HA       |
| 7   | 🟠 High     | Health checks are liveness-only — never verify DB/Redis/NATS                                                                               | Reliability     |
| 8   | 🟠 High     | The "single source of truth" env validator never runs at boot or deploy                                                                    | Config          |
| 9   | 🟠 High     | Commit-then-publish dual-write with no outbox → terminal events can be lost                                                                | Database/Events |
| 10  | 🟠 High     | Coverage gate is 0% on auth/applications/gateway; no `.only` guard                                                                         | Testing         |
| 11  | 🟡 Medium   | Internal gRPC is plaintext; header-trust fallback only fails closed on exact `NODE_ENV=production`                                         | Security        |
| 12  | 🟡 Medium   | Gateway graceful shutdown has no deadline — deploys can hang until SIGKILL                                                                 | Reliability     |
| 13  | 🟡 Medium   | Alert rules inert, DLQ/cron/job failures unmetered, backend Sentry dead code                                                               | Observability   |
| 14  | 🟡 Medium   | Supply-chain gaps: Trivy PR blind spot, unsigned personal Docker Hub push, `secrets/` not in `.dockerignore`                               | CI/CD           |
| 15  | 🟡 Medium   | Native pg enums, duplicate `users.email` unique index, cross-service N+1, unbounded ledger                                                 | Database        |
| 16  | 🟡 Medium   | a11y linting disabled; non-null-assertion rule unenforced; container CSP `connect-src` broad                                               | Frontend        |
| 17  | 🟡 Medium   | Dead config knobs mislead operators: `METRICS_AUTH_TOKEN`, `DEBUG_ERRORS`, `FORCE_SEED`, read-replica routing                              | Config          |
| L   | 🔵 Low      | `/openapi.json` public; register-token body fragility; DevLoginPanel ships in bundle; hardcoded prod API fallback; `no-debugger` is `warn` | Various         |

---

## Critical

### 1. Idle DB-pool errors crash every service; no top-level exception handlers

`packages/db/src/client.ts:46-64` — `buildPool` attaches only a `'connect'` listener, never a persistent `pool.on('error', …)`. A grep across `services/`, `packages/`, and `apps/` finds **zero** `process.on('uncaughtException')` / `process.on('unhandledRejection')` handlers.

`pg.Pool` emits an `'error'` event on an **idle** pooled client whenever the backend connection drops — Postgres failover, restart, idle-connection reap, or a brief network partition, all routine in production. With no listener, Node re-throws it as an unhandled `'error'`; with no `uncaughtException` handler, the process terminates. Under `restart: always` (`docker-compose.prod.yml`) this becomes a **crash-loop on every Postgres blip**, with no graceful drain of in-flight work and no structured log of the cause. Every one of the 10 data-owning services is exposed.

**Fix (small, high-leverage):** In `buildPool`, always `pool.on('error', err => logger.error('idle client error', { err }))`. Add `uncaughtException`/`unhandledRejection` handlers in `packages/service-bootstrap` (invoked from each `main()`) that log with context, run `runServiceShutdown`, and exit non-zero.

### 2. No observability stack in production or staging — the system runs blind

`docker-compose.prod.yml` and `docker-compose.staging.yml` contain **no** Prometheus, Grafana, Loki, promtail, OTel collector, or Alertmanager (these exist only in dev `docker-compose.yml` behind `--profile observability`). `LOKI_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`, and `SENTRY_DSN` are unset in both prod and staging.

Consequently the (well-built) instrumentation has nothing to run against: metrics are scraped by nothing, the OTel SDK no-ops (`packages/observability/src/opentelemetry.ts:59-64`), the Loki transport ships nothing (`logger.ts:86-107`), Prometheus alert rules are never evaluated, and backend Sentry is never initialized (`packages/observability/src/sentry.ts` — no caller). During an incident there is no telemetry, no dashboards, and no paging.

**Caveat:** this is conclusive only if there is no managed/out-of-band provider (Grafana Cloud, Datadog, etc.). Nothing in the repo documents one. **Fix:** deploy or point at managed Prometheus + Alertmanager + Loki + an OTLP collector; set the endpoints in the deploy env; if managed telemetry already exists, document it.

---

## High

### 3. Postgres connection capacity is at the ceiling at baseline; scaling is impossible

`packages/db/src/client.ts:46-47` — `buildPool` sets no pool `max`, so `node-pg` defaults to **10 per pool**. Ten DB-owning services × 10 = **100 connections at saturation**, exactly Postgres's default `max_connections=100` (97 usable after reserved). Prod Postgres has no `max_connections` tuning (verified: the `command:` entries in `docker-compose.prod.yml` belong to Redis/NATS, not Postgres) and there is **no pgbouncer**. Scaling any single service to 2 replicas adds 10 connections and guarantees `FATAL: sorry, too many clients already`. Backups and migrations each need their own connection on top.

**Fix:** set an explicit per-service pool `max` from a connection budget (`Σ services × max × replicas < max_connections − reserved`); raise Postgres `max_connections` with matched `shared_buffers`; introduce pgbouncer (transaction pooling) before any replica scale-out.

### 4. Backups are logical-only, unverified, retention is cosmetic, and PITR is absent

`scripts/snapshot-postgres.sh`, `.github/workflows/backup.yml`, `docs/operations/snapshot-policy.md`:

- **RPO up to ~24h** — a single daily `pg_dump` at 02:00 UTC, no WAL archiving / PITR (explicitly out of scope, ADS-443).
- **Restorability never proven** — the script validates only that the dump is `> 1024` bytes (`snapshot-postgres.sh:37`); there is no automated restore test, and the monthly restore-drill log the policy _requires_ (`docs/operations/restore-drills.md`) **does not exist** (verified absent).
- **Retention not enforced** — `--metadata "Retention=30d"` is a cosmetic S3 tag, not a lifecycle rule or Object Lock; nothing expires or protects the dumps from deletion.

**Fix:** add WAL archiving + base backups (pgBackRest/wal-g) for PITR; add an automated restore-verification job (restore latest dump to a throwaway DB, assert row counts / schema diff); configure an S3 lifecycle policy + Object Lock; start recording restore drills.

### 5. Migrations run coupled to app boot; non-concurrent index builds cause deploy-time write outages

Migrations run in-band on container **start** (`Dockerfile.service:157`) under `restart: always`, with no gated pre-deploy migration step. Across all services there are **zero** `CONCURRENTLY` index builds and zero `disableTransaction` — later-migration index adds on already-populated hot tables use plain `CREATE INDEX`, e.g. `services/pets/src/migrations/007_pets_list_keyset_index.ts:18`, `services/audit/src/migrations/006_add_aggregate_keyset_index.ts:12`, `services/matching/src/migrations/004_swipe_actions_user_pet_recency_idx.ts`, `services/notifications/src/migrations/009_device_token_global_unique.ts:42`.

Plain `CREATE INDEX` takes a `SHARE` lock that **blocks all writes** for the full build on `swipe_actions`/`messages`/`audit_events`/`notifications`. Because migrations run on boot, that write-outage happens automatically during deploy and can overrun the 60s healthcheck `start_period` → failed health → `restart: always` crash-loop. Separately, `rollback.yml` re-pulls old **images** but never down-migrates the DB, so a forward-migrated schema cannot be reverted by rollback.

**Fix:** build post-creation indexes with `CREATE INDEX CONCURRENTLY` in a `noTransaction` migration; run migrations as a discrete, health-gated pre-deploy step (one runner), not per-replica on boot; enforce expand/contract (backward-compatible) migrations so old and new code coexist during rollout.

### 6. In-place, single-replica deploy on a single host with post-cutover health checks

`deploy.yml:706` runs `docker compose up -d`, which recreates every changed container in place. There are **no `replicas:`** in `docker-compose.prod.yml` — one replica per service, one Postgres, one Redis, one NATS, all on one host. So every deploy has a downtime window and every component is a single point of failure. Health checks (`deploy.yml:713-740`) run **after** cutover; on failure the workflow simply exits, leaving a half-updated, unhealthy stack with **no automatic rollback** to `.last_sha`.

**Fix:** adopt a start-first/blue-green or orchestrated rolling strategy (`replicas > 1`, `order: start-first`), add automatic rollback-on-failed-health, and add DB replication/redundancy — or explicitly accept and document the SPOF with an RTO/RPO and deploy in maintenance windows.

### 7. Health checks are liveness-only — they never verify downstream dependencies

`packages/service-bootstrap/src/server.ts:58-63` — `/health/simple` returns 200 once a one-way `grpcReady` boolean is set at boot (never reset). The gateway is worse: `services/gateway/src/server.ts:428-432` returns a hard-coded 200. This endpoint is both the Docker healthcheck and the `depends_on: service_healthy` gate, so a service that has lost its DB pool, NATS, or Redis stays reported healthy, keeps taking traffic, and is never restarted. `docs/observability-alerting.md` documents a dependency-aware `/health/ready` that **does not exist** in the microservices.

**Fix:** add a real `/health/ready` (`SELECT 1` with a short timeout, NATS `isClosed()`, Redis `ping`) and point the orchestrator readiness gate at it; keep `/health/simple` as pure liveness.

### 8. The shared env validator never runs at boot or deploy — its production hardening is dead

`packages/lib.validation/src/schemas/env.ts` is documented as the "single source of truth … consumed by the service.backend startup validator." That consumer was deleted with the monolith; `validateEnv` is now imported **only** by the CLI (`scripts/validate-env.ts`) and its own test — **no service boot path imports it** (verified), and `deploy.yml` never runs `pnpm validate:env`. So every production check in `productionOnlyCheck()` — placeholder rejection, distinct-secret pairs, `CORS_ORIGIN` wildcard rejection, prod-required vars — is unenforced at runtime. Worse, the schema still validates the deleted monolith's contract (`DB_HOST`/`DB_USERNAME`/`SESSION_SECRET`) while services actually consume `DATABASE_URL` and `*_FILE` Docker secrets, so running it against a real prod env would **false-fail on correctly configured secrets**.

The actual boot checks (`packages/config-secrets` `requireSecret`/`requireHexSecret`, per-service `config.ts`) are weaker: they enforce length/hex but have **no placeholder check** and **no distinct-secret check**, so a `CHANGE_THIS…`-style JWT/session secret (which exceeds 32 chars) would boot cleanly.

**Fix:** rewrite the schema against the live contract (`DATABASE_URL`/`_FILE`-aware, per-service secrets), then call it from `service-bootstrap` at startup (fail-fast) and add it as a `deploy.yml` gate. Add placeholder + distinct-secret refiners to `config-secrets`.

### 9. Commit-then-publish dual-write with no outbox — terminal events can be silently lost

`packages/events/src/publish.ts:58-96` — `withTransaction` `COMMIT`s, then `publishStaged` emits to JetStream **after** commit. There is **no outbox table** (verified: 0 references). If the process dies between COMMIT and the JetStream ack, the DB write is durable but the event is lost forever. For terminal, non-replayed side-effects this is silent divergence — e.g. `applications.approved` commits but the notification is never created, the `audit_events` row is never written, moderation scan never runs.

**Fix:** add a transactional outbox (write event rows in the same transaction; a relay publishes and marks them sent) or CDC. At minimum, document the lost-event window and add a reconciliation job.

### 10. Coverage is gated at 0% on the highest-risk services; no `.only` guard

`coverage-thresholds.json` does not exist and `sharedServiceConfig` sets no `thresholds`, so services fall back to a 0% floor. **Only `chat` and `cms` declare thresholds** — `auth`, `applications` (the adoption flow), `gateway` (the REST/WS edge), `pets`, `rescue`, `moderation`, `audit`, `notifications`, `matching` gate at 0% (deliberate per `ci.yml:338-342`). These services _are_ tested, but coverage can regress toward zero without failing CI, and this contradicts the repo's stated "100% coverage at all times." Separately, no Vitest config sets `allowOnly: false` and there is no `no-only-tests`/`eslint-plugin-vitest` rule, so a stray `it.only` would silently disable its file's siblings and still pass CI (Playwright is protected via `forbidOnly: CI` — the asymmetry is the tell). None exist today; it's a latent gap.

**Fix:** ratchet per-service floors (start auth/applications/gateway) via the existing `scripts/ratchet-coverage.mjs`; set `allowOnly: false` in `vitest.shared.config.ts`.

---

## Medium

### 11. Internal gRPC is plaintext; header-trust fallback keyed on exact `NODE_ENV`

All services bind `ServerCredentials.createInsecure()` (`packages/service-bootstrap/src/grpc-server.ts:45-47`) and clients dial insecure — service-to-service traffic, **including `AuthService.Login` requests carrying plaintext passwords** and PII, is cleartext. Identity integrity is protected by the HMAC-signed `x-principal-token`, but confidentiality and peer authenticity are not. Mitigated by network isolation (prod uses `expose:`, not `ports:` — verified), so this is defense-in-depth, but any foothold on the internal network can sniff credentials.

Compounding it: `assertPrincipalVerificationConfig` (`packages/service-bootstrap/src/principal.ts:36-59`) only fails closed when `NODE_ENV === 'production'` **exactly**. A staging deploy running `NODE_ENV=staging` without `PRINCIPAL_SIGNING_KEY` would fall back to trusting unsigned `x-user-*` headers — and combined with plaintext gRPC, any internal actor could forge `x-user-roles: admin`. The `ALLOW_UNSIGNED_PRINCIPAL=true` escape hatch is a second way to disable verification.

**Fix:** move inter-service channels to mTLS (or document + enforce strict network segmentation); broaden the boot guard to "any deployed env that isn't development/test"; verify `PRINCIPAL_SIGNING_KEY` is mounted in staging and `ALLOW_UNSIGNED_PRINCIPAL` is never set.

### 12. Gateway graceful shutdown has no deadline

`services/gateway/src/index.ts:166-193` hand-rolls its shutdown (io.close → redis → `server.close()` → `nats.drain()` → gRPC clients) with **no timeout race**, unlike every microservice which uses `runServiceShutdown` (25s deadline → `process.exit(1)`). The gateway is the one process handling public HTTP _and_ long-lived WebSockets; `io.close()`/`server.close()` can block indefinitely, so a rollout can hang until the orchestrator SIGKILLs it, dropping connections. **Fix:** wrap the gateway teardown in the same deadline-race pattern.

### 13. Alerting and background-job failures are unobservable

- Prometheus **`rule_files:` is commented out** (`observability/prometheus/prometheus.yml:5-8`), the rules dir isn't mounted, and no Alertmanager exists in any compose — every alert rule is inert.
- The DLQ (`packages/events/src/subscribe.ts:199-213`) publishes poison messages with **no metric and no alert**; nothing consumes or measures DLQ depth (a GDPR-saga correctness risk).
- The notifications cron scheduler has no cross-instance locking (`scheduler.ts:10-14`) — running >1 replica sends **duplicate weekly-digest emails** to every user.
- Job/email-worker failures only log; no `*_failures_total` counters (`scheduler.ts:86-91`, `email/worker.ts:114-152`).
- `service-chat` (:5006) and `service-cms` (:5010) are missing from the scrape config.

**Fix:** load the rules + deploy Alertmanager; add DLQ/job/email failure counters and alerts; add a `FOR UPDATE SKIP LOCKED` scheduled-run claim before scaling notifications; add chat/cms scrape jobs.

### 14. Supply-chain and image gaps

- **Trivy PR blind spot:** the image CVE gate (`docker.yml`) triggers only on Dockerfile/compose changes, so a source- or dependency-only PR that pulls a HIGH CVE into an image is not image-scanned pre-merge; `deploy.yml` builds the deployed images and never Trivy-scans them.
- **Parallel unsigned publish:** `release.yml` pushes prod images to a **personal Docker Hub account** (`paragonjenko/adoptdontshop`) with long-lived creds and **no cosign signing** — a confusing second supply chain alongside the signed GHCR images that deploy actually pulls.
- **`secrets/` not in `.dockerignore`** — harmless in CI (dir holds only README) but `deploy.yml` materializes real secret files there on the host; a local build would bake them into an image layer.
- **CodeQL is advisory** (no fail-on-severity in-workflow) and its config still excludes `js/missing-csrf-middleware` / `js/missing-token-validation` with justifications referencing the **deleted** `service.backend` — those excludes may now mask real findings in the extracted services.
- **Renovate auto-merges** devDependency minor/patch on green CI with no cool-down.

**Fix:** run Trivy on all PRs and in `deploy.yml`; consolidate on signed GHCR images and retire/org-scope the Docker Hub path; add `secrets/` to `.dockerignore`; add a CodeQL severity gate and re-audit the stale excludes; add a Renovate `minimumReleaseAge`.

### 15. Database modeling and query hazards

- **Native pg enums** in ~35 migrations (e.g. `services/pets/src/migrations/002_create_pets.ts:41-48`) — `ALTER TYPE … ADD VALUE` can't run in a transaction, and code/DB enum drift fails INSERTs at runtime. The team already chose the safer `varchar + CHECK` in `rescue/008` but applied it inconsistently.
- **Duplicate unique index on `users.email`** (`services/auth/src/migrations/001_create_users.ts:45` and `:92`), and the constraint isn't partial on `deleted_at`, so a soft-deleted user's email blocks re-registration.
- **Cross-service N+1** in `services/matching/src/grpc/top-picks-handlers.ts:197-205` (one `getRescueName` gRPC call per rescue; no batch RPC).
- **`processed_events` idempotency ledger** has no pruning and is adopted by only one service (`packages/events/src/idempotency.ts`) — unbounded growth on a hot insert path.

**Fix:** standardize evolvable statuses on `varchar + CHECK` and add a DB↔code enum CI check; drop the duplicate email index and decide soft-delete semantics; add a batch `getRescueNames` RPC; add a retention job for `processed_events`.

### 16. Frontend quality-gate erosion

- **a11y linting is disabled** (`packages/eslint-config-react/index.js:6` — jsx-a11y removed pending eslint-10 support, which now exists), so alt-text/label/ARIA regressions are invisible despite a shipped `accessibility` skill.
- **No `no-non-null-assertion` rule** despite the mandate — ~50-60 hand-written `!` in prod code (hotspot `services/gateway/src/routes/users.ts`, all on proto response fields).
- **Container-baked CSP `connect-src 'self' wss: https:`** (`Dockerfile.app`) is far broader than the proxy layer's pinned policy; if an app container is ever served without the outer proxy, it permits exfiltration to arbitrary origins.
- **App coverage floors are low** for user-facing flows (rescue 40% lines, client 57%).

**Fix:** re-enable jsx-a11y (or add axe to e2e); add `@typescript-eslint/no-non-null-assertion`; tighten the container CSP to match the proxy; ratchet app floors upward.

### 17. Dead config that misleads operators

Several documented knobs read by nothing: `METRICS_AUTH_TOKEN` (declared in the env schema, referenced nowhere — `/metrics` is unauthenticated, protected only by nginx `deny all`), `DEBUG_ERRORS` (zero runtime reads — the `.env.example`/docs claim that it "refuses to boot in production" is fictional; the gateway error handler never leaks raw errors regardless, so posture is fine but the promise is false), `FORCE_SEED` (zero reads), and read-replica routing (`packages/db/src/client.ts:66-85` — no service loads `READ_DATABASE_URL`, so `.read` always hits the primary). **Fix:** wire each to real behavior or remove it from schema/docs/`.env.example`.

---

## Low

- **`/openapi.json` is public** (`services/gateway/src/server.ts:423`) — full REST surface disclosed for recon (`/docs` UI is admin-gated). Accepted in comments; gate it if external SDK generation doesn't require it.
- **`/auth/register` token-body fragility** (`services/gateway/src/routes/auth.ts:565`) — unlike login (hardened under ADS-919), register relies on Fastify schema serialization to drop the token pair from the JSON body rather than explicitly destructuring it; a future schema "fix" could reintroduce the token-in-body leak. Mirror login's `setAuthCookies` + explicit strip.
- **DevLoginPanel ships in the prod bundle** (runtime-gated via `isDev()`, not build-time stripped) — safe under `vite build`, but prefer `{import.meta.env.DEV && <DevLoginPanel/>}` for provable elimination.
- **Hardcoded prod API fallback** `https://api.adoptdontshop.com` (`packages/lib.utils/src/env.ts:35`) when `VITE_API_BASE_URL` is unset.
- **`no-debugger` is `warn`, not `error`** (`packages/eslint-config-base/index.js:35`).
- **Rate limiting degrades to per-replica in-memory on Redis outage** (`skipOnError: true`) — weakens brute-force protection during a Redis incident precisely when it's needed; consider failing closed for the auth surface and alert on the existing degraded-store warning.
- **OFFSET pagination on admin list endpoints** and an unbounded `SELECT * FROM auth.ip_rules` (`services/auth/src/grpc/admin-handlers.ts:729`) — fine at current admin scale.

---

## What's already strong (verified — no action needed)

- **Security:** HS256 pinned on sign _and_ verify (no `alg:none`), refresh-token rotation with family reuse detection + `jti` denylist + per-user revocation watermark, refresh tokens stored only as SHA-256 hashes, HttpOnly/Secure/SameSite cookies, double-submit CSRF with `timingSafeEqual`, parameterized SQL everywhere (the sole interpolated identifier comes from a hardcoded allowlist), upload MIME+extension+magic-byte+dimension checks with SVG forced to attachment, WS handshake token validation + periodic revocation re-check, signed internal principal tokens enforced at a single central choke point (`adapter.ts`), boot guard that fails closed without `PRINCIPAL_SIGNING_KEY` in production.
- **Resilience code:** per-call gRPC 5s deadlines, circuit breaker + jittered retry/backoff (idempotent RPCs only), durable JetStream consumers with `max_deliver`/DLQ/poison-`term()`, `FOR UPDATE SKIP LOCKED` email worker, fail-fast pool timeouts, pagination hard-capped at 100, request-ID propagation via AsyncLocalStorage over HTTP + gRPC, 25s shutdown deadline in the services.
- **CI/CD:** `ci-required` aggregator gates on tests/lint/type-check/build/e2e; every GitHub Action is 40-char-SHA-pinned; base images digest-pinned; cosign keyless signing with a pre-deploy verify gate; non-root/read-only/`cap_drop: ALL`/`no-new-privileges` containers; file-mounted Docker secrets; `DEPLOY_SHA` fail-closed pinning; strict edge nginx (TLS 1.2/1.3, HSTS preload, full CSP with no `unsafe-inline`, `/metrics` denied, XFF overwrite at the trust boundary).
- **Frontend:** root `ErrorBoundary` → Sentry in all three apps; single-flight token refresh with 401 retry and typed `TimeoutError`/`NetworkError`; `sourcemap: 'hidden'` uploaded to Sentry then stripped from the artifact; the only `dangerouslySetInnerHTML` routes through DOMPurify with `react/no-danger: error`; route-level `React.lazy` + `manualChunks`.
- **Test discipline:** zero disabled tests, zero no-assertion files, ~1.8 assertions/test, `no-explicit-any: error` (off in tests only), e2e covering auth/2FA/adoption/permissions/CSRF/rescue-onboarding/realtime-chat with `forbidOnly: CI`.

---

## Recommended sequence to "production-ready"

1. **Ship-blockers, this week (small code changes):** #1 pool error listener + process handlers; #8 wire a corrected env validator into boot; #12 gateway shutdown deadline; #7 `/health/ready`.
2. **Before first real traffic (infra decisions):** #2 observability stack; #3 connection budget + pgbouncer; #4 verified backups + PITR; #5 decoupled/concurrent migrations.
3. **Before scaling past one replica:** #6 rolling/HA deploy + auto-rollback; #13 alerting + scheduler locking; #9 outbox.
4. **Hardening backlog:** #10 coverage ratchet + `allowOnly`; #11 gRPC mTLS + staging guard; #14–#17 and the Low items.

Items #6 and #3–#4 may be legitimately _accepted_ rather than fixed for an early-stage launch — but that should be a documented decision with an explicit RTO/RPO, not a default.
