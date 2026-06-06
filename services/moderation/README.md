# service.moderation

Moderation vertical — Phase 8 of the microservices migration.

Owns the `moderation.*` schema (Report, ModeratorAction,
ModerationEvidence, UserSanction, SupportTicket, SupportTicketResponse)
and exposes `ModerationService` over gRPC. Cross-cutting reads via
gRPC; consumes events (`chat.messageCreated`, `pets.created`,
`applications.submitted`) for content scanning + auto-report triggers.

## What's shipped so far

**Phase 8.1** — boot skeleton: `/health/simple` on `MODERATION_PORT`
(default 5007), OpenTelemetry boot, env-validated config.

## What's NOT here yet

- **Phase 8.2** — `moderation.*` schema + migrations.
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
