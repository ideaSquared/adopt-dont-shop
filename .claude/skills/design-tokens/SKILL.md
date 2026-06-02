---
name: design-tokens
description: >
  Design token rules for styling React components with vanilla-extract. Apply when
  writing or modifying any .css.ts file, component style, theme reference, or visual
  property like color, spacing, typography, border, or shadow.
---

# Design Tokens

The platform uses **vanilla-extract** (`*.css.ts`) for all component styling. Theme
values come from `vars` exported by `lib.components/src/styles/theme.css.ts`. See
`DESIGN_TOKENS.md` for the canonical token list.

**Core rule:** never hardcode visual values. Always reference `vars.*`. This is
how the three themes (`light`, `normal`, `dark`) stay consistent and WCAG AA.

## Import once, use everywhere

```typescript
// At the top of every *.css.ts file
import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';      // adjust path per directory depth
```

For variant-driven styles, also import `recipe`:

```typescript
import { recipe } from '@vanilla-extract/recipes';
```

## Available token categories

| Category | Path | Examples |
|----------|------|----------|
| Brand colours | `vars.colors.*` | `primary`, `primaryHover`, `secondary`, `danger`, `success`, `warning`, `info` |
| Color states | `vars.colors.{name}Hover`, `{name}Active` | `vars.colors.primaryHover` |
| Color subtle | `vars.colors.{name}BgSubtle`, `{name}BorderSubtle` | `vars.colors.primaryBgSubtle` |
| Text | `vars.text.*` | `primary`, `secondary`, `tertiary`, `inverse`, `disabled` |
| Background | `vars.background.*` | `primary`, `secondary`, `tertiary`, `subtle` |
| Border | `vars.border.*` | `radius.{none,sm,base,md,lg,xl,full}`, `color.{primary,subtle,strong}`, `width.{thin,base,thick}` |
| Spacing | `vars.spacing['{0,1,2,3,...}']` | **string keys**, e.g. `vars.spacing['4']` |
| Typography | `vars.typography.*` | `size.{xs,sm,base,lg,xl,2xl,...}`, `weight.{normal,medium,semibold,bold}`, `family.{sans,mono}`, `lineHeight.*` |
| Shadows | `vars.shadows.*` | `sm`, `base`, `md`, `lg`, `xl` |
| Transitions | `vars.transitions.*` | `fast`, `base`, `slow` |
| Z-index | `vars.zIndex.*` | `dropdown`, `modal`, `tooltip` |

The full list lives in `lib.components/src/styles/theme.css.ts`. If you need a
token that doesn't exist, add it there rather than hardcoding.

## What this looks like

```typescript
// MyCard.css.ts
import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const card = style({
  backgroundColor: vars.background.primary,
  color: vars.text.primary,
  padding: vars.spacing['4'],
  borderRadius: vars.border.radius.base,
  border: `${vars.border.width.thin} solid ${vars.border.color.subtle}`,
  boxShadow: vars.shadows.sm,
  transition: `box-shadow ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      boxShadow: vars.shadows.md,
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});
```

## What NOT to write

```typescript
// BAD — hex literal. Breaks dark theme, fails contrast audits
backgroundColor: '#FFFFFF',

// BAD — magic spacing value
padding: '16px',

// BAD — named colour
color: 'red',

// BAD — rgba with embedded values
border: '1px solid rgba(0, 0, 0, 0.1)',

// BAD — inline style attribute with literal
<div style={{ color: '#333', marginTop: 12 }} />
```

Any of these in a PR is a regression. The themes only work if every paint goes
through `vars`.

## Spacing keys are strings

Spacing keys are quoted strings, not numbers — this is a vanilla-extract gotcha:

```typescript
padding: vars.spacing['4'],       // ✓
padding: vars.spacing[4],         // ✗  TypeScript error
padding: `${vars.spacing['2']} ${vars.spacing['4']}`,  // ✓ for shorthand
```

## Variants — use `recipe`

For components with discrete states (variant, size, tone), use
`@vanilla-extract/recipes`:

```typescript
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '../../styles/theme.css';

export const button = recipe({
  base: {
    fontFamily: vars.typography.family.sans,
    borderRadius: vars.border.radius.base,
    border: 'none',
    cursor: 'pointer',
    transition: `background-color ${vars.transitions.fast}`,
  },
  variants: {
    variant: {
      primary: { backgroundColor: vars.colors.primary, color: vars.text.inverse },
      secondary: { backgroundColor: vars.colors.secondary, color: vars.text.inverse },
      danger: { backgroundColor: vars.colors.danger, color: vars.text.inverse },
    },
    size: {
      sm: { padding: `${vars.spacing['1']} ${vars.spacing['2']}`, fontSize: vars.typography.size.sm },
      md: { padding: `${vars.spacing['2']} ${vars.spacing['4']}`, fontSize: vars.typography.size.base },
      lg: { padding: `${vars.spacing['3']} ${vars.spacing['6']}`, fontSize: vars.typography.size.lg },
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
```

In the component:

```typescript
import { clsx } from 'clsx';
import * as styles from './Button.css';

<button className={clsx(styles.button({ variant, size }), className)}>
```

## Pseudo-selectors and media queries

```typescript
export const link = style({
  color: vars.colors.primary,
  textDecoration: 'underline',
  selectors: {
    '&:hover': { color: vars.colors.primaryHover },
    '&:focus-visible': {
      outline: `${vars.border.width.thick} solid ${vars.colors.primary}`,
      outlineOffset: vars.spacing['1'],
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
});
```

## Dark mode

`vars` already resolves to the correct theme via the `data-theme` attribute on
`<html>`. You don't need to write `@media (prefers-color-scheme: dark)` blocks —
the theme tokens themselves swap. If a token looks wrong in dark mode, fix the
token definition in `theme.css.ts`, not the component.

## When you genuinely need a literal

Sometimes you need a literal for a non-themed thing (a fixed-size SVG dimension,
an `0` line-height for an inline icon). That's fine — but ask first whether a
token would fit. Literals creep into a codebase one at a time and rot the theme.

## Inline styles

Avoid `style={...}` props for visual properties. Use vanilla-extract. The one
exception: dynamic values that genuinely come from data at runtime (e.g. a
percentage-width progress bar):

```typescript
<div style={{ width: `${percent}%` }} className={styles.progressFill} />
```

The colour, padding, and border on that progress bar still come from the
`.css.ts` file.

## Common mistakes

- Hardcoding hex/rgb/named colours instead of `vars.colors.*`
- Magic `px` values (`padding: '16px'`) instead of `vars.spacing[...]`
- Using a number key for spacing (`vars.spacing[4]`) instead of `vars.spacing['4']`
- Importing from `../styles/theme` instead of `../../styles/theme.css` — the
  `.css` suffix is required for vanilla-extract to resolve correctly
- `styled-components` patterns or `className={'btn btn-primary'}` — this project
  uses vanilla-extract exclusively
- Forgetting `prefers-reduced-motion` on transitions — fails the a11y skill
- `outline: none` on focus — replace with a visible outline using token values
- Re-declaring theme values locally instead of adding them to `theme.css.ts`
