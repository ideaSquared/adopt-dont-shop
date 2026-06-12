---
name: new-component
description: >
  Add a new component to lib.components. Apply when the user asks to create a shared
  UI component, add something to the component library, or build a reusable React component.
disable-model-invocation: true
---

# Adding a Component to lib.components

## Existing components
!`ls lib.components/src/components/ui/ lib.components/src/components/form/ lib.components/src/components/layout/ lib.components/src/components/navigation/ 2>/dev/null`

## Component categories

| Category | Path | What goes here |
|----------|------|----------------|
| `ui` | `src/components/ui/` | Standalone display components (Badge, Alert, Avatar, Modal) |
| `form` | `src/components/form/` | Form inputs and controls (TextInput, SelectInput, CheckboxInput) |
| `layout` | `src/components/layout/` | Structural layout components (Card, Container, Stack) |
| `navigation` | `src/components/navigation/` | Navigation components (Navbar, Breadcrumbs, Footer) |
| `data` | `src/components/data/` | Data display (tables, lists) — add here if data-heavy |

## Step 1 — Write the test first (TDD)

Create `src/components/<category>/<ComponentName>/<ComponentName>.test.tsx` before the implementation.
Components use vanilla-extract for styling — no theme provider wrapping needed in tests:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders children', () => {
    render(<MyComponent>Hello</MyComponent>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    render(<MyComponent variant="primary">Text</MyComponent>);
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick}>Click</MyComponent>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports data-testid', () => {
    render(<MyComponent data-testid="my-comp">X</MyComponent>);
    expect(screen.getByTestId('my-comp')).toBeInTheDocument();
  });
});
```

Tests verify behaviour (renders, responds to interaction, reflects state) — not CSS classes
or style internals. Use `vi.fn()` (Vitest), not `jest.fn()`.

## Step 2 — Define the prop type

Define props as a `type` (not `interface`) in the component file or in `src/types/index.ts`
if other components share the same variants:

```typescript
export type MyComponentVariant = 'primary' | 'secondary' | 'danger';
export type MyComponentSize = 'sm' | 'md' | 'lg';

export type MyComponentProps = {
  children: React.ReactNode;
  variant?: MyComponentVariant;
  size?: MyComponentSize;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
};
```

- Use `type`, not `interface`
- Always include `className` and `data-testid` for flexibility
- All props optional with sensible defaults except `children`

## Step 3 — Create the styles with vanilla-extract

Create a `MyComponent.css.ts` file next to the component. Use `recipe` from
`@vanilla-extract/recipes` for variant-driven styles, or `style` from
`@vanilla-extract/css` for simpler cases:

```typescript
// MyComponent.css.ts
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '../../styles/theme.css';

export const myComponent = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: vars.typography.family.sans,
    borderRadius: vars.border.radius.base,
    transition: `all ${vars.transitions.fast}`,
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },

  variants: {
    variant: {
      primary: {
        backgroundColor: vars.colors.primary,
        color: vars.text.inverse,
        selectors: { '&:hover': { backgroundColor: vars.colors.primaryHover } },
      },
      danger: {
        backgroundColor: vars.colors.danger,
        color: vars.text.inverse,
        selectors: { '&:hover': { backgroundColor: vars.colors.dangerHover } },
      },
      secondary: {
        backgroundColor: vars.colors.secondary,
        color: vars.text.inverse,
        selectors: { '&:hover': { backgroundColor: vars.colors.secondaryHover } },
      },
    },
    size: {
      sm: { padding: `${vars.spacing['1']} ${vars.spacing['2']}`, fontSize: vars.typography.size.sm },
      md: { padding: `${vars.spacing['2']} ${vars.spacing['4']}`, fontSize: vars.typography.size.base },
      lg: { padding: `${vars.spacing['3']} ${vars.spacing['6']}`, fontSize: vars.typography.size.lg },
    },
  },

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});
```

## Step 3b — Build the component

```typescript
// MyComponent.tsx
import React from 'react';
import { clsx } from 'clsx';
import * as styles from './MyComponent.css';

export type MyComponentProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'data-testid'?: string;
};

export const MyComponent = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  'data-testid': testId,
  ...props
}: MyComponentProps) => (
  <div
    className={clsx(styles.myComponent({ variant, size }), className)}
    data-testid={testId}
    {...props}
  >
    {children}
  </div>
);

MyComponent.displayName = 'MyComponent';
export default MyComponent;
```

Key conventions from the existing codebase:
- Styles live in a separate `*.css.ts` file using vanilla-extract
- Use `recipe()` for components with variants, `style()` for simple cases
- Use `clsx()` (from `src/utils/cn.ts`) to merge class strings with consumer `className`
- Always set `displayName` — it shows in React DevTools
- Spread `...props` after explicit props so consumers can pass `aria-*`, `role`, etc.
- Include `prefers-reduced-motion` for animations/transitions
- Theme tokens come from `vars` — never hardcode colours or spacing values

## Step 4 — Export from the category index (if one exists)

If the category has an `index.ts`, add the export:

```typescript
// src/components/ui/index.ts (if it exists)
export { MyComponent } from './MyComponent';
export type { MyComponentProps, MyComponentVariant } from './MyComponent';
```

## Step 5 — Export from the library root

Open `src/index.ts` and add exports:

```typescript
export { MyComponent } from './components/ui/MyComponent';
export type { MyComponentProps } from './components/ui/MyComponent';
```

Both the component and its prop types must be exported so consuming apps can type their
own wrappers.

## Step 6 — Build and verify

```bash
# Build lib.components
pnpm build:components

# Run the tests
pnpm test:components
```

If the app uses Vite aliases (it should — see new-app skill), changes to the source file
are reflected in the dev server without a build.

## Theme tokens reference

Access theme values via `vars.<path>` from `../../styles/theme.css`. Common tokens:

| Token | Example |
|-------|---------|
| Colors | `vars.colors.primary`, `vars.colors.danger`, `vars.colors.success` |
| Color states | `vars.colors.primaryHover`, `vars.colors.primaryActive` |
| Color subtle | `vars.colors.primaryBgSubtle`, `vars.colors.primaryBorderSubtle` |
| Text | `vars.text.primary`, `vars.text.secondary`, `vars.text.inverse` |
| Background | `vars.background.primary`, `vars.background.secondary` |
| Spacing | `vars.spacing['2']`, `vars.spacing['4']` (string keys) |
| Typography | `vars.typography.size.sm`, `vars.typography.weight.medium`, `vars.typography.family.sans` |
| Border | `vars.border.radius.base`, `vars.border.radius.lg`, `vars.border.color.primary` |
| Shadows | `vars.shadows.sm`, `vars.shadows.md` |
| Transitions | `vars.transitions.fast` |

## Common mistakes

- Using `interface` instead of `type` for props
- Hardcoding colour values (`#3b82f6`) instead of `vars` tokens
- Not setting `displayName` on the component
- Forgetting to export from `src/index.ts`
- Testing CSS class names or style internals instead of behaviour
- Skipping `prefers-reduced-motion` for animated components
- Using `jest.fn()` instead of `vi.fn()` (project uses Vitest, not Jest)
- Using styled-components patterns — the project uses vanilla-extract exclusively
