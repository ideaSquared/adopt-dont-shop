# Environment variable reference

Reference for every environment variable the stack reads, grouped by domain, with the file that reads it and its default. It is not the onboarding path — the essentials a new contributor has to look at live in [`.env.example`](../.env.example), and `pnpm bootstrap` generates every secret.

> **Required vs optional.** "Required" below means the process throws or refuses to boot without it — almost always in production only. Dev and test have a working fallback unless stated otherwise.

## How to use this file

- Setting up for the first time? Follow `.env.example`'s `REQUIRED` banner instead of this file.
- Want to override a default? Copy the line from here into your `.env`.
- Added a new env var to the code? Add it here (with the file that reads it and the default) and, if development cannot run without it, to `.env.example`'s `REQUIRED` banner — `scripts/check-env-example.mjs` keeps that banner in sync with `scripts/validate-env.ts`.
- Every variable below was checked against the code (`grep -rIF NAME apps packages services scripts e2e infra observability nginx deploy .github docker-compose*.yml`). A variable that is not listed is not read anywhere in the repo.

## Database (Postgres)

Beyond the essentials in `.env.example` (`POSTGRES_*`, `DB_HOST/PORT/USERNAME/PASSWORD`, `{DEV,TEST,PROD}_DB_NAME`):

| Variable       | Read in                                                                               | Default         | Notes                                                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | every `services/<name>/src/config.ts` via `requireSecret` (`packages/config-secrets`) | none — required | Compose builds it from `POSTGRES_*` (`x-service-env` anchor in `docker-compose.yml`), so only set it yourself for a bare-metal run. `DATABASE_URL_FILE` (path to a mounted secret) is accepted instead; setting both is refused. The gateway only gets it for `E2E_TOKEN_PEEK`. |
| `DB_POOL_MAX`  | `packages/db/src/client.ts`                                                           | `8`             | Per-service pool ceiling. Non-integer or `<= 0` is ignored. Budget maths in `docs/operations/connection-budget.md`.                                                                                                                                                             |
| `DB_LOGGING`   | `packages/lib.validation/src/schemas/env.ts`                                          | unset           | Only `pnpm validate:env` reads it (warns when `true` in production). No service consults it.                                                                                                                                                                                    |

`.env.example` ships `DB_HOST=database` / `REDIS_HOST=redis` — the Compose hostnames. For native `pnpm dev` set `DB_HOST=localhost`, `REDIS_HOST=localhost` and `REDIS_PORT=6380` (the port `pnpm dev:services` publishes Redis on).

## Auth & secrets

The auto-generated block (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `UPLOAD_SIGNING_SECRET`, `PRINCIPAL_SIGNING_KEY`, `JWT_REPORT_SHARE_SECRET`, `REDIS_PASSWORD`, `GF_SECURITY_ADMIN_PASSWORD`) is in `.env.example` and filled in by `pnpm bootstrap` / `pnpm secrets:generate`.

