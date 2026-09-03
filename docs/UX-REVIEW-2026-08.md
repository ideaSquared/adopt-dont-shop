# UX Review & Component Consolidation — August 2026

_A cross-app UX review of the three React frontends (`app.admin`, `app.client`, `app.rescue`) and the
shared component library (`packages/lib.components`). Focus: user flows, consistency, accessibility,
state handling, and where duplicated UI should move into reusable shared components._

> **Status — review as of August 2026.** Several of the primitives this review called for have since
> shipped: `Stepper`, `QueryBoundary` + `ErrorState`, `SearchToolbar`, and `DateRangePicker` are now
> exported from `packages/lib.components/src/index.ts`; the admin Users split-pane migration (ADS-650)
> landed and `UsersSplitPaneDemo` is gone; and the rescue app now has a deep-linkable application
> detail route (`/applications/:id?`). The navigation primitive shipped as **`NavSidebar`** (not the
> earlier `BaseSidebar`, which is not exported from the barrel). **Verify any item below against
> `packages/lib.components/src/index.ts` and `apps/*/src` before acting on it** — the point-in-time
> metrics and Linear backlog that were in this doc have been removed as stale.

**Headline:** the shared design system is mature and well-built (flat Bootstrap-style token contract,
60+ components, an accessible `Modal` with focus trap/restore). The recurring problem was
under-adoption and local re-implementation, not the primitives themselves.

## Shared design system: remaining gaps

Strengths to lean on: the token contract (`styles/theme.css.ts`), the accessible `Modal` (focus
trap/restore, `Escape`, `useId` wiring), and a rich catalogue (`DataTable`, `SplitPaneDetail`,
`FilterPanel`, `MetricCard`, `EmptyState`, `FormField`/`FormRow`/`FormSection`, `Input`, charts,
`ReportBuilder`).

Gaps still open at the time of review:

- **`DataTable` is not responsive** — only `overflow: auto`; no mobile card fallback or sticky header.
- **`FilterPanel` is under-adopted** — a `SearchToolbar` composition now exists to tie search +
  filters + active-filter chips together; list pages still need to adopt both.
- **`TextInput` is deprecated** in the barrel in favour of `Input`, but call sites remain (mostly
  rescue). This is adoption debt, tracked by `pnpm check:forms`, not a missing primitive.

(Shipped since: `Stepper`/`Wizard`, `QueryBoundary` + `ErrorState`, `SearchToolbar`, `DateRangePicker`.)

## Cross-cutting themes

These are the recurring "move duplicated UI into shared components" opportunities.

- **T1 — Forms are the biggest debt.** `FormField` under-used; many raw `<input>` tags; validation
  ranges from Zod (client) to none (rescue). Standardise on `FormField` + `Input` + a shared Zod
  convention; migrate rescue first (worst offender).
- **T2 — Loading / error / empty states.** Many ad-hoc error strings; `EmptyState` under-adopted;
  Spinner vs Skeleton inconsistent. Adopt the shipped `QueryBoundary` (skeleton / `ErrorState` with
  retry / `EmptyState`) on list/detail pages.
- **T3 — Filters & search re-implemented per page.** Adopt `FilterPanel` + `SearchToolbar`; retire
  admin's local `FilterBar`/`FilterGroup` in `components/ui/SharedComponents.tsx`.
- **T4 — Multi-step flows.** Onboarding, application, register-rescue, pet forms, CSV import, policy
  form each re-implemented step state. Adopt the shipped `Stepper`.
- **T5 — Navigation is three bespoke implementations.** `AdminSidebar`, client `AppShell`, rescue
  `Navigation` each solve nav/active-state/collapse independently. Converge on `NavSidebar`.
- **T6 — Tables & data-density.** Admin uses `DataTable` well; rescue rolls its own tables;
  `DataTable` isn't yet mobile-responsive. Make it responsive, then migrate rescue's raw tables.
- **T7 — Stat cards & action feedback.** `MetricCard` under-adopted (admin re-implements `StatCard`);
  toasts sparse. Adopt `MetricCard`; standardise success/error `useToast` on mutations.
- **T8 — Dates / UK localisation.** Route date formatting through `lib.utils` / the `uk-localization`
  conventions and use the shipped shared `DateRangePicker` instead of bespoke pickers.

## Per-app narrative

### `app.admin` — staff control plane

Strongest design-system adoption (`DataTable`, `MetricCard`). The split-pane entity-detail migration
(ADS-650) has landed and the `/users/split-pane` demo is retired. Remaining: converge
Users/Rescues/Pets/Applications on one detail pattern; replace the local `SharedComponents.tsx`
(`Badge`/`StatCard`/`FilterBar`) with shared `Badge`/`MetricCard`/`FilterPanel`; make data-dense
tables mobile-responsive; move Configuration / FieldPermissions / AccountSettings / Broadcast forms
onto `FormField`.

### `app.client` — public adoption portal (mobile-heavy)

Highest raw adoption and some genuinely well-built flows — the adoption **application flow** (backend
-synced drafts via `useApplicationDraft`, `DraftRestoreBanner`, `QuickApplyView`, conditional
questions) should be preserved. Remaining: unify the two multi-step flows (`OnboardingWizardPage`,
`ApplicationPage`) on the shared `Stepper`; clarify discovery IA (`/discover` swipe vs `/search`
filters); move auth/profile forms onto `FormField` + Zod; mobile audit (touch targets ≥44px, sticky
CTAs); keep the keyboard/AT-accessible alternative to swipe operable.

### `app.rescue` — rescue org portal

The **Applications master-detail workflow** is strong — bulk stage transitions, selection surviving
pagination/filtering (`selectedById`), deep-link scoping by `petId`, references/home-visits/timeline —
and it now has a deep-linkable detail route (`/applications/:id?`, ADS D4). Remaining, and the app's
largest debt: migrate forms off `TextInput`/raw inputs to `FormField` + `Input` + Zod; replace raw
`<table>` with `DataTable`; adopt `NavSidebar` for `Navigation`/`Layout`; retire the local
`DateRangePicker`; standardise empty/error states via `QueryBoundary`/`EmptyState`; replace inline
`style={{…}}` with vanilla-extract + tokens.

## Guiding principle

Adopt the existing, well-built shared components before building anything new. The genuinely new
primitives this review identified — `Stepper`, `QueryBoundary`/`ErrorState`, `SearchToolbar`,
`DateRangePicker` — have shipped; the remaining work is a responsive `DataTable` plus per-app
adoption. Detailed tickets are tracked in Linear (`ux-review` label), not here.
