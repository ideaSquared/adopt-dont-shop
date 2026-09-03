# Product Requirements: Backend

What the backend must do — the behavioural contract, performance targets, and roadmap.
Implementation lives elsewhere: for how it is built see
[`implementation-guide.md`](./implementation-guide.md) and
[`../infrastructure/MICROSERVICES-STANDARDS.md`](../infrastructure/MICROSERVICES-STANDARDS.md).
This document states requirements, not code paths; where it names a shape (a status enum, an
endpoint) that shape is the requirement.

## Core capabilities

### 1. Authentication & authorization

- User registration with email verification.
- Login with short-lived access tokens plus refresh-token rotation with family-based revocation.
- Password reset and recovery.
- Brute-force protection: account lockout after repeated failures, plus per-IP and per-email
  rate limiting.
- Role-based access control. Active roles: `adopter | rescue_staff | admin | moderator |
super_admin | support_agent`.
- Optional TOTP MFA with an encrypted secret at rest and backup codes.
- CSRF protection on all state-changing routes.

### 2. User management

- Profile management, account verification and activation.
- Notification, privacy, and consent preferences.
- GDPR data export and erasure (see Compliance below).
- Field-level read/write restrictions by role.

Out of scope: OAuth / social login / external-account linking (roadmap).

### 3. Rescue management

- Rescue-org registration and verification (Companies House + Charity Commission lookups).
- Profile and contact management.
- Staff/volunteer accounts and invitations.
- Rescue-specific settings.
- Performance metrics surfaced through dashboard endpoints.

### 4. Pet management

- Pet profiles with breed, temperament, and behavioural data.
- Search with filtering, sorting, and PostGIS radius queries.
- Multiple photos per pet, with uploads gated by an antivirus scan.
- Status workflow recorded as an append-only transition log:
  `AVAILABLE / PENDING / ADOPTED / FOSTER / MEDICAL_HOLD / BEHAVIORAL_HOLD / NOT_AVAILABLE /
DECEASED`.
- Foster-placement coordination (see §11).

Partial: medical data is carried inline; a dedicated medical-record timeline is roadmap.

### 5. Application processing

- Dynamic application forms with validation.
- Status workflow recorded as a transition log.
- Reference management (manual update flow; automated reference-email verification is roadmap).
- Decision tracking on an application timeline.
- Home-visit scheduling and outcome propagation.
- Chats may be linked to an application.
- Document upload.
- Bulk operations via `POST /api/v1/applications/bulk-update`.

Application status model (authoritative): `SUBMITTED | APPROVED | REJECTED | WITHDRAWN`, plus
`DRAFT` as the initial state. Allowed transitions: `SUBMITTED → {APPROVED, REJECTED,
WITHDRAWN}`; terminal statuses cannot transition. The frontend `ApplicationStage`
(PENDING / REVIEWING / VISITING / DECIDING / RESOLVED) is a UI-only presentation layer derived
from status + home-visit + reference data.

### 6. Communication

- Real-time messaging over Socket.IO.
- Message history with full-text search.
- Conversation/thread management, reactions, read receipts.
- File/image sharing (AV-scanned).
- Email alerts for offline users (push channel scaffolded — see §7).
- Rule-based content moderation with severity tiers.

Not implemented: offline message queueing/replay; relies on email fallback (roadmap).

### 7. Notifications

- Channels: in-app (real), email (real via Resend in prod), push and SMS (scaffolded with a
  console provider in dev; FCM/APNs and Twilio providers pluggable).
- Centralized notification centre with per-user preferences and quiet hours.
- Template-based content with versioned templates.
- Real-time in-app alerts over Socket.IO.
- Device-token registration: `POST /api/v1/devices`, `DELETE /api/v1/devices/:id`,
  `GET /api/v1/devices`.

Roadmap: email digests, A/B testing. A scheduled-dispatch tick scheduler exists in the audit
service (report schedules); a general notification scheduler is roadmap.

### 8. Email

- Transactional email through a pluggable provider (`EMAIL_PROVIDER`): Console (dev default),
  Ethereal (dev), Resend (production).
- Versioned templates with variable substitution.
- Delivery-webhook handling for provider callbacks.
- English-only content today; a locale field exists for future multi-language.

Roadmap: A/B testing, segmentation, personalization.

### 9. Analytics & reporting

- Engagement and adoption metrics; admin dashboards.
- Saved and scheduled reports with report templates and sharing.
- Platform metrics via Prometheus.

Not in scope: trend forecasting, financial/revenue reporting.

### 10. Configuration

- Feature flags are owned by Statsig and read on the frontend via `lib.feature-flags`; the
  backend is not a source of truth for flag state.
- Platform configuration defaults are in-memory; environment variables remain the persisted
  mechanism.
