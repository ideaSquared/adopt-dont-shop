# Product Requirements Document: Backend Service

> **Status — architecture section is historical.** The product
> requirements (auth, user, pet, application, chat, moderation,
> matching surfaces) below still describe what the system does. The
> "Architecture Overview" describes the deleted monolith and is kept
> for context. The current architecture is a Fastify gateway fronting
> a fleet of Node.js gRPC microservices (`services/gateway/` plus
> `services/{auth,pets,rescue,applications,chat,notifications,
> moderation,matching,cms,audit}/`). For current implementation
> details see [`docs/backend/implementation-guide.md`](./implementation-guide.md)
> and [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../infrastructure/MICROSERVICES-STANDARDS.md).

## Overview

The Backend Service is the core API and data management layer that powers all applications in the Adopt Don't Shop ecosystem. It provides secure, scalable, and reliable backend services for user management, pet data, adoption workflows, communication, and reporting.

## Architecture Overview (historical — see banner above)

- **Service Type**: RESTful API with WebSocket support
- **Technology**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Sequelize ORM (PostGIS for spatial queries)
- **Authentication**: JWT-based with role-based access control (RBAC) and optional TOTP MFA
- **Real-time**: Socket.IO for chat, presence, and live notifications
- **Storage**: Pluggable provider (`STORAGE_PROVIDER` env). Default `local` in dev; `s3` provider scaffolded for production (vendor-pluggable)
- **Background jobs**: BullMQ on Redis (reports worker, retention worker, legal reminders)
- **Observability**: Prometheus metrics, Winston structured logs, Sentry (prod/staging only)

## Core Modules

### 1. Authentication & Authorization

- User registration with email verification
- Secure login with JWT access tokens (15 min) + refresh token rotation with `family_id` revocation
- Password reset and recovery
- Brute force protection (5-attempt account lockout) + auth rate limiters
- Role-based access control via `Role` / `Permission` / `RolePermission` / `UserRole` models
- Optional TOTP MFA with encrypted secret storage and backup codes
- CSRF protection on all state-changing routes

### 2. User Management

- Complete user profile management
- Account verification and activation
- Notification, privacy, and consent preferences
- Data export (GDPR Art. 20) via `/api/v1/privacy/me/export`
- Account deletion (GDPR Art. 17) via `/api/v1/privacy/me/delete` with 30-day grace + retention worker anonymization
- Field-level access restrictions via `FieldPermission` model + `middleware/field-permissions.ts`

*Out of scope (not implemented):* OAuth / social login / external-account linking. Defer to roadmap.

### 3. Rescue Management

- Rescue organization registration and verification (Companies House + Charity Commission lookups)
- Profile and contact information management
- Staff/volunteer account management via `StaffMember` + `Invitation` models
- Rescue-specific settings and configuration (`RescueSettings`)
- Performance metrics surfaced via dashboard endpoints

### 4. Pet Management

- Pet registration with comprehensive profiles (`Pet` model)
- Advanced search with filtering, sorting, and PostGIS radius queries (`pet.service.ts:searchPets`)
- Photo management with multiple images (`PetMedia`) — uploads gated by AV provider
- Status workflow via `PetStatusTransition` append-only event log (`AVAILABLE / PENDING / ADOPTED / FOSTER / MEDICAL_HOLD / BEHAVIORAL_HOLD / NOT_AVAILABLE / DECEASED`)
- Behavioural / temperament data captured as Pet columns
- Foster placement coordination (see §11)

*Partial:* Medical records carried as inline JSON columns; dedicated `MedicalRecord` timeline is roadmap.

### 5. Application Processing

- Dynamic application forms with validation (`ApplicationQuestion` + `ApplicationAnswer`)
- Status transition workflow via `ApplicationStatusTransition` event log
- Reference management via `ApplicationReference` (manual update flow; automated reference-email verification is roadmap)
- Decision tracking with `ApplicationTimeline`
- Home-visit scheduling/outcome propagation via `HomeVisit` model
- Communication integration: chats can be linked to `applicationId`
- Document management via `applicationDocumentUpload` (`file-upload.service.ts`)
- Bulk operations via `/api/v1/applications/bulk-update`
- Core application question library seeded via `question.service.ts`

**Application status model (current, authoritative):**

`ApplicationStatus = SUBMITTED | APPROVED | REJECTED | WITHDRAWN`

