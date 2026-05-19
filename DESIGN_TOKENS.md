# Design Tokens

All visual styling in this monorepo flows from a single source of truth: the
theme contract defined in
[`lib.components/src/styles/theme.css.ts`](./lib.components/src/styles/theme.css.ts).
Three themes derive from the same contract: `lightThemeClass`,
`darkThemeClass`, and `highContrastThemeClass`.

## Importing tokens

In any `*.css.ts` file inside a `lib.*` package:

```ts
import { vars } from '../../../styles/theme.css';
```

In any `*.css.ts` file inside an `app.*` package:

```ts
import { vars } from '@adopt-dont-shop/lib.components/theme';
```

In React/TS files (rare — usually only for dynamic style props):

```ts
import { vars } from '@adopt-dont-shop/lib.components';
```

## Token reference

### Colors

Use semantic tokens whenever possible — they switch with the active theme.

| Token group | Use for |
|---|---|
| `vars.text.primary / secondary / tertiary / quaternary` | Body text, in descending emphasis |
| `vars.text.inverse / disabled / link / linkHover` | Inverted, muted, and link text |
| `vars.text.success / error / warning / info` | Status text on default surfaces |
| `vars.background.primary / secondary / tertiary` | Page, surface, raised-surface fills |
| `vars.background.inverse / overlay / disabled` | Inverted, modal scrims, disabled fills |
| `vars.background.success / error / warning / info` | Status surface fills (e.g. alert banner) |
| `vars.border.color.primary / secondary / tertiary` | Borders/dividers, in descending emphasis |
| `vars.border.color.focus / success / error / warning / info` | Status borders, focus rings |

If you need a specific shade, use the 11-step scale (`50` → `950`):

```ts
vars.colors.primary['500']           // brand primary
vars.colors.neutral['100']           // light surface
vars.colors.semantic.success['600']  // strong success
```

**Never** hardcode hex codes (`#ffffff`, `#6b7280`, …) in app or library styles.
The theme cannot follow them across light/dark/high-contrast modes.

### Spacing (4 px base)

Two equivalent scales. Prefer the named one in component-level code.

| Named | Numeric | px |
|---|---|---|
| `vars.spacing.xs` | `vars.spacing['1']` | 4 |
| `vars.spacing.sm` | `vars.spacing['2']` | 8 |
| `vars.spacing.md` | `vars.spacing['4']` | 16 |
| `vars.spacing.lg` | `vars.spacing['6']` | 24 |
| `vars.spacing.xl` | `vars.spacing['8']` | 32 |
| `vars.spacing['2xl']` | `vars.spacing['12']` | 48 |
| `vars.spacing['3xl']` | `vars.spacing['16']` | 64 |
| `vars.spacing['4xl']` | `vars.spacing['20']` | 80 |

The numeric scale also covers half-steps (`0.5`, `1.5`, `2.5`, `3.5`) for fine
adjustments. Anything not on the scale (`13px`, `0.625rem`) is a smell.

### Border radius

| Token | px |
|---|---|
| `vars.border.radius.none` | 0 |
| `vars.border.radius.xs` | 2 |
| `vars.border.radius.sm` | 4 |
| `vars.border.radius.md` | 6 |
| `vars.border.radius.lg` | 8 |
| `vars.border.radius.xl` | 12 |
| `vars.border.radius['2xl']` | 16 |
| `vars.border.radius['3xl']` | 24 |
| `vars.border.radius.full` | 9999 (pill/circle) |

### Typography

```ts
vars.typography.family.sans     // body
vars.typography.family.mono     // code, IPs, IDs
vars.typography.family.display  // marketing headings

vars.typography.size.xs   // 12px-ish (captions)
vars.typography.size.sm   // 14px (helper text)
vars.typography.size.base // 16px (body)
vars.typography.size.lg   // 18px (section titles)
vars.typography.size.xl   // 20px
vars.typography.size['2xl'] // 24px (page titles)
// …up to 9xl

vars.typography.weight.normal | medium | semibold | bold
vars.typography.lineHeight.tight | snug | normal | relaxed | loose
```

### Shadows, transitions, z-index

```ts
vars.shadows.sm | md | lg | xl | 2xl
vars.shadows.focus | focusPrimary | focusError | focusWarning | focusSuccess
vars.transitions.fast | normal | slow      // includes timing + easing
vars.zIndex.dropdown | sticky | overlay | modal | popover | toast | tooltip
```

### Breakpoints

```ts
'@media': {
  [`(min-width: ${vars.breakpoints.sm})`]: { … },  // 640px
  [`(min-width: ${vars.breakpoints.md})`]: { … },  // 768px
  [`(min-width: ${vars.breakpoints.lg})`]: { … },  // 1024px
}
```

## Reusable components first

Before writing your own CSS, check whether
[`lib.components`](./lib.components/src/index.ts) already exports what you
need. Frequently overlooked:

- **`Stack`** / **`Container`** — layout primitives instead of manual flex/grid
- **`Card`** / **`CardHeader`** / **`CardContent`** / **`CardFooter`**
- **`EmptyState`** — empty/error/loading/search states with consistent styling
- **`FormSection`** / **`FormRow`** / **`FormField`** — form layout primitives
- **`Badge`** / **`Alert`** / **`Heading`** / **`Text`**

## Checklist when reviewing styles

- [ ] No hardcoded hex codes (`#…`) — use `vars.*`
- [ ] No off-scale spacing (`13px`, `0.625rem`, `padding: 11px 19px`) — use `vars.spacing.*`
- [ ] No raw `borderRadius: '12px'` — use `vars.border.radius.xl`
- [ ] Uses `vars.text.*` / `vars.background.*` for theme-aware foregrounds/backgrounds
- [ ] Status colors use `vars.colors.semantic.*` rather than ad-hoc greens/reds
- [ ] Page layout uses `Stack` / `Container` / `FormRow` rather than hand-rolled grids
- [ ] Empty/error/loading states use `EmptyState`, not raw divs

## Why this matters

The library already supports light, dark, and high-contrast (WCAG-AAA) themes
via the same token contract. Every hardcoded color is a value that **cannot**
follow theme changes — it locks light-mode colors into dark-mode UI and breaks
high-contrast accessibility. Centralising on tokens is what makes
theme-switching, brand updates, and a11y compliance one-line changes.