- Application question library managed via seed data.

### 11. Foster coordination

- Foster placements link a pet, a foster user, and a rescue, with start/end dates and status
  (`active | completed | cancelled`).
- Routes under `/api/v1/foster`: create (triggers a pet transition to `FOSTER`), list, detail,
  and end (whose outcome drives the corresponding pet transition).
- RBAC: `rescue_staff` for their own rescue; `admin` / `super_admin` global; `support_agent`
  read-only.

## Performance requirements

Response-time targets (p95): authentication < 200 ms, search < 500 ms, data retrieval < 300 ms,
file upload (5 MB) < 2 s, real-time message delivery < 100 ms. Measured via Prometheus
histograms; not enforced in CI.

Scalability targets: 10,000+ concurrent users, 1,000+ queries/s, 100 GB+ storage,
5,000+ requests/min, 10,000+ messages/hour.

Availability: 99.9% uptime target (no SLO artefact in repo). Liveness probe: `GET
/health/simple`. Graceful shutdown on SIGTERM/SIGINT with a forced-exit timeout.

## Security requirements

- Password hashing with bcrypt (salt rounds ≥ 12).
- Short-lived access tokens; refresh-token rotation with family revocation.
- CSRF protection on state-changing routes.
- Brute-force protection: account lockout + per-IP + per-email rate limiters.
- Encryption at rest for the most sensitive data (TOTP secrets today; broader PII column
  encryption is roadmap).
- Strict security headers and a restricted CORS allowlist (wildcard rejected at startup).
- Parameterized SQL everywhere (raw `pg`, no ORM).
- Field-level access restrictions by role.
- Complete audit logging with an append-only store.
- Uploads scanned by a pluggable AV provider (`AV_PROVIDER`); production requires an explicit
  provider and fails fast if unset.

## Observability

- Prometheus metrics (heap, GC, event loop, CPU, plus domain metrics).
- Structured JSON logs to stdout, shipped to Loki.
- Sentry in prod/staging only.

## Integrations

Each external dependency sits behind a provider abstraction selected by an env var, so dev runs
with console/local providers and production wires the real vendor:

| Concern      | Env                | Dev default        | Production          |
| ------------ | ------------------ | ------------------ | ------------------- |
| Email        | `EMAIL_PROVIDER`   | console / ethereal | Resend              |
| File storage | `STORAGE_PROVIDER` | local              | s3 (pluggable)      |
| SMS          | `SMS_PROVIDER`     | console            | Twilio (scaffold)   |
| Push         | `PUSH_PROVIDER`    | console            | FCM/APNs (scaffold) |
| Antivirus    | `AV_PROVIDER`      | noop               | ClamAV              |

## Out of scope

- Payment processing (no monetization model).
- Third-party map services (PostGIS handles spatial queries).
- Social-media integration.
- Frontend analytics SDKs.

## Compliance

- GDPR data export (Art. 20) and erasure (Art. 17). Admin-initiated:
  `GET /api/v1/privacy/admin/users/:userId/export`,
  `POST /api/v1/privacy/admin/users/:userId/delete-request`. User-initiated erasure:
  `POST /api/v1/users/me/erasure-request` (a saga; read progress at
  `GET /api/v1/users/me/erasure-request/:correlationId`).
- Consent management via consent/cookie-consent endpoints; the same surface satisfies basic
  CCPA rights (California-specific opt-out signals are roadmap).
- SOC 2 / ISO 27001 are organization-level concerns, not in-repo. PCI DSS not applicable.

## Deployment

- Multi-stage container builds from the root `Dockerfile.service` (per-service `SERVICE` build
  arg); the frontend apps build from their own Dockerfiles.
- Each service migrates its own schema on start (`packages/db/src/migrate.ts`); migrations live
  under `services/<name>/src/migrations/`.
- CI runs tests, quality checks (ESLint, Prettier, type-check), and security scanning; deploys
  and rollbacks are workflow-driven. The authoritative runbook is
  [`../operations/deploy.md`](../operations/deploy.md).

## Roadmap

Near term: wire production AV/push/SMS/storage vendors; general notification-dispatch scheduler;
email digests; PII column encryption beyond TOTP secrets.

Medium term: foster reporting/analytics; application reference-check automation; recommendation
service; email A/B testing; OAuth / social login.

De-scoped: GraphQL (REST + WebSocket suffice); multi-tenant `tenant_id` scaffolding
(rescue-scoped authz is the tenant boundary); event sourcing / CQRS; financial reporting;
blockchain / IoT / multi-region.

## Related

- [API endpoints](./api-endpoints.md)
- [Implementation guide](./implementation-guide.md)
- [Database schema](./database-schema.md)
- [Deployment](./deployment.md)
- [Testing](../testing.md)
