# Adopt Don't Shop — Documentation

Documentation for the adopt-don't-shop monorepo, organized by audience. The root [README](../README.md) covers quick-start; this directory holds the deeper reference material.

> CI enforces that every `*.md` file inside `docs/` is linked from this index. See [`scripts/check-docs-index.mjs`](../scripts/check-docs-index.mjs).

## Quick start by role

**Frontend developer**
1. [Component library](../lib.components/README.md)
2. [Client app PRD](./frontend/app-client-prd.md)
3. [Frontend technical architecture](./frontend/technical-architecture.md)

**Backend developer**
1. [Implementation guide](./backend/implementation-guide.md)
2. [API endpoints](./backend/api-endpoints.md)
3. [Database schema](./backend/database-schema.md)
4. [Testing guide](./backend/testing.md)

**DevOps / infra**
1. [Infrastructure overview](./infrastructure/INFRASTRUCTURE.md)
2. [Docker setup](./infrastructure/docker-setup.md)
3. [Docker deep dive](./DOCKER.md)
4. [Backend deployment](./backend/deployment.md)
5. [Secrets management](./SECRETS-MANAGEMENT.md)

**Product**
1. [Backend service PRD](./backend/service-backend-prd.md)
2. [Client app PRD](./frontend/app-client-prd.md)
3. [Rescue app PRD](./frontend/app-rescue-prd.md)
4. [Admin app PRD](./frontend/app-admin-prd.md)

---

## Getting started

- [Root README](../README.md) — repo overview, quick-start, and top-level scripts
- [CONTRIBUTING](../CONTRIBUTING.md) — branch model, commit conventions, PR expectations
- [.github README](../.github/README.md) — GitHub configuration and workflows overview
- [.github workflows README](../.github/workflows/README.md) — CI pipeline reference
- [Pull request template](../.github/pull_request_template.md) — required PR sections

## Architecture

- [ADR 0001 — entity detail pattern](./adr/0001-entity-detail-pattern.md) — canonical pattern for entity detail pages
- [Frontend technical architecture](./frontend/technical-architecture.md) — app shells, routing, state, styling
- [Backend implementation guide](./backend/implementation-guide.md) — controllers → services → models wiring
- [Backend service PRD](./backend/service-backend-prd.md) — backend product requirements
- [Backend deployment](./backend/deployment.md) — how the backend is built and shipped
- [Microservices standards](./infrastructure/MICROSERVICES-STANDARDS.md) — boundaries, contracts, ownership
- [Data standards](./DATA-STANDARDS.md) — naming, identifiers, timestamp / locale conventions

## Frontend development

- [Client app PRD](./frontend/app-client-prd.md) — adopter-facing app requirements
- [Rescue app PRD](./frontend/app-rescue-prd.md) — rescue organization app requirements
- [Admin app PRD](./frontend/app-admin-prd.md) — admin dashboard requirements
- [Frontend implementation plan](./frontend/implementation-plan.md) — phased rescue-app delivery plan
- [Frontend recommendations plan](./frontend/recommendations-plan.md) — UX/recommendation surfaces roadmap
- [React Native + Expo mobile exploration](./frontend/react-native-mobile-migration.md) — exploratory analysis for a future native mobile app
- [Design tokens](../DESIGN_TOKENS.md) — vanilla-extract theme tokens reference
- [Accessibility](./ACCESSIBILITY.md) — WCAG targets, testing checklist, screen-reader notes
- [UK localization](./UK_LOCALIZATION.md) — full localization guide
- [UK localization quick reference](./UK_LOCALIZATION_QUICK_REFERENCE.md) — cheat sheet for copy and formatting
- [app.admin README](../app.admin/README.md) — admin dashboard quick-start
- [app.client README](../app.client/README.md) — client app quick-start
- [app.client contexts README](../app.client/src/contexts/README.md) — context providers reference
- [app.client Statsig feature flags](../app.client/src/docs/STATSIG_FEATURE_FLAGS.md) — gates / configs used by the client app
- [app.rescue README](../app.rescue/README.md) — rescue app quick-start

## Backend development

