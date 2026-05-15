# Accessibility

This document tracks the accessibility features built into the platform.

## High-contrast mode (WCAG AA)

High-contrast mode swaps the default palette for a stark white-on-black theme
designed to meet WCAG AA conformance for users with low vision or
photosensitivity. It is implemented in `lib.components` and applies uniformly
to `app.client`, `app.rescue`, and `app.admin`.

### Contrast targets

The high-contrast palette (`lib.components/src/styles/highContrastPalette.ts`)
is built around these targets, verified by
`lib.components/src/styles/highContrastPalette.test.ts`:

| Token group              | Contrast on white background | WCAG level |
| ------------------------ | ---------------------------- | ---------- |
| Normal text foregrounds  | ≥ 7:1                        | AAA        |
| Semantic foregrounds     | ≥ 7:1                        | AAA        |
| Focus ring vs. surface   | ≥ 4.5:1                      | AA (UI)    |
| Semantic on tinted bg    | ≥ 4.5:1                      | AA         |

### How users turn it on

There are two equivalent affordances:

1. **Settings UI.** Every app exposes the toggle inside its settings page:
   - `app.client`: *Profile → Settings → Accessibility*
   - `app.rescue`: *Settings → Accessibility*
   - `app.admin`: *Account Settings → Accessibility*
2. **Keyboard shortcut.** Press <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd>
   anywhere in the app to toggle the mode. The shortcut is registered
   globally by `ThemeProvider` so it works regardless of focus.

### Persistence

The preference is persisted to `localStorage` under the key
`theme-high-contrast` and rehydrated on app load. When the user is signed in
the value is read on the same device only; cross-device sync via the user
profile is tracked separately.

### Implementation notes

- The mode is exposed via `useTheme()` (`highContrast`, `setHighContrast`,
  `toggleHighContrast`) and `<HighContrastToggle />` from
  `@adopt-dont-shop/lib.components`.
- It is orthogonal to the light/dark `themeMode`; toggling HC off restores
  the previous mode without losing the preference.
- The vanilla-extract class `highContrastThemeClass` is applied to
  `<html>` along with the `data-theme="high-contrast"` and
  `data-high-contrast="true"` attributes for assistive tech and global
  styles.
