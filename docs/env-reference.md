# Environment variable reference

Full reference for every environment variable the stack reads, grouped by
domain. The root [`.env.example`](../.env.example) only carries the
essentials — the ~15 vars a new contributor actually has to look at
(`pnpm run setup` auto-generates the rest). Everything below either has a
working dev default already applied by the code, or only matters once you
touch that specific subsystem or deploy to production.

> **Required vs optional.** "Required" below means the app/service throws
> or refuses to boot without it — almost always **in production only**.
> Dev and test always have a safe fallback unless stated otherwise.

## How to use this file

- Looking for the ~15 vars you actually need to set? See `.env.example`'s
  `REQUIRED` banner instead — this file is the reference, not the
  onboarding path.
- Want to override a default? Copy the line from here into your `.env`.
- Added a new env var to the code? Add it here too, in the matching
  domain section, and to `.env.example`'s `REQUIRED` banner if the schema
  in `packages/lib.validation/src/schemas/env.ts` makes it required.

---

## Database (Postgres)

Beyond the essentials (`POSTGRES_*`, `DB_HOST/PORT/USERNAME/PASSWORD`,
`{DEV,TEST,PROD}_DB_NAME` — all in `.env.example`):

```env
DB_LOGGING=false
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE_MS=30000
DB_POOL_IDLE_MS=10000

# Per-query / lock timeouts (ADS-401). Defaults are reasonable for OLTP;
# tune if long-running reports time out.
DB_STATEMENT_TIMEOUT_MS=30000
DB_LOCK_TIMEOUT_MS=10000
DB_IDLE_IN_TRANSACTION_TIMEOUT_MS=60000

# Connection-string overrides (take precedence over discrete DB_* vars).
# Useful for managed Postgres (Neon, Supabase, RDS) where the provider
# gives you a URL. Leave unset to use the discrete DB_HOST/DB_PORT/... vars.
# DATABASE_URL=postgres://user:pass@host:5432/db
# DEV_DATABASE_URL=postgres://user:pass@host:5432/dev
# TEST_DATABASE_URL=postgres://user:pass@host:5432/test

# Database TLS (ADS-540). DB_SSL_MODE controls the Sequelize/pg SSL
# handshake:
#   disable     — plaintext (default for dev; refused in production)
#   require     — TLS, no certificate verification
#   verify-ca   — TLS, verify CA
#   verify-full — TLS, verify CA + hostname (recommended for managed Postgres)
# In production the default is `require`; setting `disable` is refused
# unless ALLOW_INSECURE_DB=true is also set (only safe on a fully trusted
# bridge such as in-cluster Docker networking). For RDS/Neon/Supabase:
# mount the provider's CA bundle into the container and point
# DB_SSL_ROOT_CERT at it, then set DB_SSL_MODE=verify-full.
DB_SSL_MODE=disable
# ALLOW_INSECURE_DB=true
# DB_SSL_ROOT_CERT=/etc/ssl/certs/rds-combined-ca-bundle.pem
```

## Auth & secrets

Beyond the auto-generated block (`JWT_SECRET`, `JWT_REFRESH_SECRET`,
`SESSION_SECRET`, `ENCRYPTION_KEY`, `UPLOAD_SIGNING_SECRET`,
`JWT_REPORT_SHARE_SECRET`, `REDIS_PASSWORD`, `GF_SECURITY_ADMIN_PASSWORD` —
all in `.env.example`, all filled in by `pnpm run setup` / `pnpm secrets:generate`):

```env
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# bcrypt cost factor. 12 is the production minimum (validate-env warns
# below it). Lower values speed up test/dev login flows; never set below 10.
BCRYPT_ROUNDS=12

# Internal gRPC Principal Signing Key (ADS-800). Shared HMAC key for the
# signed x-principal-token the gateway stamps on every downstream gRPC
# call. When set, services REQUIRE a valid token and take the principal
# from it — forged x-user-* metadata headers lose. When unset, the legacy
# header-trust behaviour applies (phased rollout). Must be the SAME value
# for the gateway and every gRPC service. Generate with: openssl rand -hex 32
#PRINCIPAL_SIGNING_KEY=
```

`ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes) for AES-256 —
`pnpm secrets:generate` produces a valid one; don't hand-write it.
`UPLOAD_SIGNING_SECRET` (ADS-542) is a dedicated HMAC key for short-lived
`/uploads-signed/*` URLs — required in production (min 32 chars), kept
distinct from `JWT_SECRET` so a compromise of one doesn't forge the other.

## Redis

Beyond the essentials (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` — in
`.env.example`):

```env
# Host-side port the dev compose stack publishes Redis on (default 6380).
# Only needed if 6379 is unavailable on your host — most commonly Windows,
# where Hyper-V reserves a dynamic port range that can include 6379.
# `pnpm docker:dev` detects the collision and tells you the free port to use:
# REDIS_HOST_PORT=6380

# REDIS_URL is the canonical connection string used by the backend
# (lib/redis.ts) and BullMQ. docker-compose.yml derives a default from
# REDIS_HOST/REDIS_PORT/REDIS_PASSWORD, but you can override here for
# external Redis (e.g. Upstash):
# REDIS_URL=redis://:password@host:6379
```

## Frontend / gateway URLs & CORS

`.env.example` already carries `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`,
`FRONTEND_URL`, `RESCUE_FRONTEND_URL`, `ADMIN_FRONTEND_URL`, `API_URL`, and
`CORS_ORIGIN` — every value there has a working local default. Two things
worth knowing:

- Backend services build password-reset, email-verification, and
  rescue-invitation links from the `*_FRONTEND_URL` vars (ADS-410) — if
  missing in production, email links fall back to `localhost`.
- `CORS_ORIGIN` is consumed by `service.gateway` (`@fastify/cors` —
  defence-in-depth; nginx also enforces CORS at the edge). Must include
  every SPA origin that calls the gateway directly.

Alternative nginx-proxied dev URLs (uncomment to use subdomain routing
instead of direct gateway access):

```env
# VITE_API_BASE_URL=http://api.localhost
# VITE_WS_BASE_URL=ws://api.localhost
```

## Email

`.env.example` sets `EMAIL_PROVIDER=console` (prints to stdout — no
third-party dependency) plus `EMAIL_FROM` / `DEFAULT_FROM_EMAIL`. Real
providers, in order of what's actually wired into `services/notifications`
(see `services/notifications/src/config.ts`):

```env
# EMAIL_PROVIDER=resend            # the only provider services/notifications
                                    # permits in production
# RESEND_API_KEY=CHANGE_THIS_RESEND_API_KEY
# DEFAULT_FROM_NAME="Adopt Don't Shop"
# DEFAULT_REPLY_TO_EMAIL=support@adoptdontshop.com

# EMAIL_PROVIDER=ethereal           # fake SMTP catcher — test/dev only
                                    # (unlike `console`, not refused in
                                    # production — do not set it there)
```

The following vars exist for a **possible future** provider switch but are
**not currently read by any code path** (only `console` | `ethereal` |
`resend` are implemented — see `docs/GDPR-ROPA.md`'s Sub-processors
section):

```env
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-smtp-username
# SMTP_PASSWORD=CHANGE_THIS_SMTP_PASSWORD

# SENDGRID_API_KEY=CHANGE_THIS_SENDGRID_API_KEY
# SENDGRID_FROM_EMAIL=noreply@adoptdontshop.com
# SENDGRID_FROM_NAME="Adopt Don't Shop"
```

Other email-adjacent config (ADS-451):

```env
EMAIL_FROM_ADDRESS=noreply@adoptdontshop.com
SUPPORT_EMAIL=support@adoptdontshop.com
EMAIL_QUEUE_CONCURRENCY=5

# EMAIL_WEBHOOK_PROVIDER must match the active provider when wiring
# inbound bounce/complaint webhooks (resend|sendgrid|ses|postmark).
# EMAIL_WEBHOOK_PROVIDER=resend
# EMAIL_WEBHOOK_SECRET=CHANGE_THIS_INBOUND_WEBHOOK_SECRET
# Provider-specific webhook secrets (only the relevant one is required):
# SENDGRID_WEBHOOK_PUBLIC_KEY=CHANGE_THIS_SENDGRID_PUBLIC_KEY
# POSTMARK_WEBHOOK_SECRET=CHANGE_THIS_POSTMARK_WEBHOOK_SECRET
# SES_WEBHOOK_SHARED_SECRET=CHANGE_THIS_SES_WEBHOOK_SECRET
```

## File storage

`.env.example` sets `STORAGE_PROVIDER=local` and `UPLOAD_DIR` — no
third-party dependency in dev. AWS S3 (`@adopt-dont-shop/storage`'s
`S3StorageProvider`), used when `STORAGE_PROVIDER=s3`:

```env
MAX_FILE_SIZE=10485760

# Path under which uploads are served by the backend. ADS-422: nginx
# serves /uploads/* directly in production after an auth_request — set
# SERVE_LOCAL_UPLOADS=false when nginx is in front so the backend doesn't
# double-serve. Defaults to true for local dev / CI without nginx.
PUBLIC_UPLOAD_PATH=/uploads
SERVE_LOCAL_UPLOADS=true

# AWS S3 (when STORAGE_PROVIDER=s3). Uses the AWS_ACCESS_KEY_ID /
# AWS_SECRET_ACCESS_KEY pair (shared with SES).
#
# Recommended bucket posture (do not deviate without security review):
#   - Block Public Access: ON for all four settings.
#   - Object Ownership: Bucket owner enforced (ACLs disabled).
#   - Default encryption: SSE-S3 (AES256) or SSE-KMS.
#   - Lifecycle rule: delete /temp/ objects older than 24h.
#   - IAM key scope: s3:PutObject, s3:GetObject, s3:DeleteObject,
#     s3:HeadObject on the bucket only.
# All client reads go through the backend's /uploads/* serve route, which
# generates short-lived presigned URLs after the auth + ACL gate.
# S3_BUCKET_NAME=your-bucket-name
# S3_REGION=us-east-1
# AWS_ACCESS_KEY_ID=CHANGE_THIS_AWS_ACCESS_KEY
# AWS_SECRET_ACCESS_KEY=CHANGE_THIS_AWS_SECRET_KEY

# CloudFront distribution domain in front of the S3 bucket (optional).
# Pair it with Origin Access Control (OAC) so the distribution is the
# only thing that can reach the bucket.
# CLOUDFRONT_DOMAIN=d123abc.cloudfront.net
```

## Feature flags (Statsig)

```env
# ADS-411: backend Server Secret Key. Without it, server-side feature
# flags silently default to off in production (safe fallback — this is
# fine for dev). Get it from https://console.statsig.com — CRITICAL:
# Server Secret Key, NOT Client SDK Key.
# STATSIG_SERVER_SECRET_KEY=secret-...

# ADS-453/466: client SDK key consumed by all three frontend apps.
# Missing key -> every feature gate returns false (safe default in dev).
# VITE_STATSIG_CLIENT_KEY=client-...
```

## Error tracking (Sentry)

```env
# SENTRY_DSN=your-sentry-dsn-url
# VITE_SENTRY_DSN=your-sentry-dsn-url
# Build/release tag reported to Sentry. CI typically sets this to the git SHA.
# SENTRY_RELEASE=
```

## Rate limiting & security

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ADS-625: server-side anon-swipe paywall threshold. After this many
# swipe actions from a single anonymous client (CSRF session cookie,
# falling back to hashed IP), the swipe endpoint returns 402
# ANON_SWIPE_LIMIT_REACHED. Should match the client's VITE_ANON_SWIPE_LIMIT
# (default 7).
ANON_SWIPE_LIMIT=7

# Skip auth rate limiting for local dev so repeated login attempts don't
# lock you out. Ignored when NODE_ENV=production.
RATE_LIMIT_DEV_BYPASS=false
```

## Backend workers & logging (ADS-451)

```env
# Enable the in-process reports worker (Bull queue consumer). Requires
# REDIS_URL. Set to "true" to run the worker alongside the API process.
WORKER_ENABLED=false

LOG_LEVEL=info
LOG_DIR=logs
```

## SMS

```env
# ISO-3166-1 alpha-2 country code used to default phone-number parsing.
SMS_DEFAULT_COUNTRY_CODE=GB
```

SMS **delivery** is not implemented — `SMS_PROVIDER=console|twilio` is
accepted by the validation schema for forward compatibility, but no SMS
sending code exists anywhere in the codebase yet. See `docs/GDPR-ROPA.md`'s
Sub-processors section.

## Cron schedules (ADS-451)

```env
# Standard cron expressions. Set *_ENABLED=false to disable a job entirely.
RETENTION_CRON=0 3 * * *              # purges soft-deleted rows past retention window
REVOKED_TOKENS_PURGE_CRON=0 4 * * *   # cleans expired entries from the revoked-token table
LEGAL_REMINDER_CRON_ENABLED=true      # legal reminder emails (verification renewals, etc)
LEGAL_REMINDER_CRON=0 9 * * 1
LEGAL_REMINDER_CRON_DRY_RUN=false
```

## Migration safety (production)

```env
# Destructive `down` migrations are blocked by default in production. To
# allow one (e.g. emergency rollback), set both:
# MIGRATION_ALLOW_DESTRUCTIVE_DOWN=true
# MIGRATION_DESTRUCTIVE_DOWN_KEY=<must match the key set in the migration>
```

## Metrics / Observability

```env
# Bearer token required on GET /metrics (Prometheus scrape). Leave unset
# to disable auth in dev; required in production (route 404s without it).
# METRICS_AUTH_TOKEN=CHANGE_THIS_METRICS_BEARER_TOKEN

# ADS-660: OpenTelemetry distributed tracing. When unset, the SDK does
# NOT start — the backend boots without traces and only the W3C
# traceparent scaffold runs. Set the endpoint to ship spans to a
# collector (Tempo / Jaeger / OTel Collector). See
# docs/observability/tracing.md for local-dev setup.
# OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# OTEL_SERVICE_NAME=adopt-dont-shop-backend
# Sampling. `parentbased_traceidratio` honours upstream sampling
# decisions and falls back to the ratio for new roots. Ratio in [0, 1].
# OTEL_TRACES_SAMPLER=parentbased_traceidratio
# OTEL_TRACES_SAMPLER_ARG=1.0
```

## Grafana

`GF_SECURITY_ADMIN_PASSWORD` is in `.env.example`'s auto-generated-secrets
block (`pnpm secrets:generate` / `pnpm run setup` fill it in — Compose refuses
to start Grafana without it, ADS-968).

```env
# Anonymous Grafana Viewer access is OFF by default (dashboards are
# reachable by anything on loopback while the dev stack is up). Set to
# true to opt back into read-only anonymous access — see
# observability/grafana/README.md.
# GRAFANA_ANONYMOUS_ENABLED=true
```

## External verification APIs (rescue onboarding)

```env
# Required to auto-verify UK rescues against the Charity Commission /
# Companies House registers. Missing key -> verification falls back to
# manual review.
# CHARITY_COMMISSION_API_KEY=
# COMPANIES_HOUSE_API_KEY=
```

## API docs / dev helpers

```env
# Expose Swagger UI at /api-docs. Forced off in production regardless of value.
EXPOSE_API_DOCS=true
```

## Cloudflare Turnstile (signup CAPTCHA)

```env
# Backend secret used to validate the turnstileToken submitted by
# /register. Required in production — if unset in a production-like env
# the registration endpoint refuses all requests rather than silently
# disabling the CAPTCHA. Leave unset in dev/test to bypass.
# TURNSTILE_SECRET_KEY=

# Public site key consumed by the frontend Turnstile widget (Vite-exposed).
# Frontend integration is intentionally a follow-up; this env var is
# reserved here so deployment configs can be kept in sync.
# VITE_TURNSTILE_SITE_KEY=
```

## Dev-only file watching

```env
# Docker file watching (Windows/Mac). `pnpm run setup` writes these
# automatically per-host since ADS-766 — Linux uses native inotify and
# leaves them unset on purpose.
# CHOKIDAR_USEPOLLING=true
# CHOKIDAR_INTERVAL=1000
# CHOKIDAR_AWAITWRITEFINISH=2000

# Vite/webpack file watching for app-rescue specifically. If HMR doesn't
# pick up changes on macOS or Windows for the rescue app:
# WATCHPACK_POLLING=true
```

`DEBUG_ERRORS=false` (in `.env.example`) includes raw error messages in API
responses when `true` — ADS-512: **never** set `true` in production;
startup validation refuses to boot with `DEBUG_ERRORS=true` while
`NODE_ENV=production`.

## Seeder demo data (dev/test only)

```env
# ALLOW_DEMO_SEED=false
# ALLOW_REFERENCE_SEED_PROD=false
# FAKER_SEED=42
# DEMO_RESCUE_COUNT=10
# DEMO_STAFF_COUNT=20
# DEMO_ADOPTER_COUNT=50
# DEMO_PET_COUNT=100
# DEMO_APPLICATION_COUNT=80
# DEMO_CHAT_COUNT=40
# DEMO_MESSAGE_COUNT=200
# DEMO_RATING_COUNT=30
# DEMO_NOTIFICATION_COUNT=60
```

## Production checklist

Before deploying to production, ensure you have:

- Changed **all** default passwords and secrets
- Generated strong JWT secrets (`openssl rand -base64 32`)
- Set the appropriate `CORS_ORIGIN` for your domain
- Configured a real email provider (`EMAIL_PROVIDER=resend`)
- Set up file storage (`STORAGE_PROVIDER=s3`) if needed
- Enabled HTTPS for all frontend URLs
- Set `NODE_ENV=production`
- Reviewed and limited rate limiting settings
- Disabled debug logging / errors (`DEBUG_ERRORS=false`)
