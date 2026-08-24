# Backend Service Implementation Guide

## Quick Start

### Prerequisites

- Node.js 22 (pinned in `.nvmrc`; `package.json` `engines` requires `>=22 <23`)
- PostgreSQL 16 with PostGIS (provided by the Docker stack)
- Docker and Docker Compose (recommended)

> pnpm is provided via Corepack — run `corepack enable` once. Its version is pinned by the `"packageManager"` field in the root `package.json`, so you do not install pnpm globally.

### Development Setup

From the repository root the typical workflow uses Docker — the container boots the database, Redis, and the backend in one command. See the [root README](../../README.md) for the full quick start.

1. **Install workspace dependencies (from repo root)**

   ```bash
   pnpm install
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   pnpm secrets:generate >> .env
   # Edit .env to set POSTGRES_PASSWORD and any third-party keys
   ```

3. **Start the stack**

   ```bash
   pnpm docker:dev          # foreground
   pnpm docker:dev:detach   # or background
   ```

4. **Initialize the database (first run, or after `docker:reset`)**

   Each service runs its own migrations from `services/<name>/src/migrations/` on container start (the dev `CMD` in `Dockerfile.service` runs `pnpm run --if-present db:migrate && pnpm run --if-present db:seed && pnpm run dev`), so the typical workflow is "start the stack and it's ready". The runner is `node-pg-migrate` wrapped by `@adopt-dont-shop/db`, which tracks applied migrations in a `pgmigrations` table per schema and retries on the cross-service advisory-lock contention that happens when several services boot at once. Schema-owning services are auth, pets, rescue, applications, chat, notifications, moderation, matching, cms, audit; the gateway owns no tables.

   To run migrations or seeds by hand for a single service:

   ```bash
   docker compose exec service-auth pnpm db:migrate          # or any schema-owning service
   docker compose exec service-auth pnpm db:seed             # auth / pets / rescue / applications / chat have seeds
   pnpm db:seed                                              # host-side orchestrator: seeds every service in dep order
   ```

5. **Services are reachable via the API gateway at**

   ```
   http://localhost:4000        # gateway direct (REST + WebSocket)
   http://api.localhost         # via the nginx reverse proxy
   ```

### Native (no-Docker) Development

If you prefer to run the backend on the host (you must provide Postgres and Redis yourself):

```bash
cd services/<name>       # e.g. services/gateway, services/auth, services/pets
pnpm dev                  # tsx watch --import ./src/instrumentation.ts ./src/index.ts
```

## Environment Configuration

### Development (.env)

```bash
# Environment
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
# `.env.example` uses POSTGRES_DB + DEV_DB_NAME / TEST_DB_NAME / PROD_DB_NAME
# (validate-env.ts selects per NODE_ENV); see `.env.example` for the full list.
POSTGRES_DB=adopt_dont_shop_dev
DEV_DB_NAME=adopt_dont_shop_dev

# JWT
JWT_SECRET=your-development-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email — one of: console | ethereal | resend (see Email Service Setup)
EMAIL_PROVIDER=ethereal

# Storage (Development - Free)
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
PUBLIC_UPLOAD_PATH=/uploads
MAX_FILE_SIZE=10485760

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-development-session-secret

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Production Configuration

```bash
# Environment
NODE_ENV=production

# Email (Production)
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
DEFAULT_FROM_EMAIL=noreply@adoptdontshop.com

# Storage (Production)
STORAGE_PROVIDER=s3
S3_BUCKET_NAME=adoptdontshop-uploads
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
CLOUDFRONT_DOMAIN=cdn.adoptdontshop.com
```

## Email Service Setup

The notifications service picks its provider from `EMAIL_PROVIDER` — one of `console` | `ethereal` | `resend`. `console` is dev-only (refused in production); `ethereal` is the default for local work; `resend` is the production transport.

### Console (default, dev)

```bash
EMAIL_PROVIDER=console
```

Every send is logged to stdout — useful for tests where you don't need to inspect rendered HTML.

### Ethereal Mail (dev with preview)

```bash
EMAIL_PROVIDER=ethereal
```

The provider creates a throwaway Ethereal account on boot and logs the preview URL of each send. Open the URL printed in `docker compose logs -f service-notifications` to see the rendered message.

### Resend (production)

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_api_key
DEFAULT_FROM_EMAIL=noreply@adoptdontshop.com
```

`RESEND_API_KEY` and `DEFAULT_FROM_EMAIL` are both mandatory when `EMAIL_PROVIDER=resend`; the service refuses to boot otherwise.

## File Storage Setup

### Local Storage (Development)

Files stored in `uploads/` directory - no setup required!

```bash
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
```

Organized structure:

```
uploads/
├── pets/       # Pet photos
├── users/      # User avatars
├── documents/  # Application documents
└── temp/       # Temporary files
```

### AWS S3 (Production)

