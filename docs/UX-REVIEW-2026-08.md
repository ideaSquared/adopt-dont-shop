# UX Review & Component Consolidation Plan — August 2026

A cross-app UX review of the three React frontends (`app.admin`, `app.client`,
`app.rescue`) and the shared component library (`packages/lib.components`),
with a prioritised, Linear-ready backlog. The review focuses on **user flows**,
**consistency**, **accessibility**, **state handling**, and — per the brief —
**where duplicated UI should move into reusable shared components**.

- **Scope:** 65 pages across 3 apps + ~150 shared/local components.
- **Method:** Static analysis (adoption/duplication metrics) + reading routers
  and the key conversion flows, grounded in file paths.
- **Headline:** The shared design system is **mature and well-built** (flat
  Bootstrap-style token contract, 60+ components, a genuinely accessible
  `Modal` with focus trap/restore). The problem is **under-adoption and local
  re-implementation**, not the primitives themselves. The highest-leverage work
  is adopting what already exists and extracting a small number of missing
  patterns (Stepper, QueryBoundary, responsive DataTable).

---

## 1. Evidence at a glance

Adoption / duplication signals gathered across `apps/*/src`:

| Signal | admin | client | rescue | Read |
|---|---|---|---|---|
| Files importing `lib.components` | 101 | 120 | 75 | Good baseline adoption |
| `FormField` (standard form wrapper) | 1 | 0 | 1 | **Effectively unused** |
| Raw `<input>` tags | 34 | 33 | 65 | Forms bypass the system |
| Deprecated `TextInput` call sites | 4 | 4 | 14 | Rescue worst |
| Zod / react-hook-form files | 1 / 0 | 2 / 2 | 0 / 0 | Validation inconsistent |
| `FilterPanel` (shared) usage | 0 | 0 | 0 | **Exists, never used** |
| `EmptyState` usage | 4 | 4 | 2 | Under-adopted |
| Ad-hoc error markup ("failed to load", "try again", …) | 58 | 62 | 42 | No standard error state |
| `DataTable` (shared) vs raw `<table>` | 17 / 5 | 0 / 0 | 0 / 4 | Rescue rolls its own tables |
| `MetricCard` usage | 3 | 0 | 2 | Under-adopted; admin re-implements `StatCard` |
| `BaseSidebar` (shared) usage | 0 | 0 | 0 | **Exists, never used** — 3 bespoke navs |
| Hand-rolled multi-step / wizard flows | 1 | 4 | 4 | Prime extraction target |
| Toast/`useToast` feedback | 6 | 3 | 3 | Action feedback inconsistent |
| Inline `style={{…}}` (bypasses tokens) | 12 | 23 | 35 | Rescue worst |

---

## 2. Shared design system assessment (`packages/lib.components`)

**Strengths — keep and lean on these:**

- **Token contract** (`styles/theme.css.ts`): flat, semantic, Bootstrap-style
  (`primary/primaryHover/primaryBgSubtle`…), full spacing/typography/breakpoint/
  zIndex scales, and **light/dark/normal** themes. This is a solid foundation.
- **`Modal`** is genuinely accessible: Tab/Shift+Tab focus trap, `Escape`
  handling, focus **restore** to the previously-focused element, initial focus,
  `useId` wiring. New modals should compose this, not re-invent it.
- Rich catalogue already exists: `DataTable`, `SplitPaneDetail`, `FilterPanel`,
  `MetricCard`, `EmptyState`, `FormField`/`FormRow`/`FormSection`, `Input`,
  `SelectInput`, `FileUpload`, `Breadcrumbs`, `BaseSidebar`, `ConfirmDialog`,
  `Toast`/`useToast`, `Skeleton*`, charts, `ReportBuilder`.

**Gaps — patterns apps re-invent because the library lacks them:**

1. **No `Stepper`/`Wizard`** — multi-step flows are hand-rolled in ~8 places.
2. **No `QueryBoundary` / `ErrorState`** — every page hand-writes loading +
   error + empty branches (58/62/42 ad-hoc error strings).
