# service.moderation

Moderation vertical — Phase 8 of the microservices migration.

Owns the `moderation.*` schema (Report, ReportStatusTransition,
ModeratorAction, ModerationEvidence, UserSanction, SupportTicket,
SupportTicketResponse) and exposes `ModerationService` over gRPC. Cross-cutting reads via
gRPC; consumes events (`chat.messageCreated`, `pets.created`,
`applications.submitted`) for content scanning + auto-report triggers.

## What's shipped so far

**Phase 8.1** — boot skeleton: `/health/simple` on `MODERATION_PORT`
(default 5007), OpenTelemetry boot, env-validated config.

**Phase 8.2** — `moderation.*` schema + migrations:
- `001_create_reports.ts` — reports with polymorphic
  (reported_entity_type, reported_entity_id).
- `002_create_report_status_transitions.ts` — append-only history
  feeding back into `reports.status`.
- `003_install_report_status_propagation_trigger.ts` — AFTER
  INSERT trigger that updates `reports.status` from
  `to_status`; DB owns the invariant.
- `004_create_moderator_actions.ts` — append-only history with
  `acknowledged_at` folded in from monolith migration 08.
- `005_create_moderation_evidence.ts` — polymorphic via
  (parent_type, parent_id) where parent_type is the enum
  discriminator.
- `006_create_user_sanctions.ts` — append-only sanction history
  with appeal + revocation columns and the
  `(user_id, is_active, end_date)` hot-path compound idx.
- `007_create_support_tickets.ts` — text[] tags with GIN idx,
  status/priority/category enums.
- `008_create_support_ticket_responses.ts` — paranoid with
  `deleted_at` idx, intra-schema FK to support_tickets with
  CASCADE.
- Run via `pnpm db:migrate` (uses `@adopt-dont-shop/db` —
  inherits all four CAD-lesson fixes).

## What's NOT here yet

- **Phase 8.3** — gRPC `ModerationService` (file-report, moderator
  action, evidence upload, user sanction, support ticket).
- **Phase 8.4** — NATS subscribers on `chat.messageCreated`,
  `pets.created`, `applications.submitted`.
- **Phase 8.5** — Gateway routes `/api/moderation/*`.
- **Phase 8.6** — Cutover.

## Configuration

| Env var                | Default            | Required | Purpose                         |
| ---------------------- | ------------------ | -------- | ------------------------------- |
| `MODERATION_PORT`      | `5007`             |          | HTTP port for `/health/simple`. |
| `MODERATION_GRPC_PORT` | `6007`             |          | gRPC port (Phase 8.3c).         |
| `MODERATION_HOST`      | `0.0.0.0`          |          | Bind interface.                 |
| `MODERATION_SCHEMA`    | `moderation`       |          | Postgres schema.                |
| `DATABASE_URL`         | —                  | ✅       | Postgres connection string.     |
| `NATS_URL`             | `nats://nats:4222` |          | NATS bus URL.                   |
| `NODE_ENV`             | `development`      |          | Surfaces in health + logs.      |

---

## Canonical reference (ADS-817)

### Responsibility

Owns content moderation and user discipline: report filing, moderator
assignment / resolution, logged moderator actions + evidence, user sanctions
(warnings, restrictions, bans) + appeals, and support tickets. Subscribes to
content events from other services to auto-scan and auto-file reports as the
system user. Schema: `moderation`.

### Schema (`moderation`)

| Table | Purpose |
| --- | --- |
| `reports` | User/staff/system-filed reports of violations. |
| `report_status_transitions` | Report state-change audit. |
| `moderator_actions` | Logged actions (warn, remove, suspend, ban, restrict). |
| `moderation_evidence` | Polymorphic evidence attached to reports/actions. |
| `user_sanctions` | Sanctions — warning / restriction / temporary or permanent ban. |
| `support_tickets` | User support requests. |
| `support_ticket_responses` | Staff + user responses on a ticket. |

Migrations: `services/moderation/src/migrations/001`–`011` (003 installs a
status-propagation trigger).

### gRPC RPCs

`ModerationService`. `super_admin` / admin bypass.

| RPC | Permission |
| --- | --- |
| `FileReport` | authenticated (any user) |
| `GetReport` | `moderation.reports.view` (reporter may read own) |
| `ListReports` | `moderation.reports.view` |
| `AssignReport` | `moderation.reports.manage` |
| `ResolveReport` | `moderation.reports.manage` |
| `LogModeratorAction` | `moderation.actions.manage` |
| `ListModeratorActions` | `moderation.actions.manage` |
| `AddEvidence` | `moderation.actions.manage` |
| `IssueSanction` | `moderation.sanctions.manage` |
| `ListUserSanctions` | self-scoped; `moderation.sanctions.manage` for others |
| `AppealSanction` | self-scoped (the sanctioned user) |
| `OpenSupportTicket` | authenticated (any user) |
| `GetSupportTicket` | owner, or `moderation.tickets.manage` |
| `ListSupportTickets` | self-scoped; `moderation.tickets.manage` for all |
| `RespondToTicket` | owner, or `moderation.tickets.manage` |

### NATS subjects

**Emits** (publish-after-commit): `moderation.reportFiled`,
`moderation.reportAssigned`, `moderation.reportResolved`,
`moderation.actionLogged`, `moderation.sanctionIssued`,
`moderation.sanctionAppealed`, `moderation.ticketOpened`. Plus
`gdpr.erasureCompleted` as a saga participant.

**Consumes:** `chat.messageCreated`, `pets.created`, `applications.submitted`
(content scanning → auto-report), and `gdpr.erasureRequested` (durable
`gdpr-moderation`).

### Dependencies

`@adopt-dont-shop/{authz, config-secrets, db, events, lib.types, observability,
proto, service-bootstrap}`. No cross-service gRPC calls (composition done at the
gateway).

### Testing strategy

Vitest. Pure handlers split per surface (reports / actions+evidence / sanctions
/ tickets) with pool + NATS injected — assert each permission gate + self-scope
exception, the report/sanction state machines, the content-scanner auto-report
path, and publish-after-commit ordering.
