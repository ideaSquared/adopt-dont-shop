# Infrastructure Documentation

Authoritative overview of the Adopt Don't Shop system topology (audience: engineers orienting on the platform). For the dev stack see [DOCKER.md](../DOCKER.md); for deploys see [operations/deploy.md](../operations/deploy.md); for one-time provisioning see [DEPLOYMENT-PLAN.md](./DEPLOYMENT-PLAN.md).

## Architecture Overview

Three React SPAs and a Fastify gateway sit behind nginx. The gateway is the only HTTP surface; it fans out to ten gRPC microservices over the internal network. Every service shares one Postgres (schema-per-service), one Redis, and one NATS JetStream event bus. ClamAV scans uploaded files.

```
                        ┌──────────────────────┐
                        │        nginx         │  subdomain routing, TLS,
                        │   (reverse proxy)    │  serves /uploads read-only
                        └──────────┬───────────┘
             ┌─────────────┬───────┼───────┬─────────────┐
             ▼             ▼       │       ▼             ▼
       ┌──────────┐ ┌──────────┐   │ ┌──────────┐  ┌──────────┐
       │app-client│ │app-admin │   │ │app-rescue│  │ /uploads │
       │  :3000   │ │  :3001   │   │ │  :3002   │  │ (volume) │
       └──────────┘ └──────────┘   │ └──────────┘  └──────────┘
                                   ▼
                        ┌──────────────────────┐
                        │   service-gateway     │  Fastify REST/WS edge :4000
                        │   (Fastify, gRPC hub) │  signs x-principal-token
                        └──────────┬───────────┘
                                   │ gRPC (:600x)
     ┌──────────┬──────────┬───────┼───────┬──────────┬──────────┐
     ▼          ▼          ▼       ▼       ▼          ▼          ▼
 service-   service-   service-  service- service-  service-   … (10 total:
  auth       pets      rescue    apps     chat      cms         auth pets
 (:5002)    (:5003)   (:5004)   (:5005)  (:5006)   (:5010)      rescue applications
                                                                notifications moderation
                                                                matching audit chat cms)
     │          │          │       │       │          │
     └──────────┴──────────┴───┬───┴───────┴──────────┘
                               ▼
      ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
      │ database  │   │   redis   │   │   nats    │   │  clamav   │
      │ PG16+GIS  │   │  cache /  │   │ JetStream │   │ AV scan   │
      │ schema-   │   │ sessions  │   │  events   │   │ (uploads) │
      │ per-svc   │   └───────────┘   └───────────┘   └───────────┘
      └───────────┘
```

## Services

### Frontend applications

| App          | Port | Dev host           | Prod host               |
| ------------ | ---- | ------------------ | ----------------------- |
| `app-client` | 3000 | `localhost`        | `$PROD_HOSTNAME`        |
| `app-admin`  | 3001 | `admin.localhost`  | `admin.$PROD_HOSTNAME`  |
| `app-rescue` | 3002 | `rescue.localhost` | `rescue.$PROD_HOSTNAME` |

React 19 + TypeScript + Vite, built to static assets served by nginx in production. Prod hostnames come from the `__PROD_HOSTNAME__` template substituted into `nginx/nginx.prod.conf` at deploy time.

### Backend

- **service-gateway** (Fastify, port 4000; prod host `api.$PROD_HOSTNAME`) — the only HTTP/WS surface. Validates requests, stamps a signed `x-principal-token`, and calls the domain services over gRPC. No business logic, owns no schema.
- **Ten domain gRPC services** — `auth`, `notifications`, `pets`, `rescue`, `applications`, `chat`, `moderation`, `matching`, `audit`, `cms`. Each owns one Postgres schema, exposes HTTP health on `:500x` and gRPC on `:600x`, and migrates its own schema on container start.

### Data stores

| Store      | Image                    | Role                                                                                           |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| `database` | `postgis/postgis:16-3.4` | Primary DB; one schema per service, `search_path = <schema>, public`, no cross-schema FKs.     |
| `redis`    | `redis:7.4-alpine`       | Cache, sessions, rate limiting.                                                                |
| `nats`     | `nats:2.10-alpine`       | JetStream event backbone; transactional outbox → subscribers (audit persists `*.actionTaken`). |
| `clamav`   | `clamav/clamav:1.4`      | AV/malware scan of uploaded bytes (gateway streams via INSTREAM).                              |

### File storage

- Uploads are written to a shared local Docker volume (`uploads`) by the gateway and served read-only by the per-stack nginx via `auth_request` (`SERVE_LOCAL_UPLOADS=false` in prod, so the gateway does not stream files itself). There is **no S3/CDN in the serving path today** — an S3-native migration is planned but not implemented (see [snapshot-policy.md](../operations/snapshot-policy.md)). Uploads are backed up nightly to S3 by `scripts/snapshot-uploads.sh`.

