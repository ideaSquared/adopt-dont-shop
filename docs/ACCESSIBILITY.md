# Accessibility

This document tracks the accessibility features built into the platform.

## Theme variants

The platform ships three theme variants — `light`, `normal` (the warm-cream
default), and `dark`. All three meet WCAG AA for text and UI contrast on
their default surfaces, verified by the design tokens in
`lib.components/src/styles/colors.ts` and `theme.ts`.

| Theme    | Surface        | Text on surface | Contrast posture |
| -------- | -------------- | --------------- | ---------------- |
| `light`  | `#FFFFFF`      | gray-900        | WCAG AA          |
| `normal` | `#FAF7F2` cream| gray-900        | WCAG AA          |
| `dark`   | `#0F172A` navy | gray-100        | WCAG AA          |

### How users switch themes

Each app exposes the `<ThemeToggle />` component inside its settings page:

- `app.client`: *Profile → Settings → Appearance*
- `app.rescue`: *Settings → Appearance*
- `app.admin`: *Account Settings → Appearance*

The toggle cycles `light → normal → dark → light`. The preference persists
to `localStorage` under the key `theme` and is rehydrated on app load.

### Implementation notes

- The mode is exposed via `useTheme()` (`themeMode`, `setThemeMode`, `theme`)
  from `@adopt-dont-shop/lib.components`.
- The vanilla-extract theme class (`lightThemeClass`, `normalThemeClass`, or
  `darkThemeClass`) is applied to `<html>` along with `data-theme="<mode>"`
  for global style hooks and assistive tech.

## Previous high-contrast theme

A dedicated WCAG AAA high-contrast theme (white surfaces with a bright-orange
focus ring) was retired in favour of the simpler `light/normal/dark` model
above. Users who relied on it can use their OS-level high-contrast or
dark-mode preference in combination with the `dark` theme.