3. **`DataTable` is not responsive** — only `overflow: auto`; no mobile
   card-fallback or sticky header.
4. **No exported `DateRangePicker`** — `DateInput` exists but rescue ships its
   own range picker; UK date formatting isn't enforced at the component edge.
5. **No `SearchToolbar`** composition tying search + `FilterPanel` + active
   filter chips together, so each list page assembles its own.

**Note:** `TextInput` is already marked deprecated in the barrel in favour of
`Input`, yet there are 22 call sites (mostly rescue). Adoption debt, not a
missing primitive.

---

## 3. Cross-cutting themes → reusable component plan

This is the core of the "move things to reusable components" ask. Each theme
maps to shared work (EPIC A) plus per-app adoption tickets.

### T1 — Forms are the biggest debt (consistency + accessibility)
`FormField` is essentially unused; 132 raw `<input>` tags across the apps;
validation ranges from Zod+react-hook-form (client) to none (rescue). Raw
inputs typically lack the label/`aria-describedby`/error wiring `FormField`
provides. **Plan:** standardise on `FormField` + `Input` + a shared Zod schema
convention; migrate rescue off `TextInput`/raw inputs first (worst offender).

### T2 — Loading / error / empty states are hand-rolled everywhere
162 ad-hoc error strings; `EmptyState` barely used; Spinner vs Skeleton is
inconsistent. **Plan:** add a shared **`QueryBoundary`** (wraps a React Query
result → renders skeleton / `ErrorState` with retry / `EmptyState`) and adopt
it on list/detail pages. One consistent, accessible state story across apps.

### T3 — Filters & search re-implemented per page
Shared `FilterPanel` used 0×; admin has a local `FilterBar`/`FilterGroup` in
`components/ui/SharedComponents.tsx`; other pages assemble their own. **Plan:**
adopt `FilterPanel`, add a **`SearchToolbar`** (search field + filter panel +
active-filter chips + result count), retire the admin local copies.

### T4 — Multi-step flows have ~8 bespoke steppers
Onboarding, application, register-rescue, pet forms, CSV import, policy form all
re-implement step state + progress UI. **Plan:** extract a shared **`Stepper`/
`Wizard`** (step model, progress indicator, next/back/validation-gate, a11y step
announcement) and adopt it.

### T5 — Navigation is three bespoke implementations
`BaseSidebar` used 0×; `AdminSidebar`, client `AppShell`, rescue `Navigation`
each solve nav/active-state/collapse independently. **Plan:** converge on
`BaseSidebar` (or extend it to cover all three), giving consistent active
states, keyboard nav, and collapse behaviour.

### T6 — Tables & data-density
Admin uses `DataTable` well; rescue uses 4 raw `<table>`s; `DataTable` isn't
mobile-responsive. **Plan:** make `DataTable` responsive (card fallback + sticky
header), then migrate rescue's raw tables onto it.

### T7 — Stat/metric cards & action feedback
`MetricCard` under-adopted; admin re-implements `StatCard`; toasts sparse.
**Plan:** adopt `MetricCard` everywhere; standardise success/error `useToast`
feedback on all mutations.

### T8 — Dates / UK localisation
Native date inputs + rescue's bespoke `DateRangePicker`; UK formatting not
enforced at the edge. **Plan:** export a shared `DateRangePicker`, route date
formatting through `lib.utils`/the `uk-localization` conventions.

---

## 4. Per-app reviews

### 4.1 `app.admin` — Staff control plane
**Health:** Strongest design-system adoption (`DataTable` ×17, `MetricCard` ×3).
The core issues are **detail-view inconsistency** and **leftover scaffolding**.

- **Demo page in production routes.** `UsersSplitPaneDemo` (a reference impl for
  ADS-654) is routed at `/users/split-pane`; the real Users migration (ADS-650)
  is unfinished. Users/Rescues/Pets/Applications currently render detail via a
  same-page `:id` route, so the app has **two competing detail patterns** live.