- [API endpoints](./backend/api-endpoints.md) — REST endpoints reference
- [Database schema](./backend/database-schema.md) — Sequelize models and relationships
- [Implementation guide](./backend/implementation-guide.md) — patterns for controllers, services, middleware
- [Testing](./backend/testing.md) — backend test strategy and Vitest setup
- [Troubleshooting](./backend/troubleshooting.md) — common backend failure modes and fixes
- [Deployment](./backend/deployment.md) — backend build / release pipeline
- [Service backend README](../service.backend/README.md) — service quick-start
- [Service backend seeders README](../service.backend/src/seeders/README.md) — seed data conventions
- [Bootstrap seeder runbook](../service.backend/src/seeders/bootstrap/RUNBOOK.md) — bootstrapping a fresh DB
- [Service backend types README](../service.backend/src/types/README.md) — shared type conventions
- [General testing notes](./testing.md) — cross-cutting test guidance
- [Analytics reports](./ANALYTICS-REPORTS.md) — analytics surface and reporting endpoints

## Libraries

- [Libraries index](./libraries/README.md) — index of every `lib.*` package
- [lib.analytics](../lib.analytics/README.md) — event tracking client
- [lib.api](../lib.api/README.md) — HTTP client, interceptors, auth-token plumbing
- [lib.api architecture](../lib.api/ARCHITECTURE.md) — internal design of the API client
- [lib.applications](../lib.applications/README.md) — adoption application lifecycle
- [lib.audit-logs](../lib.audit-logs/README.md) — audit logging for sensitive actions
- [lib.auth](../lib.auth/README.md) — sessions, two-factor, `AuthProvider` / `useAuth`
- [lib.chat](../lib.chat/README.md) — Socket.IO real-time messaging
- [lib.components](../lib.components/README.md) — shared React component library
- [lib.dev-tools](../lib.dev-tools/README.md) — dev-only tooling
- [lib.discovery](../lib.discovery/README.md) — swipe-based pet discovery sessions
- [lib.feature-flags](../lib.feature-flags/README.md) — Statsig hooks and typed gate constants
- [lib.invitations](../lib.invitations/README.md) — staff / user invitation flows
- [lib.legal](../lib.legal/README.md) — re-acceptance modal, cookie banner, consent service
- [lib.matching](../lib.matching/README.md) — shared types for pet-adopter matching
- [lib.moderation](../lib.moderation/README.md) — reporting and moderation workflow
- [lib.notifications](../lib.notifications/README.md) — email / push / in-app / SMS delivery
- [lib.observability](../lib.observability/README.md) — Sentry init, Web Vitals, consent gate
- [lib.permissions](../lib.permissions/README.md) — RBAC and field-level permission services
- [lib.pets](../lib.pets/README.md) — pets read + write services
- [lib.rescue](../lib.rescue/README.md) — rescue profiles, staff, settings
- [lib.search](../lib.search/README.md) — cross-domain search client
- [lib.support-tickets](../lib.support-tickets/README.md) — support ticket creation / tracking
- [lib.types](../lib.types/README.md) — shared types and constants (zero-dep)
- [lib.utils](../lib.utils/README.md) — formatters, locale, env helpers
- [lib.validation](../lib.validation/README.md) — canonical Zod schemas

### lib.components — component READMEs

- [ListGroup](../lib.components/src/components/data/ListGroup/README.md)
- [Table](../lib.components/src/components/data/Table/README.md)
- [CheckboxInput](../lib.components/src/components/form/CheckboxInput/README.md)
- [DateInput](../lib.components/src/components/form/DateInput/README.md)
- [FileUpload](../lib.components/src/components/form/FileUpload/README.md)
- [FilterPanel](../lib.components/src/components/form/FilterPanel/README.md)
- [MarkdownEditor](../lib.components/src/components/form/MarkdownEditor/README.md)
- [RadioInput](../lib.components/src/components/form/RadioInput/README.md)
- [TextArea](../lib.components/src/components/form/TextArea/README.md)
- [TextInput](../lib.components/src/components/form/TextInput/README.md)
- [BaseSidebar](../lib.components/src/components/layout/BaseSidebar/README.md)
- [Container](../lib.components/src/components/layout/Container/README.md)
- [Stack](../lib.components/src/components/layout/Stack/README.md)
- [DateTime](../lib.components/src/components/ui/DateTime/README.md)
- [DropdownButton](../lib.components/src/components/ui/DropdownButton/README.md)
- [DropdownMenu](../lib.components/src/components/ui/DropdownMenu/README.md)
- [EmptyState](../lib.components/src/components/ui/EmptyState/README.md)
- [ImageGallery](../lib.components/src/components/ui/ImageGallery/README.md)
- [Pagination](../lib.components/src/components/ui/Pagination/README.md)
- [ProgressBar](../lib.components/src/components/ui/ProgressBar/README.md)
- [ThemeToggle](../lib.components/src/components/ui/ThemeToggle/README.md)
- [Toast](../lib.components/src/components/ui/Toast/README.md)
- [Tooltip](../lib.components/src/components/ui/Tooltip/README.md)