Frontend `ApplicationStage` (PENDING / REVIEWING / VISITING / DECIDING / RESOLVED) is a UI-only presentation layer derived from status + home-visit + reference data via `app.rescue/src/services/applicationService.ts:mapStatusToStage`. It does not exist as a backend column. Allowed status transitions: `SUBMITTED → {APPROVED, REJECTED, WITHDRAWN}`; terminal statuses cannot transition.

### 6. Communication System

- Real-time messaging with Socket.IO (`socket-handlers.ts`)
- Message history with full-text search (`messageSearch.service.ts`)
- Conversation/thread management (`Chat`, `ChatParticipant`)
- Message reactions (`MessageReaction`)
- File/image sharing (subject to AV scan — see §Security)
- Read receipts (`MessageRead`)
- Typing indicators
- Email and push alerts for offline users (push channel scaffolded — see §7)
- Content moderation via `content-moderation.service.ts` (regex-rule-based, severity tiers)

*Not implemented:* Offline message queueing/replay for users offline at send time. Currently relies on push + email fallback. Deferred to roadmap.

### 7. Notification System

- **Multi-channel delivery scaffold**: in-app (real), email (real via Resend in prod), push (scaffold + console provider in dev; FCM/APNs provider pluggable), SMS (scaffold + console provider in dev; Twilio provider pluggable). See "Provider scaffolds" below.
- Centralized notification center via `Notification` model + `/api/v1/notifications` routes
- User preference management via `UserNotificationPrefs`
- Real-time alerts via Socket.IO `analytics-emitter.ts`
- Template-based notifications via `EmailTemplate` + `EmailTemplateVersion`
- Read status tracking
- Batch processing (`validateBulkNotification`)
- Quiet hours enforcement in `notificationChannelService.ts`
- Device token registration via `POST /api/v1/devices`, `DELETE /api/v1/devices/:id`, `GET /api/v1/devices` (backed by `DeviceToken` model)

*Roadmap:* Scheduled notification dispatcher worker (`scheduledFor` column exists but no scheduler job yet), email digests, A/B testing.

### 8. Email Service

- Transactional emails via pluggable provider (`EMAIL_PROVIDER` env)
- **Providers shipped**: Console (dev default), Ethereal (dev), Resend (production)
- Template management via `EmailTemplate` + versioned `EmailTemplateVersion`
- Multi-language scaffold: `locale` column exists; English-only content shipped today
- Queue management with retry and bounce tracking (`EmailQueue`)
- Delivery webhook handler for provider callbacks
- Variable substitution + conditionals via template engine
- Unsubscribe token hashing (`utils/secrets.ts`)

*PRD note:* The original PRD listed SendGrid + AWS SES as production providers. Actual implementation ships **Resend** as the production provider. Add SendGrid/SES later only if business need arises.

*Roadmap:* A/B testing, dynamic segmentation, full personalization engine.

### 9. Analytics & Reporting

- User behaviour / engagement tracking via `analytics.routes.ts`
- Adoption metrics + dashboard aggregates via `dashboard.routes.ts`
- Platform performance monitoring via Prometheus metrics (`middleware/metrics.ts`)
- Custom reports framework: `SavedReport`, `ScheduledReport`, `ReportTemplate`, `ReportShare`, `workers/reports.worker.ts`, 13 endpoints in `reports.routes.ts`
- Real-time dashboards for admins

*Not in scope:* Trend forecasting, financial/revenue reporting (no monetization model in code).

### 10. Configuration

- **Feature flags**: Owned by Statsig. Frontend reads gates via `lib.feature-flags`. The backend feature-flag system was removed; the backend is no longer a source of truth for flag state. See `lib.feature-flags/src/index.ts:13` for migration note.
- **Platform configuration**: `configuration.service.ts` uses an in-memory map of defaults. Runtime configuration is not persisted — this is an accepted trade-off; environment variables remain the persisted-config mechanism.
- **Question library**: Core application questions managed via `question.service.ts` + seed data.
- **Notification routing rules**: Currently baked into `notificationChannelService.ts` (channel selection by notification type + user prefs). Runtime configurability deferred.

### 11. Foster Coordination