1. Create S3 bucket
2. Configure IAM user with S3 permissions
3. Optional: Set up CloudFront CDN
4. Configure environment:
   ```bash
   STORAGE_PROVIDER=s3
   S3_BUCKET_NAME=your-bucket-name
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   ```

## Database Management

Each schema-owning service ships its own migrations and (where it makes sense) seeds — `sequelize-cli` is **not** installed. Migrations live in `services/<name>/src/migrations/`; seed entry points live next to them in `services/<name>/src/db/`. The runner is `node-pg-migrate` via `@adopt-dont-shop/db`, with applied migrations tracked in a `pgmigrations` table inside each service's owning schema.

### Migrations

```bash
# Run pending migrations for a single service (e.g. service-auth)
docker compose exec service-auth pnpm db:migrate

# Authoring a new migration: copy an existing file in the owning service's
# services/<name>/src/migrations/ and follow the numbered naming pattern —
# a 3-digit, zero-padded, sequential prefix then snake_case
# (e.g. 011_add_something.ts); the convention is enforced by each service's
# migrations.test.ts (/^\d{3}_[a-z0-9_]+\.ts$/). The runner picks them up
# automatically on the next service boot (its CMD runs
# `pnpm run --if-present db:migrate`). See docs/backend/writing-migrations.md.
```

Schema-owning services: `service-auth`, `service-pets`, `service-rescue`, `service-applications`, `service-chat`, `service-notifications`, `service-moderation`, `service-matching`, `service-cms`, `service-audit`. The gateway owns no tables, so `docker compose exec service-gateway pnpm db:migrate` will fail with "missing script" — that's expected, skip it.

### Seeds

Seeding has two tiers:

1. **Personas** (`db:seed`) — a small fixed set of accounts (john.smith, admin, rescue staff …) with stable ids the e2e suite and the dev-tools login panel depend on. `service-auth`, `service-rescue`, `service-pets`, `service-applications`, `service-chat` each ship one; they use `ON CONFLICT DO UPDATE` and run on every container boot.
2. **Synthetic** (`db:spam`) — the realistic, populated dataset: adopters + rescues, a photo'd pet catalogue (real names, breeds, bios, species-matched photos), plus applications, chats and notifications. Rows use deterministic ids + `ON CONFLICT DO NOTHING`, so re-running converges to the same dataset instead of piling on.

```bash
# Populate the dev DB with the FULL realistic dataset (personas + synthetic).
# This is the command to reach for; idempotent, safe to re-run.
pnpm db:seed:dev

# …or just one tier:
pnpm db:seed          # personas only
pnpm db:spam          # synthetic only

# Tune volume per entity — bump and re-run to add more:
SPAM_PETS=1000 pnpm db:spam
```

**Fresh Docker stack:** the browsable catalogue (auth + rescue + pets synthetic) is seeded automatically on boot, but only into an EMPTY database — the boot commands pass `SEED_ONLY_IF_EMPTY=true`, so a reboot never re-seeds over data you already have. To (re)populate an existing DB, or to add the applications/chat/notification volume (not seeded at boot), run `pnpm db:seed:dev`. Wipe and start clean with `pnpm docker:reset`.

`pnpm db:seed` / `db:spam` are thin host-side orchestrators (`scripts/seed.mjs` / `scripts/spam.mjs`) that shell into each service container in dependency order (auth → rescue → pets → applications → chat → notifications) — see the script headers for the ordering and why they must not import workspace packages from the host. Synthetic photos are real, species-matched LoremFlickr URLs stored on the pet; the gateway surfaces them (and the breed name) through the list/detail responses.

## Testing

### Run Tests

The backend services use **Vitest**. Run from the relevant `services/<name>` package (or via `pnpm exec turbo test --filter=@adopt-dont-shop/service.<name>` at the root).

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# Specific test file (tests are colocated with source; Vitest takes a path or substring filter)
pnpm test src/grpc/handlers.test.ts
```

Load-testing and performance-profiling scripts are not yet set up.

## Health Monitoring

### Health Check Endpoints

The gateway exposes a single liveness probe; backing services are reachable over gRPC only, not HTTP, so there is no aggregated HTTP `/health` route to call against the gateway.

```bash
# Simple liveness check (cheap, for load balancers / compose healthchecks)
GET http://localhost:4000/health/simple
```

Each backing service publishes its own structured health over gRPC + Prometheus metrics — see [`docs/observability/tracing.md`](../observability/tracing.md) for the full observability surface.

## Docker Deployment

### Development

```bash
# Start the full dev stack via the preflight wrapper (recommended)
pnpm docker:dev

# Start one service in the foreground (useful for debugging a single service)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up service-auth

# View logs for a specific service
pnpm docker:logs                    # follow all services
docker compose logs -f service-auth # one service
```

### Production

```bash
# Build a service's production image (multi-stage target; each service ships its own Dockerfile)
docker build \
  --target production \
  -t adoptdontshop/gateway:latest \
  -f services/gateway/Dockerfile .

