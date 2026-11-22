# Accessibility

_The accessibility hub for the frontend: the WCAG target, theme/contrast variants, how a11y is
tested today, and where the authoring rules live. For component-authoring rules, load the
[`accessibility` skill](../.claude/skills/accessibility/SKILL.md)._

## Target

WCAG 2.1 **AA** across all three apps. There is no formal external audit artefact; conformance is
maintained through the authoring rules in the `accessibility` skill, role-based tests, and the manual
screen-reader runbook below.

## Theme variants and contrast

The platform ships three theme variants — `light`, `normal` (the warm-cream default), and `dark`.
All three meet WCAG AA for text and UI contrast on their default surfaces, verified by the design
tokens in `packages/lib.components/src/styles/`.

| Theme    | Surface         | Text on surface | Contrast posture |
| -------- | --------------- | --------------- | ---------------- |
| `light`  | `#FFFFFF`       | gray-900        | WCAG AA          |
| `normal` | `#FAF7F2` cream | gray-900        | WCAG AA          |
| `dark`   | `#0F172A` navy  | gray-100        | WCAG AA          |

### How users switch themes

Each app's settings page (the shared `AccountSettings` from `lib.account`) has a _Theme_ row with
three radio buttons, Light, Cosy (`normal`) and Dark:

- `app.client`: _Profile → Settings → Theme_
- `app.rescue`: _My Settings → Theme_
- `app.admin`: _Account Settings → Theme_

The choice applies immediately. The preference persists to `localStorage` under the
key `theme` (`THEME_STORAGE_KEY`) and is rehydrated on app load.

### Implementation notes

- The mode is exposed via `useTheme()` (`themeMode`, `setThemeMode`, `theme`) from
  `@adopt-dont-shop/lib.components`.
- The vanilla-extract theme class (`lightThemeClass`, `normalThemeClass`, or `darkThemeClass`) is
  applied to `<html>` along with `data-theme="<mode>"` for global style hooks and assistive tech.

### Previous high-contrast theme

A dedicated WCAG AAA high-contrast theme (white surfaces with a bright-orange focus ring) was retired
in favour of the simpler `light/normal/dark` model. Users who relied on it can combine their OS-level
high-contrast or dark-mode preference with the `dark` theme.

## Skip links

All three app shells render `<SkipLink />` (from `lib.components`) as the first focusable element,
targeting `#main-content` — `app.client` (`AppShell`), `app.rescue` (`Layout`), and `app.admin`
(`AdminLayout`). Do not remove it when editing a layout.

## Tabs

Use `Tabs` from `@adopt-dont-shop/lib.components` instead of hand-rolling `role="tablist"`. It is a
controlled component (`tabs`, `value`, `onChange`, and an `aria-label` for the tablist) that
implements the WAI-ARIA tabs pattern with automatic activation: Left/Right (wrapping) and Home/End
move focus and select, only the active tab is in the Tab order, and tabs and panels are linked with
generated `id` / `aria-controls` / `aria-labelledby`. Inactive panels stay mounted but `hidden`, so
form state survives a tab switch. See `app.rescue` `UserSettings` for hash-persisted tabs.

## Automated and manual testing

Accessibility is enforced by:

- **Role-based RTL queries** in the app test suites (`getByRole`, `getByLabelText`) — tests assert on
  the accessible tree rather than DOM structure, which catches missing labels and roles.
- **Component axe checks** (`vitest-axe`): `packages/lib.components/src/accessibility.test.tsx`
  renders every exported `lib.components` component that has interactive UI (closed and open:
  menus, selects, dialogs, tooltips, toasts) and runs axe against the WCAG 2.2 AA tags
  (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`). It runs with the package's Vitest
  suite on every PR. jsdom does no layout, so axe skips colour contrast and target size there;
  the page-level pass below covers them. A new interactive component gets a case in that file.
- **Page-level axe smoke** (`@axe-core/playwright`, ADS-1326): `e2e/tests/a11y/` runs axe with the
  same tags against the main pages of all three apps, tagged `@smoke`, so the required
  `E2E Smoke (Playwright)` CI job fails on any new violation: app.client (home, search, a pet
  detail page, login, register, and the adopter's applications and favourites), app.rescue
  (dashboard, pets, applications, communication, settings, login) and app.admin (dashboard,
  users, rescues, pets, applications, moderation, support, login). There are no global rule
  exclusions. Violations that exist today and cannot be fixed yet are listed per rule and per page,
  each with its reason, in `e2e/tests/a11y/known-violations.ts`: burn that list down, never add
  to it to get a PR green when the fix is in reach.
- **The manual screen-reader smoke runbook**: [`docs/runbooks/screen-reader-smoke.md`](./runbooks/screen-reader-smoke.md).

## jsx-a11y lint ratchet (ADS-1326)

`packages/eslint-config-react/index.js` runs the `eslint-plugin-jsx-a11y` recommended rule set. Rules
are ratcheted from `warn` to `error` individually as their violation count reaches zero — see the
comment above the ratchet block in that file. As of the ADS-1326 ratchet (main at d0a6e71, counted
across `apps/admin`, `apps/rescue`, `apps/client`, and every `lib.*` package that pulls in
`eslint-config-react`):

- **26 of 34 recommended rules are `error`**: the 25 rules that already had zero violations, plus
  `jsx-a11y/heading-has-content` and `jsx-a11y/no-noninteractive-tabindex`, whose 3 combined
  violations were fixed as part of the ratchet (`apps/admin/src/components/ui/SharedComponents.tsx`,
  `packages/lib.components/src/components/charts/ChartFrame.tsx`,
  `packages/lib.components/src/components/ui/Avatar.tsx`).
- **8 rules remain `warn`** — this is the new baseline; a regression here should not silently grow.
  `jsx-a11y/anchor-is-valid` was left at `warn` because its 2 violations live in `packages/lib.auth`
  and `packages/lib.chat`, outside this ratchet's ownership:

  | Rule                                              | Violations |
  | ------------------------------------------------- | ---------- |
  | `jsx-a11y/label-has-for`                          | 188        |
  | `jsx-a11y/control-has-associated-label`           | 128        |
  | `jsx-a11y/no-static-element-interactions`         | 15         |
  | `jsx-a11y/no-noninteractive-element-interactions` | 15         |
  | `jsx-a11y/click-events-have-key-events`           | 10         |
  | `jsx-a11y/no-autofocus`                           | 8          |
  | `jsx-a11y/anchor-is-valid`                        | 2          |

  `label-has-for` and `control-has-associated-label` are the two largest buckets and mostly overlap
  (a form control missing an accessible name/association trips both) — fixing them is the next
  ratchet step and needs a dedicated pass through `lib.components` form primitives, not a quick fix.

## Where the rules live

- [`accessibility` skill](../.claude/skills/accessibility/SKILL.md) — rules for authoring JSX,
  modals, forms, and navigation.
- [`docs/runbooks/screen-reader-smoke.md`](./runbooks/screen-reader-smoke.md) — the manual pass.
- [`DESIGN_TOKENS.md`](../DESIGN_TOKENS.md) — the contrast-checked token contract.