- `FosterPlacement` model (`FosterPlacement.ts`; PK: `placementId`; FKs: `petId`, `fosterUserId`, `rescueId`; columns: `startDate`, `endDate`, `status` (`active | completed | cancelled`), `notes`)
- Routes mounted at `/api/v1/foster` (see `foster.routes.ts`):
  - `POST /placements` — create (triggers Pet status transition to `FOSTER`)
  - `GET /placements` — list (filtered by current user's rescue/user scope)
  - `GET /placements/:id` — detail
  - `POST /placements/:id/end` — end placement; `outcome` is one of `return_to_rescue` | `adopted_by_foster` | `cancelled`, which drives the corresponding Pet status transition
- RBAC: `rescue_staff` for their own rescue; `admin` / `super_admin` global; `support_agent` read-only

## Performance Requirements

### Response Time Targets

- Authentication: < 200ms p95
- Search Queries: < 500ms p95
- Data Retrieval: < 300ms p95
- File Upload: < 2 seconds (5MB)
- Real-time Messages: < 100ms

Targets are measured via Prometheus histograms (`middleware/metrics.ts`); not currently enforced in CI.

### Scalability Targets

- Concurrent Users: 10,000+
- Database Performance: 1,000+ queries/second
- File Storage: 100GB+ capacity
- API Throughput: 5,000+ requests/minute
- Message Volume: 10,000+ messages/hour

### Availability Requirements

- System Uptime: 99.9% target (no SLO artefact in repo)
- Health checks: `/health`, `/health/simple`, `/health/ready` (probes DB + Redis + BullMQ)
- Graceful shutdown on SIGTERM/SIGINT with 10s forced-exit timeout

## Security Requirements

### Authentication Security

- bcrypt password hashing (salt rounds ≥ 12)
- 15-minute JWT access tokens
- Refresh token rotation with `family_id` revocation
- CSRF protection mounted on `/api`
- Brute-force protection: 5-attempt account lockout + auth rate limiter + per-email login limiter

### Data Protection

- Encryption at rest for highly sensitive data (currently: 2FA secrets via AES-256-GCM in `utils/secrets.ts`). Broader PII column encryption is roadmap.
- TLS 1.3 terminated at nginx (out of repo)
- HSTS + strict CSP + helmet headers configured in `index.ts`
- Comprehensive input validation (express-validator + zod schemas in `schemas/`)
- Parameterized queries via Sequelize
- Restricted CORS allowlist (wildcard rejected at startup)

### Access Control

- Role-based permission system (`Role` / `Permission` / `RolePermission` / `UserRole`)
- Active roles: `adopter | rescue_staff | admin | moderator | super_admin | support_agent`
- Field-level access restrictions via `FieldPermission` + `middleware/field-permissions.ts`
- Complete audit logging via `auditLog.service.ts` with immutable trigger
- API rate limiting (general + auth-specific + search-specific)
- Metrics endpoint gated by `METRICS_AUTH_TOKEN`

### File Upload Security

- Pluggable AV provider via `AV_PROVIDER` env (default `noop` in dev; `clamav` provider available in prod)
- `noop` provider passes all uploads (development-friendly)
- Production requires explicit `AV_PROVIDER=clamav` — startup validation fails fast if unset
- Image processing via `sharp` (resize + thumbnail)
- Secure temporary URLs for uploads via HMAC-signed paths with 5-minute TTL (`upload-serve.routes.ts`)

## Monitoring & Observability

- Performance metrics via prom-client (`middleware/metrics.ts`); scrape endpoint `metrics.routes.ts`
- Default metrics (heap, GC, event loop, CPU) via `prom-client.collectDefaultMetrics`
- Structured logging via Winston (`utils/logger.ts`)
- Sentry integration (`config/sentry.ts`) — enabled only in prod/staging; includes httpIntegration + profilingIntegration via `@sentry/profiling-node`

## Integration Requirements

### Email

- **Provider abstraction**: `email.service.ts:57-110` factory switched on `EMAIL_PROVIDER` env
- **Providers**: Console, Ethereal, Resend (production)
- **Webhook**: Delivery callbacks via `controllers/email.controller.ts:handleDeliveryWebhook`

### File Storage

- **Provider abstraction**: `services/storage/index.ts` factory switched on `STORAGE_PROVIDER` env
- **Providers**: `local` (dev default); `s3` scaffolded (vendor-pluggable; `@aws-sdk/client-s3`). S3 provider throws on init without creds.
- Image processing and optimisation via `sharp`
- Secure temporary HMAC-signed URLs for serving uploads

### SMS

- **Provider abstraction**: `services/sms-providers/index.ts` factory switched on `SMS_PROVIDER` env
- **Providers**: `console` (dev default); `twilio` scaffolded (vendor-pluggable)

### Push Notifications

- **Provider abstraction**: `services/push-providers/index.ts` factory switched on `PUSH_PROVIDER` env
- **Providers**: `console` (dev default — logs); `fcm` scaffolded (vendor-pluggable for FCM/APNs)
- **Device token registration**: `POST /api/v1/devices`, `DELETE /api/v1/devices/:id`, `GET /api/v1/devices`

### Antivirus

- **Provider abstraction**: `services/av-providers/index.ts` factory switched on `AV_PROVIDER` env
- **Providers**: `noop` (dev default — passes all); `clamav` (vendor-pluggable for production)

### Out of Scope

- Payment processing (no monetization model in code)
- Map services (PostGIS used for spatial queries; no Google Maps integration)
- Social media integration
- Analytics SDKs (frontend concern)

## Deployment & DevOps

### Containerization

- Docker multi-stage builds (`Dockerfile.app`)
- Docker Compose for dev/staging/prod orchestration
- Health check endpoints (see above)
- Graceful shutdown procedures

### CI/CD Pipeline

- Automated tests in `.github/workflows/ci.yml` and `quality.yml`
- Code quality checks (ESLint, Prettier, type-check)
- Security vulnerability scanning (`codeql.yml`, `security.yml`)
- Zero-downtime deployment (`deploy.yml`) + rollback workflow (`rollback.yml`)

### Environment Management

- `config/env.ts` validates required env vars at startup
- Production env requires explicit `STORAGE_PROVIDER`, `EMAIL_PROVIDER`, `AV_PROVIDER`, `PUSH_PROVIDER`, `SMS_PROVIDER` (no silent defaults beyond dev)
- Database migrations via `migrations/runner.ts` (62 baseline migrations)
- Automated backup script `scripts/db-backup.sh`; scheduled backup orchestration is deployment-pipeline concern

## Compliance & Governance

### Data Privacy

- GDPR Art. 20 (data export): `/api/v1/privacy/me/export`
- GDPR Art. 17 (erasure): `/api/v1/privacy/me/delete` with 30-day grace + anonymization via retention worker
- Automated retention via `jobs/retention.job.ts` + `data-retention.service.ts`
- Consent management via `consent.service.ts` + `UserConsent` model + `/consent` + `/cookies-consent` endpoints
- Same endpoints satisfy CCPA basic rights; California-specific opt-out signal handling is roadmap

### Security Standards

- OWASP guidelines: many controls covered (CSRF, XSS via CSP, SQLi via ORM, rate limits, headers); no formal OWASP audit checklist artefact
- SOC 2 / ISO 27001: organization-level concerns, not in-repo
- PCI DSS: not applicable (no payment processing)

## Future Roadmap

### Near Term

- Wire ClamAV / production AV vendor
- Wire FCM/APNs provider for push
- Wire Twilio (or alternative) for SMS
- Wire S3 storage provider for production
- Scheduled-notification dispatcher worker
- Email digest job
- PII column encryption beyond 2FA secrets

### Medium Term

- Foster reporting & analytics surfaces
- Application reference-check automation (email round-trip)
- Recommendation service (see `docs/frontend/recommendations-plan.md` once written)
- Email A/B testing
- OAuth / social login

### Deferred / De-scoped from earlier PRDs

- **GraphQL support** — not pursued; REST + WebSocket sufficient
- **Multi-tenant architecture** — rescue-scoped authorization is the de-facto tenant boundary; no `tenant_id` scaffolding planned
- **Microservices migration** — monolith remains the design
- **Event sourcing / CQRS** — not pursued
- **Financial / revenue reporting** — no monetization model
- **Blockchain pet records, IoT, multi-region** — out of scope

## Additional Resources

- **API Reference**: [api-endpoints.md](./api-endpoints.md)
- **Implementation Guide**: [implementation-guide.md](./implementation-guide.md)
- **Database Schema**: [database-schema.md](./database-schema.md)
- **Deployment Guide**: [deployment.md](./deployment.md)
- **Testing Strategy**: [testing.md](./testing.md)