## Infrastructure & deployment

- [Infrastructure overview](./infrastructure/INFRASTRUCTURE.md) — environments, components, networking
- [Deployment plan](./infrastructure/DEPLOYMENT-PLAN.md) — phased deployment strategy
- [Docker setup (infrastructure)](./infrastructure/docker-setup.md) — Docker compose layout and overrides
- [New app generator](./infrastructure/new-app-generator.md) — scaffolding a new workspace app
- [Docker deep dive](./DOCKER.md) — root-level Docker reference and tips
- [Infra reference](./INFRA.md) — supporting infra notes
- [E2E README](../e2e/README.md) — Playwright suite layout and conventions
- [Scripts README](../scripts/README.md) — repo automation scripts catalogue
- [Lib template README](../scripts/templates/lib/common/README.md) — template used by `new-lib`

## Operations & runbooks

- [Operations — deploy](./operations/deploy.md) — release procedures
- [Operations — snapshot policy](./operations/snapshot-policy.md) — DB snapshot cadence and retention
- [DB backup runbook](./db-backup-runbook.md) — taking and restoring backups
- [Observability and alerting](./observability-alerting.md) — metrics, logs, alert routing
- [Runbooks index](./runbooks/README.md) — runbook catalogue
- [5xx spike runbook](./runbooks/5xx-spike.md) — diagnose elevated server errors
- [DB pool exhaustion runbook](./runbooks/db-pool-exhaustion.md) — recover from connection saturation
- [Deploy rollback runbook](./runbooks/deploy-rollback.md) — roll back a bad release
- [Maintenance mode runbook](./runbooks/maintenance-mode.md) — engage / disengage maintenance mode
- [Migration failure runbook](./runbooks/migration-failure.md) — recover from a failed DB migration
- [Redis outage runbook](./runbooks/redis-outage.md) — degrade gracefully when Redis is down
- [Documents temp ACL audit](./uploads/documents-temp-acl-audit.md) — audit notes for upload ACLs

## Migrations & upgrades

- [Per-model rebaseline](./migrations/per-model-rebaseline.md) — incremental migration rebaseline workflow
- [Schema audit runbook](./migrations/schema-audit-runbook.md) — verify production schema matches code
- [Schema equivalence runbook](./migrations/schema-equivalence-runbook.md) — compare DB schemas across environments
- [Upgrades index](./upgrades/README.md) — major-version upgrade tracker
- [Express 5 migration](./upgrades/express-5-migration.md) — express 4 → 5 upgrade notes
- [Node 22 migration](./upgrades/node-22-migration.md) — node runtime upgrade notes
- [React 19 migration](./upgrades/react-19-migration.md) — React 18 → 19 upgrade notes
- [Sequelize 7 decorators POC](./upgrades/sequelize-7-decorators-poc.md) — decorator-based model proof of concept
- [Sequelize 7 migration](./upgrades/sequelize-7-migration.md) — Sequelize 6 → 7 upgrade notes
- [`use` hook survey](./upgrades/use-hook-survey.md) — survey of React `use` hook adoption

## Legal & compliance

- [Privacy](./PRIVACY.md) — internal privacy policy reference
- [GDPR ROPA](./GDPR-ROPA.md) — record of processing activities

## Security

- [Security center](./SECURITY-CENTER.md) — security posture overview
- [Secrets management](./SECRETS-MANAGEMENT.md) — how secrets are generated, stored, rotated
- [Backend security policy](../service.backend/SECURITY.md) — backend service security policy

## Documentation conventions

- **Lib references** live in each `lib.*/README.md` (canonical, code-verified). The libraries index just points to them.
- **PRDs** describe product requirements (`docs/frontend/*.md`, `docs/backend/service-backend-prd.md`).
- **Implementation guides** describe how subsystems are wired (`docs/backend/implementation-guide.md`, `docs/frontend/technical-architecture.md`).
- **Stale docs**: prefer deletion over archival — `git log` is the archive.
- **Adding a new doc**: link it from the appropriate section above. CI will fail otherwise (legal deep-links under `docs/legal/` are allowlisted).
