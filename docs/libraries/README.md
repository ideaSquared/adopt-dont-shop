# Shared Libraries

The monorepo ships **24 frontend-shared libraries** under `@adopt-dont-shop/lib.*`, indexed below. A 25th `lib.*`-named package, [`lib.av-scan`](../../packages/lib.av-scan/README.md), carries the `lib.*` name but is service-only (consumed by the gateway, not the apps) and is mapped with the [service-only packages](../../packages/README.md#service-only-shared-packages). Each library's authoritative documentation is its own `README.md` next to the source — those READMEs are kept code-verified.

## Standards

- ESM by default; `lib.permissions` and `lib.types` additionally emit a CJS bundle via a second `tsc -p tsconfig.cjs.json` pass for backend consumers, exposed through the `require` condition in their `exports` map
- TypeScript strict mode
- Built with `tsc` (`lib.components` uses Vite to bundle styles/assets), orchestrated by Turborepo (`dependsOn: ["^build"]`)
- Tested with Vitest — every library ships a `vitest.config.ts` and an `pnpm test` script that runs `vitest run`
- Workspace-linked: depend on each other with the `"workspace:*"` protocol and rely on `pnpm install` at the repo root

## Index

### Transport & data

- [`lib.api`](../../packages/lib.api/README.md) — HTTP client, interceptors, cookie auth + CSRF ([architecture](../../packages/lib.api/ARCHITECTURE.md))
- [`lib.types`](../../packages/lib.types/README.md) — shared types and constants (zero-dep, safe for both runtimes)
- [`lib.validation`](../../packages/lib.validation/README.md) — canonical Zod schemas (User / Pet / Rescue / Application)

### Auth & access

- [`lib.auth`](../../packages/lib.auth/README.md) — sessions, two-factor, `AuthProvider` / `useAuth`
- [`lib.permissions`](../../packages/lib.permissions/README.md) — RBAC + field-level permission services
- [`lib.invitations`](../../packages/lib.invitations/README.md) — staff/user invitations

### Domain services

- [`lib.applications`](../../packages/lib.applications/README.md) — adoption application lifecycle
- [`lib.chat`](../../packages/lib.chat/README.md) — Socket.IO real-time messaging
- [`lib.discovery`](../../packages/lib.discovery/README.md) — swipe-based pet discovery sessions
- [`lib.notifications`](../../packages/lib.notifications/README.md) — email / push / in-app / SMS delivery
- [`lib.pets`](../../packages/lib.pets/README.md) — read-side `PetsService` + write-side `PetManagementService`
- [`lib.rescue`](../../packages/lib.rescue/README.md) — rescue profiles, staff, settings
- [`lib.search`](../../packages/lib.search/README.md) — cross-domain search client
- [`lib.moderation`](../../packages/lib.moderation/README.md) — reporting + moderation workflow
- [`lib.support-tickets`](../../packages/lib.support-tickets/README.md) — support ticket creation / tracking
- [`lib.audit-logs`](../../packages/lib.audit-logs/README.md) — audit logging for sensitive actions
- [`lib.matching`](../../packages/lib.matching/README.md) — shared types for pet-adopter matching

### UI & analytics

- [`lib.components`](../../packages/lib.components/README.md) — shared React components
- [`lib.analytics`](../../packages/lib.analytics/README.md) — event tracking
- [`lib.feature-flags`](../../packages/lib.feature-flags/README.md) — Statsig hooks (`useFeatureGate`, `useDynamicConfig`, `useConfigValue`) + typed gate/config constants
- [`lib.observability`](../../packages/lib.observability/README.md) — Sentry init, Web Vitals reporter, analytics-consent gate
- [`lib.legal`](../../packages/lib.legal/README.md) — legal re-acceptance modal, cookie banner, consent service

### Utilities

- [`lib.utils`](../../packages/lib.utils/README.md) — formatters, locale, env helpers
- [`lib.dev-tools`](../../packages/lib.dev-tools/README.md) — dev-only tooling

## Component READMEs

Per-component docs for [`lib.components`](../../packages/lib.components/README.md).
Components exported from `src/index.ts` are imported from the package root
(`@adopt-dont-shop/lib.components`); a few internal components carry a
**not exported** banner. Single-file components (no directory) keep their doc
under `packages/lib.components/docs/`. Template:
[`docs/templates/README.component.md`](../templates/README.component.md).

Data:

- [`EntityInspector`](../../packages/lib.components/src/components/data/EntityInspector/README.md) — tabbed entity detail panel
- [`QueryBoundary`](../../packages/lib.components/src/components/data/QueryBoundary/README.md) — loading/error/empty/success brancher
- [`SearchToolbar`](../../packages/lib.components/src/components/data/SearchToolbar/README.md) — search + filter toolbar

Form:

- [`CheckboxInput`](../../packages/lib.components/src/components/form/CheckboxInput/README.md) — checkbox control
- [`DateInput`](../../packages/lib.components/src/components/form/DateInput/README.md) — native date input (not exported)
- [`DateRangePicker`](../../packages/lib.components/src/components/form/DateRangePicker/README.md) — from/to date range
- [`FileUpload`](../../packages/lib.components/src/components/form/FileUpload/README.md) — file upload control
- [`FilterPanel` (GenericFilters)](../../packages/lib.components/src/components/form/FilterPanel/README.md) — generic filter bar (not exported; name collision)
- [`FormField`](../../packages/lib.components/src/components/form/FormField/README.md) — field + `FormRow` / `FormSection` scaffolding
- [`MarkdownEditor`](../../packages/lib.components/src/components/form/MarkdownEditor/README.md) — markdown editor (not exported)
- [`RadioInput`](../../packages/lib.components/src/components/form/RadioInput/README.md) — radio group (not exported)
- [`TextArea`](../../packages/lib.components/src/components/form/TextArea/README.md) — multiline text
- [`TextInput`](../../packages/lib.components/src/components/form/TextInput/README.md) — deprecated; use `Input`
- [`Input`](../../packages/lib.components/docs/Input.md) — standard text input

Layout:

- [`BaseSidebar`](../../packages/lib.components/src/components/layout/BaseSidebar/README.md) — drawer primitive (not exported)
- [`Container`](../../packages/lib.components/src/components/layout/Container/README.md) — width container
- [`Stack`](../../packages/lib.components/src/components/layout/Stack/README.md) — flex stack
- [`Card`](../../packages/lib.components/docs/Card.md) — surface container + header/content/footer

Navigation:

- [`NavSidebar`](../../packages/lib.components/src/components/navigation/NavSidebar/README.md) — app navigation sidebar

UI:

- [`Button`](../../packages/lib.components/docs/Button.md) — standard button
- [`DateTime`](../../packages/lib.components/src/components/ui/DateTime/README.md) — formatted date/time
- [`DropdownButton`](../../packages/lib.components/src/components/ui/DropdownButton/README.md) — button dropdown (not exported)
- [`DropdownMenu` (Dropdown)](../../packages/lib.components/src/components/ui/DropdownMenu/README.md) — click dropdown (not exported)
- [`EmptyState`](../../packages/lib.components/src/components/ui/EmptyState/README.md) — empty/no-data state
- [`ErrorState`](../../packages/lib.components/src/components/ui/ErrorState/README.md) — error state with retry
- [`ImageGallery`](../../packages/lib.components/src/components/ui/ImageGallery/README.md) — carousel/grid gallery (not exported)
- [`Modal`](../../packages/lib.components/docs/Modal.md) — portalled dialog
- [`ConfirmDialog`](../../packages/lib.components/docs/ConfirmDialog.md) — confirm/cancel dialog
- [`ProgressBar`](../../packages/lib.components/src/components/ui/ProgressBar/README.md) — progress indicator (not exported)
- [`SkipLink`](../../packages/lib.components/docs/SkipLink.md) — skip-to-content a11y link
- [`Stepper`](../../packages/lib.components/src/components/ui/Stepper/README.md) — multi-step indicator
- [`ThemeToggle`](../../packages/lib.components/src/components/ui/ThemeToggle/README.md) — light/dark toggle
- [`Toast`](../../packages/lib.components/src/components/ui/Toast/README.md) — legacy toast (superseded by `Toaster`)
- [`Toaster`](../../packages/lib.components/src/components/ui/Toaster/README.md) — sonner-based toast provider + `toast`
- [`Tooltip`](../../packages/lib.components/src/components/ui/Tooltip/README.md) — hover/focus tooltip (not exported)

Charts:

- [`DataTable`](../../packages/lib.components/docs/DataTable.md) — sortable/paginatable table

## Common commands

```bash
# Build / test / lint a single library
pnpm exec turbo build --filter=@adopt-dont-shop/lib.api
pnpm exec turbo test  --filter=@adopt-dont-shop/lib.auth
pnpm exec turbo lint  --filter=@adopt-dont-shop/lib.permissions

# All libraries
pnpm build:libs

```

## See also

- [Microservices Standards](../infrastructure/MICROSERVICES-STANDARDS.md)
- [Backend testing](../testing.md#backend-specifics)
- [Backend API endpoints](../backend/api-endpoints.md)