# Run production container (the gateway listens on 4000 — GATEWAY_PORT, default 4000)
docker run -p 4000:4000 \
  --env-file .env.production \
  adoptdontshop/gateway:latest
```

The root `docker-compose.prod.yml` overlay exercises this path end-to-end — see [Deployment Guide](./deployment.md) and [Docker Infrastructure Guide](../DOCKER.md).

## Common Tasks

### Add a new API endpoint

The gateway is the only HTTP edge. Domain logic lives in a gRPC microservice; the gateway route translates REST → gRPC.

1. **Define / extend the proto** in `packages/proto/proto/<domain>.v1.proto`, regenerate (`pnpm exec turbo build --filter=@adopt-dont-shop/proto`), and implement the new RPC in `services/<domain>/src/grpc/handlers.ts` with a co-located `*.test.ts`.
2. **Add the gateway route** in `services/gateway/src/routes/<domain>.ts` — register a Fastify route that validates input with the shared zod schemas in `lib.validation`, calls the gRPC client, and maps the response with the generated proto JSON helpers.
3. **Wire the route** in `services/gateway/src/server.ts` (or its existing per-domain registration helper).
4. **Permission-gate** the route via the `requirePermission(...)` Fastify hook from `@adopt-dont-shop/authz`.

### Add a database table

1. **Create the migration** by copying the latest file in the owning service's `services/<name>/src/migrations/` and renaming it with the next number (`NNN_create_my_table.ts` — 3-digit zero-padded prefix then snake_case; the `node-pg-migrate` runner picks files up in lexicographic order, no generator). Author both `up()` and `down()`.
2. **Restart the service** — its boot CMD runs `pnpm run --if-present db:migrate` and applies the new migration, or run it explicitly with `docker compose exec service-<name> pnpm db:migrate`.
3. **Update the gRPC handlers** in `services/<name>/src/grpc/` to read/write the new table via the connection from `@adopt-dont-shop/db`. Direct parameterised SQL — there is no ORM.
4. **Add seed rows** (optional) by extending `services/<name>/src/db/seed-data.ts` + `seed.ts`. Keep inserts idempotent with `ON CONFLICT DO UPDATE`.

### Update an email template

Templates are stored as `notifications.email_templates` rows (not files) and edited through the admin UI / the gateway's `/api/v1/email/templates/*` admin routes. To preview a template against sample data:

```bash
curl -X POST http://localhost:4000/api/v1/email/templates/<templateId>/preview \
  -H "Authorization: Bearer <admin token>" \
  -H "Content-Type: application/json" \
  -d '{ "variables": { "firstName": "Ada" } }'
```

To add a brand-new template, `POST /api/v1/email/templates` with the template body + subject + variables, or insert a seed row in `services/notifications/src/db/seed.ts` for it to land on every fresh stack.

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps database

# Nuclear reset (wipes the volume, then re-initializes)
pnpm docker:reset
pnpm docker:dev:detach   # each service runs its own db:migrate + db:seed on boot
pnpm db:seed             # re-run if you need to top up seed rows after boot
```

### Email Not Sending

```bash
# Follow the notifications service logs and look for the Ethereal init line
docker compose logs -f service-notifications

# Render a template against sample data without sending — POST to the
# notifications admin route on the gateway (admin auth required).
curl -X POST http://localhost:4000/api/v1/email/templates/<templateId>/preview \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "variables": {} }'
```

### File Upload Failures

The local storage provider writes under `services/<owning-service>/uploads/` (e.g. pet media under `service-pets`). Check the directory exists and is writable by the container's non-root user.

```bash
docker compose exec service-pets ls -la uploads/
```

If you have to wipe local upload state, run `pnpm docker:reset` to drop the named volumes and re-start the stack.

### Performance Issues

```bash
# Trace requests end-to-end via the observability stack (see docs/observability/tracing.md).
# Prometheus + Tempo + Loki are wired in `docker-compose.yml` under the `observability` profile.
```

Load-testing and performance-profiling scripts are not yet set up.

## Best Practices

### Code Organization

- One feature per service file
- Keep controllers thin (delegate to services)
- Use TypeScript types consistently
- Write tests for all services
- Document complex business logic

### Database

- Use migrations for schema changes
- Never modify existing migrations
- Add indexes for frequently queried fields
- Use soft deletes for important data
- Include timestamps on all tables

### Security

- Never commit secrets to git
- Use environment variables for config
- Validate all user input
- Sanitize data before storage
- Use parameterized queries only

### Performance

- Add pagination to all list endpoints
- Use database indexes strategically
- Cache expensive queries
- Optimize N+1 queries
- Monitor slow queries

## Additional Resources

- **API Reference**: [api-endpoints.md](./api-endpoints.md)
- **Database Schema**: [database-schema.md](./database-schema.md)
- **Testing Guide**: [testing.md](./testing.md)
- **Deployment Guide**: [deployment.md](./deployment.md)
- **Troubleshooting**: [troubleshooting.md](./troubleshooting.md)
