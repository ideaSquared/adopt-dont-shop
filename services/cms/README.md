# service.cms

Content management for public-facing pages — help articles, blog posts, static
pages — and navigation menus. CMS owns the content lifecycle (draft → published
→ unpublished → archived) with per-edit version history, serves the **public**
read surface unauthenticated, and gates all authoring behind `cms.*`
permissions.

## Responsibility

- Owns the `cms` Postgres schema: content rows (with version history) and
  navigation-menu trees.
- Public read API: list / get published content by slug — no auth.
- Admin authoring: create / update / delete content, publish / unpublish /
  archive, view + restore versions, and CRUD navigation menus.
- Publishes content + menu lifecycle events on NATS for downstream consumers
  (e.g. search indexing, cache invalidation) and participates in the GDPR
  erasure saga.

## Schema (`cms`)

| Table | Purpose |
| --- | --- |
| `cms_content` | Pages / blog posts / help articles. Holds status (`draft`/`published`/`archived`), slug, body, and per-edit version history. |
| `cms_navigation_menus` | Navigation menu trees (nestable items). |

Migrations: `services/cms/src/migrations/001_create_cms_content.ts`,
`002_create_cms_navigation_menus.ts`, `003_cms_content_author_nullable.ts`.

## gRPC RPCs

`CmsService` (`packages/proto/proto/adopt_dont_shop/cms/v1/cms.proto`). Admin /
super_admin short-circuit the permission check.

| RPC | Permission |
| --- | --- |
| `ListPublicContent` | none (public) |
| `GetPublicContentBySlug` | none (public) |
| `ListContent` | `cms.content.read` |
| `GetContent` | `cms.content.read` |
| `GetContentBySlug` | `cms.content.read` |
| `CreateContent` | `cms.content.create` |
| `UpdateContent` | `cms.content.update` |
| `DeleteContent` | `cms.content.delete` |
| `PublishContent` | `cms.content.publish` |
| `UnpublishContent` | `cms.content.publish` |
| `ArchiveContent` | `cms.content.publish` |
| `GetVersionHistory` | `cms.content.read` |
| `RestoreVersion` | `cms.content.update` |
| `ListMenus` | `cms.menu.read` |
| `GetMenu` | `cms.menu.read` |
| `CreateMenu` | `cms.menu.create` |
| `UpdateMenu` | `cms.menu.update` |
| `DeleteMenu` | `cms.menu.delete` |

## NATS subjects

All published after the DB transaction commits (publish-after-commit).

**Emits:**

| Subject | When |
| --- | --- |
| `cms.contentCreated` | `CreateContent` |
| `cms.contentUpdated` | `UpdateContent` |
| `cms.contentDeleted` | `DeleteContent` |
| `cms.contentPublished` | `PublishContent` |
| `cms.contentUnpublished` | `UnpublishContent` |
| `cms.contentArchived` | `ArchiveContent` |
| `cms.contentRestored` | `RestoreVersion` |
| `cms.menuCreated` | `CreateMenu` |
| `cms.menuUpdated` | `UpdateMenu` |
| `cms.menuDeleted` | `DeleteMenu` |

**Consumes:**

| Subject | Effect |
| --- | --- |
| `gdpr.erasureRequested` | Erases the requesting user's CMS-authored rows in a transaction, then publishes `gdpr.erasureCompleted` (durable `gdpr-cms` consumer). |

## Dependencies

Workspace packages: `@adopt-dont-shop/{authz, config-secrets, db, events,
lib.types, observability, proto, service-bootstrap}`.

Cross-service gRPC calls: **none** — CMS is self-contained.

## Configuration

| Env var | Default | Required | Purpose |
| --- | --- | --- | --- |
| `CMS_PORT` | `5010` | | HTTP port for `/health/simple`. |
| `CMS_GRPC_PORT` | `6010` | | gRPC port `CmsService` binds. |
| `CMS_HOST` | `0.0.0.0` | | Bind interface. |
| `CMS_SCHEMA` | `cms` | | Postgres schema (override for parallel test DBs). |
| `DATABASE_URL` | — | ✅ | Postgres connection string. |
| `NATS_URL` | `nats://nats:4222` | | NATS bus URL. |
| `NODE_ENV` | `development` | | Surfaces in health + logs. |

Plus the standard observability env vars consumed by
`@adopt-dont-shop/observability`.

## Testing strategy

Vitest (`pnpm test`). Handlers are pure functions `(deps, principal, request) →
Promise<response>` with the DB pool + NATS injected, so tests assert behaviour
directly: every PERMISSION_DENIED / INVALID_ARGUMENT / NOT_FOUND path, the
public-vs-authenticated split, version-history capture + restore, and the
publish-after-commit ordering (the event fires only after `COMMIT`). The gRPC
adapter and NATS transport are thin and exercised at the edges.

## Running

```bash
pnpm dev      # hot reload
pnpm build && pnpm start
pnpm db:migrate
```
