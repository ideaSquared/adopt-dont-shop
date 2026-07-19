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
[`docs/backend/testing.md`](../../docs/backend/testing.md) for anything not
service-specific.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner
of `/services/`.