- **Local `SharedComponents.tsx`** re-implements `Badge`, `StatCard`/`StatsBar`,
  `FilterBar`/`FilterGroup` — all of which exist as `Badge`, `MetricCard`,
  `FilterPanel` in the shared lib.
- **Data-dense tables aren't mobile-responsive** (`overflow:auto` only).
- Forms on Configuration / FieldPermissions / AccountSettings / Broadcast bypass
  `FormField`.

### 4.2 `app.client` — Public adoption portal (mobile-heavy)
**Health:** Highest raw adoption (120 files) and some genuinely well-designed
flows. Issues cluster around **IA clarity, forms, and mobile**.

- **Positive:** the adoption **application flow is well built** — backend-synced
  drafts (resume on any device via `useApplicationDraft`), `DraftRestoreBanner`,
  `QuickApplyView`, conditional questions, `SubmissionSuccess`. Preserve this.
- **Two multi-step flows, two steppers.** `OnboardingWizardPage` (4 hand-rolled
  steps, hard-coded option arrays) and `ApplicationPage` (`MACRO_STEPS` +
  `ApplicationProgress`) don't share step UI.
- **Dual discovery surfaces.** `/discover` (swipe `SwipeStack`) and `/search`
  (filters) overlap; entry points and the relationship between them need to be
  made explicit (cross-link, or unify).
- **Forms** (auth, profile) mostly bypass `FormField`; validation inconsistent.
- **Mobile:** swipe UX needs a **keyboard/AT-accessible alternative**; audit
  touch targets (≥44px) and sticky primary CTAs on pet/detail/apply.

### 4.3 `app.rescue` — Rescue org portal
**Health:** Most **form and consistency debt**, but the core applications
workflow is thoughtfully designed.

- **Positive:** the **Applications master-detail workflow** is strong — bulk
  stage transitions, selection that survives pagination/filtering
  (`selectedById` map), deep-link scoping by `petId`, references/home-visits/
  timeline.
- **Worst form debt:** 65 raw `<input>`, `TextInput` ×14, **no Zod**. Highest
  priority migration to `FormField` + `Input` + validation.
- **Raw `<table>` ×4** instead of `DataTable`; own `Navigation`/`Layout` instead
  of `BaseSidebar`; own `DateRangePicker`.
- **No deep-linkable application detail** (`/applications` has no `:id` route) —
  staff can't share a link to a specific application. Add a detail route while
  keeping the in-page master-detail.
- Highest ad-hoc empty markup (13) and inline styles (35).

---

## 5. Linear-ready backlog

Labels: `ux-review`, one of `app:admin|app:client|app:rescue|shared`, and a type
(`component`/`flow`/`a11y`/`consistency`/`states`/`forms`/`responsive`).
Effort = rough T-shirt size. Start with EPIC A (foundation) — it unblocks the
per-app adoption tickets.

### EPIC A — Foundation: shared components & adoption (label `shared`)

| # | Title | Type | Priority | Effort |
|---|---|---|---|---|
| A1 | Build shared `Stepper`/`Wizard` in lib.components (step model, progress, validation-gated next/back, a11y step announcements) | component | High | L |
| A2 | Add shared `QueryBoundary` + `ErrorState` (skeleton / retryable error / empty, driven by a React Query result) | component | High | M |
| A3 | Make `DataTable` responsive (mobile card fallback + sticky header + horizontal-scroll affordance) | responsive | High | M |
| A4 | Adopt `FilterPanel` + build `SearchToolbar` composition (search + filters + active-filter chips + result count) | component | Medium | M |
| A5 | Form standard: `FormField` + `Input` + shared Zod schema convention; codemod/lint to flag raw `<input>` & `TextInput` | forms | High | L |
| A6 | Export shared `DateRangePicker`; route date formatting through UK-localisation helpers | component | Medium | S |
| A7 | Converge navigation on `BaseSidebar` (active state, collapse, keyboard nav); adapters per app | component | Medium | L |
| A8 | Standardise action feedback: success/error `useToast` on all mutations (pattern + lint) | consistency | Medium | S |
| A9 | Adopt `MetricCard` for all stat/summary tiles; deprecate local stat cards | consistency | Low | S |

