# Design Tokens

All visual styling in this monorepo flows from a single source of truth: the
theme contract defined in
[`lib.components/src/styles/theme.css.ts`](./packages/lib.components/src/styles/theme.css.ts).
Three themes derive from the same contract: `lightThemeClass`,
`normalThemeClass`, and `darkThemeClass`.

The token system follows **Bootstrap 5.3 conventions** — single named values
plus explicit `Hover`, `Active`, `BgSubtle`, `BorderSubtle`, and
`TextEmphasis` variants. No 50→950 ramps.

## Importing tokens

In any `*.css.ts` file inside a `lib.*` package:

```ts
import { vars } from '../../../styles/theme.css';
```

From an app or any package that depends on `lib.components`:

```ts
import { vars } from '@adopt-dont-shop/lib.components/theme';
```

## What's in `vars`

### Active theme name

```ts
vars.mode; // 'light' | 'normal' | 'dark' — the active theme name, for style hooks
```

### Colors — brand + semantic

Every brand/semantic color is one named token (no scale step), plus five
explicit variants. Use the base for filled CTAs; the variants for states and
tints.

```ts
vars.colors.primary; // brand rose (#F43F5E)
vars.colors.primaryHover; // darker rose for :hover
vars.colors.primaryActive; // darker still for :active
vars.colors.primaryBgSubtle; // very light rose tint for badge/alert fills
vars.colors.primaryBorderSubtle; // pale rose for borders on tinted surfaces
vars.colors.primaryTextEmphasis; // deep rose for text on tinted surfaces
```

The same shape exists for `secondary`, `success`, `danger`, `warning`,
`info`. Logo accents are flat: `accentPaw`, `accentSky`, `accentLeaf`.
Gradients: `gradientPrimary`, `gradientBrand`.

### Gray ramp

A single 9-step gray (`vars.gray['100']` → `vars.gray['900']`) for cases
where the semantic surface tokens aren't enough. **The gray scale is the
same in every theme** — it does not flip in dark mode. Use the semantic
tokens below for surfaces and text that need to flip.

### Theme-aware surfaces

```ts
vars.background.body; // page bg                       (flips by theme)
vars.background.surface; // raised surface (cards)
vars.background.muted; // subtle bg
vars.background.inverse | overlay | disabled;
vars.background.danger | success | warning | info; // tinted alert/badge fills

vars.text.primary | secondary | tertiary | muted;
vars.text.disabled | inverse | link | linkHover;
vars.text.danger | success | warning | info;

vars.border.color.default | muted | strong | focus;
vars.border.color.danger | success | warning | info;
```

### Spacing — Bootstrap-style spacers

```ts
vars.spacing['0']; // 0
vars.spacing['1']; // 0.25rem  (4px)
vars.spacing['2']; // 0.5rem   (8px)
vars.spacing['3']; // 1rem     (16px) — Bootstrap's $spacer base
vars.spacing['4']; // 1.5rem   (24px)
vars.spacing['5']; // 2rem     (32px)
vars.spacing['6']; // 3rem     (48px)
vars.spacing['7']; // 4rem     (64px)
vars.spacing['8']; // 6rem     (96px)
```

### Borders

```ts
// Widths
vars.border.width.thin | base | thick;

// Radius
vars.border.radius.sm; // 4px
vars.border.radius.base; // 8px  — default for buttons, inputs
vars.border.radius.lg; // 12px
vars.border.radius.xl; // 16px — default for cards
vars.border.radius['2xl']; // 24px
vars.border.radius.pill; // 9999px — pills, avatars
```

### Typography

```ts
vars.typography.family.sans     // Inter — body, UI
vars.typography.family.serif    // serif stack
vars.typography.family.display  // Fredoka — wordmark + h1/h2
vars.typography.family.mono     // JetBrains Mono — code

vars.typography.size.xs | sm | base | lg | xl | 2xl | 3xl | 4xl | 5xl | 6xl | 7xl
vars.typography.weight.light | normal | medium | semibold | bold
vars.typography.lineHeight.none | tight | snug | normal | relaxed | loose
vars.typography.letterSpacing.tighter | tight | normal | wide | wider | widest
```

### Animations

```ts
vars.animations.duration.instant | fast | normal | slow | slower;
vars.animations.easing.linear | easeIn | easeOut | easeInOut | bounce | elastic | smooth;
```

### Shadows, transitions, z-index

```ts
vars.shadows.none | sm | base | lg | xl;
vars.shadows.focus | focusDanger | inner;
vars.transitions.none | fast | base | slow;
vars.zIndex.base | docked | dropdown | sticky | overlay | modal | popover | toast | tooltip;
```

### Breakpoints

```ts
'@media': {
  [`(min-width: ${vars.breakpoints.sm})`]: { … },   // 640px
  [`(min-width: ${vars.breakpoints.md})`]: { … },   // 768px
  [`(min-width: ${vars.breakpoints.lg})`]: { … },   // 1024px
  [`(min-width: ${vars.breakpoints.xl})`]: { … },   // 1280px
  [`(min-width: ${vars.breakpoints['2xl']})`]: { … }, // 1536px
}
```

## Reusable components first

Before writing your own CSS, check whether
[`lib.components`](./packages/lib.components/src/index.ts) already exports what you
need. Frequently overlooked, grouped:

- **Layout**: `Stack` / `Container` / `SplitPaneDetail` — instead of manual flex/grid; `NavSidebar` for app navigation
- **Data**: `DataTable` / `QueryBoundary` / `SearchToolbar` / `FilterPanel` / `EntityInspector`
- **Form**: `FormSection` / `FormRow` / `FormField` / `Input` (not the deprecated `TextInput`) / `DateRangePicker` / `Stepper`
- **States**: `EmptyState` / `ErrorState` — empty/error/loading/search states with consistent styling
- **Charts**: `MetricCard` / `LineChart` / `BarChart` / `PieChart` / `AreaChart`
- **Foundation**: `Card` (+ `CardHeader` / `CardContent` / `CardFooter`), `Badge` / `Alert` / `Heading` / `Text` / `Logo` / `SkipLink`

## Checklist when reviewing styles

- [ ] No hardcoded hex codes (`#…`) — use `vars.*`
- [ ] No off-scale spacing — use `vars.spacing['1'..'8']`
- [ ] No raw `borderRadius: '12px'` — use `vars.border.radius.lg`
- [ ] Uses `vars.text.*` / `vars.background.*` for theme-aware foregrounds/backgrounds
- [ ] Status colors use `vars.colors.danger|success|warning|info` rather than ad-hoc greens/reds
- [ ] States use `vars.colors.primaryHover` / `…Active` — not raw alternate colors
- [ ] Page layout uses `Stack` / `Container` / `FormRow` rather than hand-rolled grids

`theme.css.ts` is the complete contract — if a token is not on it, it does not exist; add it there
before referencing it, never inline a raw value.
