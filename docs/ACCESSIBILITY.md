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

There is currently **no automated axe coverage** — no `@axe-core/react` or `vitest-axe` dependency
anywhere in the repo, and the Playwright e2e suite does not run axe. Accessibility is enforced by:

- **Role-based RTL queries** in the app test suites (`getByRole`, `getByLabelText`) — tests assert on
  the accessible tree rather than DOM structure, which catches missing labels and roles.
- **The manual screen-reader smoke runbook**: [`docs/runbooks/screen-reader-smoke.md`](./runbooks/screen-reader-smoke.md).

Adding `vitest-axe` for automated assertions is an open item.

## Where the rules live

- [`accessibility` skill](../.claude/skills/accessibility/SKILL.md) — rules for authoring JSX,
  modals, forms, and navigation.
- [`docs/runbooks/screen-reader-smoke.md`](./runbooks/screen-reader-smoke.md) — the manual pass.
- [`DESIGN_TOKENS.md`](../DESIGN_TOKENS.md) — the contrast-checked token contract.