### EPIC B — `app.admin` (label `app:admin`)

| # | Title | Type | Priority | Effort |
|---|---|---|---|---|
| B1 | Finish Users split-pane migration (ADS-650); remove `UsersSplitPaneDemo` from production routes | flow | High | M |
| B2 | Unify entity-detail pattern across Users/Rescues/Pets/Applications (single split-pane vs `:id` in-page) | consistency | High | M |
| B3 | Replace local `SharedComponents` (`Badge`/`StatCard`/`FilterBar`) with shared `Badge`/`MetricCard`/`FilterPanel` | component | Medium | M |
| B4 | Adopt `QueryBoundary` + skeleton tables on data-dense pages (Users, Pets, Applications, Moderation, Audit) | states | Medium | M |
| B5 | Migrate admin forms (Configuration, FieldPermissions, AccountSettings, Broadcast) to `FormField` + Zod | forms | Medium | M |
| B6 | Responsive pass for admin tables/detail on tablet/mobile (depends A3) | responsive | Low | M |

### EPIC C — `app.client` (label `app:client`)

| # | Title | Type | Priority | Effort |
|---|---|---|---|---|
| C1 | Adopt shared `Stepper` in Onboarding + Application; unify progress/step UI (depends A1) | flow | High | M |
| C2 | Clarify discovery IA: reconcile `/discover` (swipe) vs `/search` (filters) — explicit entry points / cross-links / merge | flow | High | M |
| C3 | Client forms (auth, profile) → `FormField` + Zod with consistent inline validation | forms | High | M |
| C4 | Mobile-first audit for adopter journeys: touch targets ≥44px, sticky CTAs, reflow on pet/detail/apply | responsive | High | M |
| C5 | Accessible alternative to swipe (`SwipeStack`): keyboard + AT operable like/skip controls | a11y | High | M |
| C6 | Standardise empty/error/loading on Favorites, Search, Notifications, Applications via `QueryBoundary`/`EmptyState` | states | Medium | S |

### EPIC D — `app.rescue` (label `app:rescue`)

| # | Title | Type | Priority | Effort |
|---|---|---|---|---|
| D1 | Migrate rescue forms off `TextInput`/raw inputs → `FormField` + `Input` + Zod (largest debt: 65 raw inputs) | forms | High | L |
| D2 | Replace raw `<table>` with shared `DataTable` across rescue | component | Medium | M |
| D3 | Adopt `BaseSidebar` for rescue `Navigation`/`Layout` (depends A7) | consistency | Medium | M |
| D4 | Add deep-linkable application detail route (`/applications/:id`) while keeping in-page master-detail | flow | Medium | S |
| D5 | Retire local `DateRangePicker` for the shared one (depends A6) | component | Low | S |
| D6 | Standardise empty/error/loading (highest ad-hoc count) via `EmptyState`/`QueryBoundary` | states | Medium | M |
| D7 | Replace inline `style={{…}}` (35) with vanilla-extract + tokens | consistency | Low | S |

---

## 6. Recommended sequencing

1. **Wave 1 — Foundation (EPIC A first).** A2 (`QueryBoundary`), A1 (`Stepper`),
   A3 (responsive `DataTable`), A5 (form standard). These unblock the most
   per-app tickets and pay back immediately.
2. **Wave 2 — Highest-debt adoption.** D1 (rescue forms), C3 (client forms),
   B1/B2 (admin detail consistency), C1 (client steppers).
3. **Wave 3 — Consistency & polish.** Navigation convergence (A7 → D3), filters
   (A4 → B3), states adoption (B4/C6/D6), MetricCard/toasts (A8/A9).
4. **Wave 4 — Responsive & a11y sweeps.** C4/C5 (client mobile + swipe a11y),
   B6/D2/D7.

**Guiding principle:** adopt the existing, well-built shared components before
building anything new; only 3 genuinely new primitives are needed (`Stepper`,
`QueryBoundary`/`ErrorState`, responsive `DataTable`), plus one composition
(`SearchToolbar`) and one export (`DateRangePicker`).