- `ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes) for AES-256 — `pnpm secrets:generate` produces a valid one.
- `UPLOAD_SIGNING_SECRET` (ADS-542) is a dedicated HMAC key for short-lived `/uploads-signed/*` URLs — required in production (min 32 chars) by `packages/lib.validation/src/schemas/env.ts`.
- `PRINCIPAL_SIGNING_KEY` (ADS-800) is the shared HMAC key for the signed `x-principal-token` the gateway stamps on every downstream gRPC call. Optional in development/test only; every other environment refuses to boot without it (ADS-1050 / ADS-1237). Must be the same value for the gateway and every gRPC service.
- `BCRYPT_ROUNDS` is read only by `pnpm validate:env` (`packages/lib.validation/src/schemas/env.ts`, warns below 12 in production). `services/auth` hard-codes 12 rounds in `src/grpc/password-hasher.ts`; the variable does not change it.

## Redis

Beyond `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (in `.env.example`):

| Variable          | Read in                                                                         | Default                             | Notes                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `REDIS_HOST_PORT` | `scripts/docker-dev.mjs`, `docker-compose.dev.yml`                              | `6380`                              | Host-side port the dev stack publishes Redis on. Change it if 6380 is taken; `pnpm docker:dev` detects a collision and suggests a free port. |
| `REDIS_URL`       | `services/gateway/src/config.ts` (rate-limit store), `x-service-env` in Compose | Compose: `redis://:<pw>@redis:6379` | Shared store for cross-replica rate limiting (ADS-805). When unset the gateway uses an in-memory store.                                      |

## Frontend / gateway URLs & CORS

`.env.example` carries `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, `FRONTEND_URL`, `RESCUE_FRONTEND_URL`, `ADMIN_FRONTEND_URL`, `API_URL` and `CORS_ORIGIN` with working local defaults.

- `*_FRONTEND_URL` are required in production by `packages/lib.validation/src/schemas/env.ts` ("used to build email links").
- `CORS_ORIGIN` is read by `services/gateway/src/config.ts` (comma-separated list for `@fastify/cors`). It must include every SPA origin that calls the gateway directly.
- `TRUST_PROXY` (`services/gateway/src/config.ts`, ADS-1021): `true`/`1` or `false`/`0`. Unset defaults to on in `production`/`staging` (behind nginx) and off everywhere else.

Alternative nginx-proxied dev URLs (only when the stack runs with `--profile full`):

```env
# VITE_API_BASE_URL=http://api.localhost
# VITE_WS_BASE_URL=ws://api.localhost
```

### Frontend build-time variables (`VITE_*`)

Read at build time by all three apps unless noted.

| Variable                  | Read in                                    | Default | Notes                                                                                        |
| ------------------------- | ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------- |
| `VITE_STATSIG_CLIENT_KEY` | `apps/*/src/contexts/StatsigContext.tsx`   | unset   | Statsig client SDK key. Unset logs a warning and every feature gate returns false (ADS-453). |
| `VITE_SENTRY_DSN`         | `apps/*/src/main.tsx`                      | unset   | Frontend error tracking. No-op when unset.                                                   |
| `VITE_APP_RELEASE`        | `apps/*/src/main.tsx`                      | unset   | Release tag reported with each Sentry event.                                                 |
| `VITE_ROUTER_BASENAME`    | `apps/*/src/main.tsx`                      | `/`     | `BrowserRouter` basename when an app is served under a sub-path.                             |
| `VITE_ANON_SWIPE_LIMIT`   | `apps/client/src/utils/anonSwipeBudget.ts` | `7`     | Anonymous swipe budget before the client prompts to sign up (ADS-625).                       |

## Microservices (ports, schemas, gRPC URLs)

Compose supplies all of these; set them only for a bare-metal run. Each service reads its own family from `services/<name>/src/config.ts` (`parsePort` from `packages/config-secrets`): `<SVC>_PORT` (HTTP), `<SVC>_GRPC_PORT`, `<SVC>_HOST` (default `0.0.0.0`) and `<SVC>_SCHEMA` (the Postgres schema it owns).

| Service       | `<SVC>_PORT` | `<SVC>_GRPC_PORT` | `<SVC>_SCHEMA`  |
| ------------- | ------------ | ----------------- | --------------- |
| notifications | `5001`       | `6001`            | `notifications` |
| auth          | `5002`       | `6002`            | `auth`          |
| pets          | `5003`       | `6003`            | `pets`          |
| rescue        | `5004`       | `6004`            | `rescue`        |
| applications  | `5005`       | `6005`            | `applications`  |
| chat          | `5006`       | `6006`            | `chat`          |
| moderation    | `5007`       | `6007`            | `moderation`    |
| matching      | `5008`       | `6008`            | `matching`      |
| audit         | `5009`       | `6009`            | `audit`         |
| cms           | `5010`       | `6010`            | `cms`           |

The gateway reads `GATEWAY_PORT` (default `4000`) and `GATEWAY_HOST` (default `0.0.0.0`). `PORT` in `.env.example` is only validated by `pnpm validate:env`; no service listens on it.

| Variable         | Read in                                             | Default                                                | Notes                                                            |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| `NATS_URL`       | every `services/<name>/src/config.ts`               | `nats://nats:4222`                                     | JetStream bus for `withTransaction` publish-after-commit events. |
| `<SVC>_GRPC_URL` | `services/gateway/src/config.ts` (all ten services) | `service-<name>:<grpcPort>` (e.g. `service-pets:6003`) | Override only when a service runs on a different host/port.      |

Services that call other services read a subset of `*_GRPC_URL` too: `services/rescue` (`PETS_GRPC_URL`, `APPLICATIONS_GRPC_URL`), `services/applications` (`PETS_GRPC_URL`), `services/chat` (`APPLICATIONS_GRPC_URL`, `RESCUE_GRPC_URL`), `services/matching` (`PETS_GRPC_URL`, `RESCUE_GRPC_URL`). `services/notifications` reads `AUTH_GRPC_URL` / `PETS_GRPC_URL` / `RESCUE_GRPC_URL` as optional — unset, the fan-outs that need them no-op.

## Gateway (`services/gateway/src/config.ts` unless noted)

| Variable                      | Default      | Notes                                                                                                                                                                                 |
| ----------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GATEWAY_RATE_LIMIT_MAX`      | `100`        | Global per-IP requests per window. Compose passes it through (`${GATEWAY_RATE_LIMIT_MAX:-100}`); the e2e CI stack raises it.                                                          |
| `GATEWAY_RATE_LIMIT_WINDOW`   | `1 minute`   | Window as ms or an `@lukeed/ms` string.                                                                                                                                               |
| `GATEWAY_AUTH_RATE_LIMIT_MAX` | unset        | `src/routes/auth.ts`. Raises the per-route login/register caps; set only by the e2e stack.                                                                                            |
| `GRPC_RETRY_COUNT`            | `2`          | `src/grpc-clients/resilience.ts`. Max attempts = 1 + this.                                                                                                                            |
| `GRPC_CIRCUIT_FAILURES`       | `5`          | `src/grpc-clients/resilience.ts`. Failures within the window that open the breaker.                                                                                                   |
| `GRPC_CIRCUIT_WINDOW_MS`      | `30000`      | `src/grpc-clients/resilience.ts`.                                                                                                                                                     |
| `GRPC_CIRCUIT_COOLDOWN_MS`    | `10000`      | `src/grpc-clients/resilience.ts`. Time before the breaker half-opens.                                                                                                                 |
| `E2E_TOKEN_PEEK`              | unset        | ADS-871 test seam that exposes one-time reset/verify/invitation tokens to Playwright. Only the exact string `true` enables it; the gateway refuses to boot with it set in production. |
| `GATEWAY_LEGAL_ENABLED`       | `true`       | Set `false` to disable the legal-docs routes.                                                                                                                                         |
| `LEGAL_DOCS_DIR`              | `docs/legal` | Directory the legal routes serve from.                                                                                                                                                |
| `GATEWAY_CONFIG_ENABLED`      | `true`       | Set `false` to disable the public config endpoint.                                                                                                                                    |

## Email (`services/notifications/src/config.ts`)

`.env.example` sets `EMAIL_PROVIDER=console` (prints to stdout) plus `EMAIL_FROM` / `DEFAULT_FROM_EMAIL`. Only `console`, `ethereal` and `resend` are implemented; production refuses `console`.

```env
# EMAIL_PROVIDER=resend            # the only provider permitted in production
# RESEND_API_KEY=CHANGE_THIS_RESEND_API_KEY
# DEFAULT_FROM_NAME="Adopt Don't Shop"
# DEFAULT_REPLY_TO_EMAIL=support@adoptdontshop.com

# EMAIL_PROVIDER=ethereal           # fake SMTP catcher — test/dev only (not refused in production; do not set it there)
```

| Variable                | Default | Notes                                                                                                                          |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `EMAIL_WORKER_ENABLED`  | `true`  | Set `false` to stop the email queue worker (tests and the migrations-only smoke do this).                                      |
| `EMAIL_CHANNEL_ENABLED` | `true`  | Set `false` to stop the `notifications.created` subscriber that enqueues transactional emails. Needs `AUTH_GRPC_URL` to start. |
| `PUSH_WORKER_ENABLED`   | `true`  | Set `false` to stop the push NATS subscriber.                                                                                  |

## Push notifications (`services/notifications/src/config.ts`)

`PUSH_PROVIDER=console` (default) logs pushes to stdout; production refuses it. The only wired production provider is Firebase Cloud Messaging (`services/notifications/src/push/providers/fcm.ts`, ADS-1238). With `PUSH_PROVIDER=fcm` both vars below are required — boot fails if either is missing:

```env
# PUSH_PROVIDER=fcm
# Raw GCP service-account JSON as downloaded from the Firebase console.
# FCM_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...",...}
# FCM_PROJECT_ID=your-firebase-project-id
```

## File storage (`services/gateway/src/config.ts`)

`.env.example` sets `STORAGE_PROVIDER=local` and `UPLOAD_DIR=./uploads`.

| Variable             | Default    | Notes                                                                                      |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `MAX_FILE_SIZE`      | `10485760` | Multipart body limit in bytes (10 MiB).                                                    |
| `PUBLIC_UPLOAD_PATH` | `/uploads` | Path prefix uploads are served under.                                                      |
| `STORAGE_PROVIDER`   | `local`    | `s3` switches to `S3StorageProvider` in `packages/storage` and requires the S3 vars below. |

```env
# AWS S3 (when STORAGE_PROVIDER=s3).
# Recommended bucket posture: Block Public Access on; Object Ownership =
# bucket owner enforced; default encryption SSE-S3 or SSE-KMS; IAM key scoped
# to s3:PutObject/GetObject/DeleteObject/HeadObject on this bucket only.
# S3_BUCKET_NAME=your-bucket-name
# S3_REGION=us-east-1
# AWS_ACCESS_KEY_ID=CHANGE_THIS_AWS_ACCESS_KEY
# AWS_SECRET_ACCESS_KEY=CHANGE_THIS_AWS_SECRET_KEY

# CloudFront distribution in front of the bucket (optional). Pair with
# Origin Access Control so only the distribution can reach the bucket.
# CLOUDFRONT_DOMAIN=d123abc.cloudfront.net
```

## Upload AV scanning (ClamAV)

The gateway scans every upload through clamd before writing it to storage (`packages/lib.av-scan` plus the `clamav` Compose service, ADS-1241). `.env.example` ships working defaults:

```env
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
# CLAMAV_FAIL_OPEN lets an upload through when clamd is unreachable. Read
# outside production only — production always fails closed (503).
CLAMAV_FAIL_OPEN=false
```

## Feature flags (Statsig)

- `VITE_STATSIG_CLIENT_KEY` — see the `VITE_*` table above.
- `STATSIG_SERVER_SECRET_KEY` — `pnpm validate:env` requires it in production (`packages/lib.validation/src/schemas/env.ts`). No service reads it today.

## Error tracking (Sentry / GlitchTip)

Backend error tracking uses the Sentry SDK (`packages/observability/src/sentry.ts`, ADS-1041). It is a no-op unless `SENTRY_DSN` is set **and** `NODE_ENV` is `production` or `staging`. In prod/staging the DSN points at the self-hosted GlitchTip overlay (`docker-compose.glitchtip.yml`); operator steps are in `docs/runbooks/observability-enable.md`.

```env
# SENTRY_DSN=http://<publicKey>@glitchtip-web:8080/<projectId>
# SENTRY_RELEASE=            # release tag on backend events (packages/observability/src/sentry.ts)

# --- Self-hosted GlitchTip (host .env, docker-compose.glitchtip.yml) ----------
# GLITCHTIP_ENABLED=true     # deploy.yml adds the overlay when this is true
# GLITCHTIP_SECRET_KEY=<random 50+ chars>   # required when enabled (Compose refuses to start without it)
# GLITCHTIP_DB_PASSWORD=<random>            # required when enabled
# GLITCHTIP_DOMAIN=https://errors.example.com   # default http://localhost:8000
# GLITCHTIP_EMAIL_URL=smtp://user:pass@smtp.example.com:587   # default consolemail://
# GLITCHTIP_FROM_EMAIL=alerts@adoptdontshop.com
```

## Logging, tracing and metrics

The self-hosted stack (Prometheus + Loki + Tempo + Grafana + Alertmanager) is an opt-in overlay in prod/staging (`docker-compose.observability.yml`). Locally it starts under `pnpm docker:dev --profile full` (or `--profile observability`). Full operator steps: `docs/runbooks/observability-enable.md`.

| Variable                                         | Read in                                            | Default                                  | Notes                                                                                                     |
| ------------------------------------------------ | -------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`                                      | `packages/observability/src/logger.ts`             | `debug` in development, `info` elsewhere | One of `error`, `warn`, `info`, `http`, `debug`, `silly`.                                                 |
| `LOKI_URL`                                       | `packages/observability/src/logger.ts`             | unset                                    | Adds a Loki transport (`winston-loki`) when set, e.g. `http://loki:3100`.                                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                    | `packages/observability/src/opentelemetry.ts`      | unset                                    | The OpenTelemetry SDK does not start without it. In prod/staging point it at Tempo (`http://tempo:4318`). |
| `OTEL_SERVICE_NAME`                              | `packages/observability/src/opentelemetry.ts`      | the service's own name                   | Overrides the `service.name` resource attribute.                                                          |
| `OTEL_TRACES_SAMPLER`, `OTEL_TRACES_SAMPLER_ARG` | the OpenTelemetry `NodeSDK` itself (not repo code) | SDK defaults                             | Standard OTel env vars, e.g. `parentbased_traceidratio` / `0.1`. See `packages/observability/README.md`.  |
| `OBSERVABILITY_ENABLED`                          | `.github/workflows/deploy.yml` (host `.env`)       | unset                                    | `true` makes the deploy add `docker-compose.observability.yml` to the stack.                              |

## Grafana

`GF_SECURITY_ADMIN_PASSWORD` is in `.env.example`'s auto-generated block — Compose refuses to start Grafana without it (ADS-968).

```env
# Anonymous Viewer access is OFF by default. Set true for read-only
# anonymous dashboards on the dev stack — see observability/grafana/README.md.
# GRAFANA_ANONYMOUS_ENABLED=true

# prod/staging (docker-compose.observability.yml): public URL when Grafana
# sits behind a reverse proxy. Default http://localhost:3030.
# GF_SERVER_ROOT_URL=https://grafana.example.com
```

## Audit service (`services/audit/src/index.ts`)

| Variable                | Default            | Notes                                                                                       |
| ----------------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| `GDPR_SAGA_DEADLINE_MS` | `1800000` (30 min) | GDPR erasure sagas in flight longer than this are marked timed out by the sweep.            |
| `GDPR_SAGA_MAX_RETRIES` | `3`                | Retries before a timed-out saga is abandoned. See `docs/runbooks/gdpr-erasure-incident.md`. |

## Dev-only file watching

```env
# Docker file watching on Windows/macOS. `pnpm bootstrap` writes these
# per-host (ADS-766) — Linux uses native inotify and leaves them unset.
# CHOKIDAR_USEPOLLING=true
# CHOKIDAR_INTERVAL=1000
# CHOKIDAR_AWAITWRITEFINISH=2000
# Same, for app.rescue's watcher.
# WATCHPACK_POLLING=true
```

## Seed data (dev/test only)

How to seed and log in: `docs/operations/dev-seed-data.md`.

| Variable             | Read in                                                       | Default           | Notes                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SEED_PASSWORD`      | `services/auth/src/db/seed-data.ts`                           | `DevPassword123!` | Password for every fixed persona (`pnpm db:seed`). Also in `.env.example`.                                                                                                                   |
| `SPAM_PASSWORD`      | `services/auth/src/db/spam.ts`                                | `DevPassword123!` | Password for every synthetic user (`pnpm db:spam`).                                                                                                                                          |
| `SPAM_*`             | `services/*/src/db/spam.ts` (forwarded by `scripts/spam.mjs`) | per service       | Volume knobs: `SPAM_ADOPTERS`, `SPAM_STAFF`, `SPAM_RESCUES`, `SPAM_PETS`, `SPAM_RATINGS`, `SPAM_APPLICATIONS` (400), `SPAM_CHATS` (150), `SPAM_MESSAGES` (2000), `SPAM_NOTIFICATIONS` (800). |
| `FAKER_SEED`         | `packages/seed-faker/src/faker-rng.ts`                        | `42`              | Fixed seed so generated text is deterministic.                                                                                                                                               |
| `ALLOW_SPAM`         | `packages/seed-faker/src/env-guard.ts`                        | unset             | Must be exactly `true` (and `NODE_ENV` development/test) before any spam seeder runs. `scripts/spam.mjs` sets it.                                                                            |
| `SEED_ONLY_IF_EMPTY` | `packages/seed-faker/src/should-seed.ts`                      | unset             | `docker-compose.dev.yml` sets it on boot so a restart never re-spams a populated DB.                                                                                                         |
| `SEED_DOCKER`        | `scripts/seed.mjs`, `scripts/spam.mjs`                        | `docker`          | Docker binary the host-side orchestrators shell out to.                                                                                                                                      |

## Backups (`.github/workflows/backup.yml`, `backup-restore-drill.yml`)

| Variable                                      | Where                                          | Notes                                                                                              |
| --------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `BACKUP_BUCKET`                               | GitHub repo variable → `scripts/snapshot-*.sh` | S3 bucket for nightly Postgres + uploads snapshots (no `s3://` prefix). Required by both scripts.  |
| `AWS_REGION`                                  | GitHub repo variable → `scripts/snapshot-*.sh` | Region of that bucket.                                                                             |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | GitHub repo secrets (restore drill only)       | The production host uses its own credentials; the GitHub-hosted drill runner needs read-only keys. |

