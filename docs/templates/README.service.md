<!--
Template for services/<name>/README.md (ADS-946).

Copy this file to services/<name>/README.md and fill in every section —
keep the section order and headings so `pnpm check:readmes` can find them.
Delete this comment block once filled in.
-->

# service.<name>

## Purpose

One paragraph: what domain this service owns and why it's its own service
(what schema / bounded context it's responsible for).

## Location in the architecture

- Link to [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
  for the shared service boundaries / ownership model instead of repeating
  it here.
- Which other services this one calls over gRPC, and which call it.
- Which NATS subjects it publishes / consumes (if any) — link to
  [`docs/backend/implementation-guide.md`](../../docs/backend/implementation-guide.md)
  for the general pattern.

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
pnpm db:migrate   # run pending migrations (node-pg-migrate) — omit if this
                  # service owns no schema
```

## Running locally

One paragraph plus the four commands every service exposes the same way. Fill
in `<name>` (compose service `service-<name>`) and `<httpPort>` (published on
`127.0.0.1:<httpPort>` by `docker-compose.yml`).

In the Docker dev stack (primary workflow):

```bash
pnpm docker:dev:detach                        # start the whole stack
docker compose logs -f service-<name>         # follow just this service
curl localhost:<httpPort>/health/simple       # liveness probe
# Expected: {"status":"ok","service":"@adopt-dont-shop/service.<name>","environment":"development"}
```

Bare-metal (this service alone, against host Postgres + NATS you supply with
`pnpm dev:services`):

```bash
DATABASE_URL=postgres://adopt_user:adopt_pass@localhost:5432/adopt_dont_shop_dev \
NATS_URL=nats://localhost:4222 \
pnpm --filter @adopt-dont-shop/service.<name> dev
```

List any extra **required** env this service needs on top of the two above (see
`## Environment variables consumed`). To debug the container, see
[`docs/runbooks/dev-stack-troubleshooting.md`](../../docs/runbooks/dev-stack-troubleshooting.md).

## REST / gRPC contract

- HTTP surface: `/health/simple` at minimum; list anything else the gateway
  proxies to.
- gRPC: the service name(s) defined in `packages/proto`, and a table of
  RPC → required permission (see other services' READMEs for the format).

## Environment variables consumed

Table of the env vars this service's `config.ts` reads, with defaults and
whether they're required. Link to
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list
rather than duplicating vars shared across services.

## Testing notes

Anything specific to this service's tests: fixtures, stubbed downstream
clients, coverage thresholds set in its own `vitest.config.ts`. Link to
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for anything not
service-specific.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner
of `/services/`.