## Shared libraries

Frontend-shared libraries are scoped `@adopt-dont-shop/lib.<name>` (e.g. `lib.api`, `lib.components`, `lib.types`, `lib.permissions`, `lib.feature-flags`, `lib.observability`). Service-only shared packages use bare names (`@adopt-dont-shop/proto`, `db`, `events`, `authz`, `observability`, `storage`, …). See [Libraries Documentation](../libraries/README.md) for the full list.

## Subdomain routing

nginx routes by `Host`. In dev, nginx is profile-gated (`--profile full` / `proxy`) and the apps resolve on `*.localhost`; without it, use the direct ports. See [DOCKER.md](../DOCKER.md#subdomain-routing). In production, `nginx/nginx.prod.conf` maps `$PROD_HOSTNAME`, `admin.`, `rescue.` and `api.` to the app and gateway containers.

## Docker & deploys

- **Dev stack** — `pnpm docker:dev` (see [DOCKER.md](../DOCKER.md)).
- **Production** — pre-built GHCR images pulled by `docker-compose.prod.yml` on a single Hetzner host under `/opt/ads/<env>/`, driven by `.github/workflows/deploy.yml`. `docker compose -f docker-compose.yml -f docker-compose.prod.yml …` locally is only a **smoke test** of the prod images, not the real deploy. The authoritative release procedure is [operations/deploy.md](../operations/deploy.md); one-time provisioning is [DEPLOYMENT-PLAN.md](./DEPLOYMENT-PLAN.md).

Deploys and rollbacks are dispatched via the repo-root `Makefile` (`make staging`, `make prod`, `make rollback env=production sha=<sha>`), which run the `deploy.yml` / `rollback.yml` GitHub Actions workflows.

## Database migrations

Each service owns its migrations under `services/<name>/src/migrations/` and applies them itself when its container starts (entrypoint runs `pnpm run --if-present db:migrate`). To migrate one service by hand (containers running):

```bash
docker compose exec service-auth pnpm db:migrate
```

Never modify a shipped migration — add a new `NNN_snake_case.ts` file in the owning service (see [writing-migrations.md](../backend/writing-migrations.md)).

## Observability (opt-in)

The self-hosted observability stack is off by default and layered in per host via `docker-compose.observability.yml` (`OBSERVABILITY_ENABLED=true`):

- **Logs** — Loki (shipped from services via `LOKI_URL`), viewed in Grafana. (Winston structured JSON logs.)
- **Metrics** — Prometheus scrapes services; alert rules in `infra/prometheus/rules/`, routed by Alertmanager to **Discord** (see [slo.md](../slo.md)).
- **Traces** — OpenTelemetry → Tempo (`OTEL_EXPORTER_OTLP_ENDPOINT`), viewed in Grafana (see [observability/tracing.md](../observability/tracing.md)).
- **Error tracking** — GlitchTip (Sentry-compatible), activated by `SENTRY_DSN` via `docker-compose.glitchtip.yml`.

See [runbooks/observability-enable.md](../runbooks/observability-enable.md) to enable it on a host.

## Security

- **Auth** — JWT access + refresh tokens (auth service); the gateway stamps a signed `x-principal-token` on every downstream gRPC call, and each service re-checks permissions with `requirePermission` (the gateway gate is not sufficient on its own).
- **Secrets** — file-mounted Docker secrets (`/run/secrets/*`) loaded via `@adopt-dont-shop/config-secrets`, kept out of `docker inspect`. See [SECRETS-MANAGEMENT.md](../SECRETS-MANAGEMENT.md).
- **Container hardening** — read-only root filesystems, `cap_drop: ALL`, `no-new-privileges`, non-root users, per-service CPU/memory limits, and rotated JSON-file logging (`docker-compose.prod.yml`).
- **Image supply chain** — service/app images are built in CI, scanned with Trivy (`docker.yml`), and signed by digest with cosign keyless OIDC in `deploy.yml`.

## Additional Resources

- **Docker (dev stack)**: [../DOCKER.md](../DOCKER.md)
- **Deploys**: [../operations/deploy.md](../operations/deploy.md), [DEPLOYMENT-PLAN.md](./DEPLOYMENT-PLAN.md)
- **Microservices Standards**: [MICROSERVICES-STANDARDS.md](./MICROSERVICES-STANDARDS.md)
- **New App Generator**: [new-app-generator.md](./new-app-generator.md)
- **Backend / Frontend / Libraries**: [../backend/](../backend/), [../frontend/](../frontend/), [../libraries/](../libraries/)