Runbooks: `docs/db-backup-runbook.md`, `docs/operations/restore.md`, `docs/operations/snapshot-policy.md`.

## Deploy (host `/opt/ads/<env>/.env`)

| Variable                               | Set by                                       | Notes                                                                                                                                                                                                               |
| -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEPLOY_SHA`                           | `deploy.yml` / `rollback.yml`                | Git SHA whose GHCR images `docker-compose.prod.yml` / `docker-compose.staging.yml` pull. Both files refuse to start without it.                                                                                     |
| `SERVICE_<NAME>_TAG`, `APP_<NAME>_TAG` | `deploy.yml` `tag_overrides` input (ADS-824) | Per-image override of `DEPLOY_SHA`.                                                                                                                                                                                 |
| `PROD_HOSTNAME`                        | you, in your shell                           | Operator convenience used by the runbooks' `curl` commands (`https://${PROD_HOSTNAME}/health/simple`). Not read by any code; `nginx/nginx.prod.conf` has a `__PROD_HOSTNAME__` placeholder replaced at deploy time. |

## Production checklist

- All generated secrets rotated from the dev values (`pnpm secrets:generate`), including `PRINCIPAL_SIGNING_KEY` and `UPLOAD_SIGNING_SECRET`
- `NODE_ENV=production`
- `CORS_ORIGIN` and the three `*_FRONTEND_URL` values point at HTTPS origins
- `EMAIL_PROVIDER=resend` with `RESEND_API_KEY` (production refuses `console`)
- `PUSH_PROVIDER=fcm` with both FCM vars (production refuses `console`)
- `STORAGE_PROVIDER=s3` with the S3 vars if uploads must survive the host
- `E2E_TOKEN_PEEK` unset
- `pnpm validate:env --env-file=<prod .env> --staging-env=<staging .env>` passes (fails on secrets shared with staging, ADS-659)
