# service.cms

## Purpose

Content management for public-facing pages — help articles, blog posts, static
pages — and navigation menus. Owns the content lifecycle (draft → published →
unpublished → archived) with per-edit version history, serves the **public**
read surface unauthenticated, and gates all authoring behind `cms.*`
permissions. Owns the `cms` schema.

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. Self-contained — **no**
outbound cross-service gRPC calls. Publishes content + menu lifecycle events on
NATS for downstream consumers (search indexing, cache invalidation). Depends on
the shared backend packages `@adopt-dont-shop/{authz, config-secrets, db,
events, lib.types, observability, proto, service-bootstrap}`.

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm db:migrate   # run pending migrations (node-pg-migrate)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Running locally

In the Docker dev stack (primary workflow) this runs as container
`service-cms`, HTTP published on `127.0.0.1:5010`:

```bash
pnpm docker:dev:detach                  # start the whole stack
docker compose logs -f service-cms      # follow just this service
curl localhost:5010/health/simple       # liveness probe
# Expected: {"status":"ok","service":"@adopt-dont-shop/service.cms","environment":"development"}
```

Bare-metal (this service alone, against host Postgres + NATS from
`pnpm dev:services`):

```bash
DATABASE_URL=postgres://adopt_user:adopt_pass@localhost:5432/adopt_dont_shop_dev \
NATS_URL=nats://localhost:4222 \
pnpm --filter @adopt-dont-shop/service.cms dev
```

To debug the container, see
[`docs/runbooks/dev-stack-troubleshooting.md`](../../docs/runbooks/dev-stack-troubleshooting.md).

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `CmsService`
(`packages/proto/proto/adopt_dont_shop/cms/v1/cms.proto`), proxied by the
gateway under `/api/v1/cms/*`. Admin / `super_admin` short-circuit the
permission check.

| RPC                                                                     | Permission            |
| ----------------------------------------------------------------------- | --------------------- |
| `ListPublicContent` / `GetPublicContentBySlug`                          | none (public)         |
| `ListContent` / `GetContent` / `GetContentBySlug` / `GetVersionHistory` | `cms.content.read`    |
| `CreateContent`                                                         | `cms.content.create`  |
| `UpdateContent` / `RestoreVersion`                                      | `cms.content.update`  |
| `DeleteContent`                                                         | `cms.content.delete`  |
| `PublishContent` / `UnpublishContent` / `ArchiveContent`                | `cms.content.publish` |
| `ListMenus` / `GetMenu`                                                 | `cms.menu.read`       |
| `CreateMenu`                                                            | `cms.menu.create`     |
| `UpdateMenu`                                                            | `cms.menu.update`     |
| `DeleteMenu`                                                            | `cms.menu.delete`     |

Schema (`cms`): `cms_content` (pages / posts / help articles with status +
per-edit version history) and `cms_navigation_menus` (nestable menu trees).
Migrations: `src/migrations/001`–`005`.

**NATS** — emits (publish-after-commit): `cms.contentCreated`,
`cms.contentUpdated`, `cms.contentDeleted`, `cms.contentPublished`,
`cms.contentUnpublished`, `cms.contentArchived`, `cms.contentRestored`,
`cms.menuCreated`, `cms.menuUpdated`, `cms.menuDeleted`. Consumes
`gdpr.erasureRequested` (erases the user's CMS-authored rows, then publishes
`gdpr.erasureCompleted`; durable `gdpr-cms`).

## Environment variables consumed

`DATABASE_URL` is **required** (boot fails fast without it). `CMS_PORT`
(5010), `CMS_GRPC_PORT` (6010), `CMS_HOST`, `CMS_SCHEMA` (`cms`), and
`NATS_URL` have dev defaults, plus the standard
`@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. Handlers are pure functions `(deps, principal, request) →
Promise<response>` with the DB pool + NATS injected — assert every
PERMISSION_DENIED / INVALID_ARGUMENT / NOT_FOUND path, the
public-vs-authenticated split, version-history capture + restore, and
publish-after-commit ordering (the event fires only after `COMMIT`). See
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
