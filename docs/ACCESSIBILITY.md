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

Each app renders `<ThemeToggle />` inside its settings page:

- `app.client`: _Profile → Settings → Appearance_
- `app.rescue`: _Settings → Appearance_
- `app.admin`: _Account Settings → Appearance_

The toggle cycles `light → normal → dark → light`. The preference persists to `localStorage` under the
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

## Automated and manual testing

Accessibility is enforced by:

- **Role-based RTL queries** in the app test suites (`getByRole`, `getByLabelText`) — tests assert on
  the accessible tree rather than DOM structure, which catches missing labels and roles.
- **An axe smoke test** (`@axe-core/playwright`, ADS-1326): `e2e/tests/a11y/axe-smoke.spec.ts` runs
  axe against the client home page, a pet detail page, and the login page, tagged `@smoke`. See the
  spec file for the documented set of allowed rule exclusions and why each is excluded.
- **The manual screen-reader smoke runbook**: [`docs/runbooks/screen-reader-smoke.md`](./runbooks/screen-reader-smoke.md).

There is no equivalent axe pass wired into the Vitest unit suites (no `vitest-axe` dependency) — the
Playwright smoke spec above is the only automated axe coverage. Adding component-level `vitest-axe`
assertions remains an open item.

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
