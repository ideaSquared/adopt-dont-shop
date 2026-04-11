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

Create `src/components/<category>/<ComponentName>.test.tsx` before the implementation.
Wrap renders in `renderWithTheme` — all components require the styled-components theme:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../styles/theme';
import { MyComponent } from './MyComponent';

const renderWithTheme = (component: React.ReactElement) =>
  render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);

describe('MyComponent', () => {
  it('renders children', () => {
    renderWithTheme(<MyComponent>Hello</MyComponent>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    renderWithTheme(<MyComponent variant="primary">Text</MyComponent>);
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = jest.fn();
    renderWithTheme(<MyComponent onClick={onClick}>Click</MyComponent>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports data-testid', () => {
    renderWithTheme(<MyComponent data-testid="my-comp">X</MyComponent>);
    expect(screen.getByTestId('my-comp')).toBeInTheDocument();
  });
});
```

Tests verify behaviour (renders, responds to interaction, reflects state) — not CSS classes
or styled-component internals.

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

## Step 3 — Build the styled component

Use `$`-prefixed transient props to pass variants to styled-components without forwarding
to the DOM (prevents React warnings):

```typescript
import React from 'react';
import styled, { css } from 'styled-components';

type MyComponentVariant = 'primary' | 'secondary' | 'danger';
type MyComponentSize = 'sm' | 'md' | 'lg';

type StyledProps = {
  $variant: MyComponentVariant;
  $size: MyComponentSize;
};

const getVariantStyles = (variant: MyComponentVariant) => {
  switch (variant) {
    case 'primary':
      return css`
        background: ${({ theme }) => theme.colors.primary[500]};
        color: ${({ theme }) => theme.text.inverse};
      `;
    case 'danger':
      return css`
        background: ${({ theme }) => theme.colors.semantic.error[500]};
        color: ${({ theme }) => theme.text.inverse};
      `;
    case 'secondary':
    default:
      return css`
        background: ${({ theme }) => theme.colors.secondary[500]};
        color: ${({ theme }) => theme.text.inverse};
      `;
  }
};

const getSizeStyles = (size: MyComponentSize) => {
  switch (size) {
    case 'sm': return css`padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};`;
    case 'lg': return css`padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[6]};`;
    default:   return css`padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};`;
  }
};

const StyledMyComponent = styled.div<StyledProps>`
  display: inline-flex;
  align-items: center;
  border-radius: ${({ theme }) => theme.border.radius.md};
  font-family: ${({ theme }) => theme.typography.family.sans};
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ $variant }) => getVariantStyles($variant)}
  ${({ $size }) => getSizeStyles($size)}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const MyComponent = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  'data-testid': testId,
  ...props
}: MyComponentProps) => (
  <StyledMyComponent
    $variant={variant}
    $size={size}
    className={className}
    data-testid={testId}
    {...props}
  >
    {children}
  </StyledMyComponent>
);

MyComponent.displayName = 'MyComponent';
export default MyComponent;
```

Key conventions from the existing codebase:
- `$`-prefixed props on styled components — never pass variant strings directly to the DOM
- Extract `getVariantStyles` / `getSizeStyles` as separate functions with `switch` — no nested ternaries
- Always set `displayName` — it shows in React DevTools
- Spread `...props` after explicit props so consumers can pass `aria-*`, `role`, etc.
- Include `prefers-reduced-motion` for animations/transitions

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
npm run build:components

# Run the tests
npm run test:components
```

If the app uses Vite aliases (it should — see new-app skill), changes to the source file
are reflected in the dev server without a build.

## Theme tokens reference

Access theme values via `${({ theme }) => theme.<path>}`. Common tokens:

| Token | Example |
|-------|---------|
| Colors | `theme.colors.primary[500]`, `theme.colors.semantic.error[500]` |
| Text | `theme.text.primary`, `theme.text.secondary`, `theme.text.inverse` |
| Background | `theme.background.primary`, `theme.background.tertiary` |
| Spacing | `theme.spacing[2]`, `theme.spacing[4]` (uses numeric keys) |
| Typography | `theme.typography.size.sm`, `theme.typography.weight.medium` |
| Border | `theme.border.radius.md`, `theme.border.radius.full`, `theme.border.color.primary` |
| Shadows | `theme.shadows.sm`, `theme.shadows.focusPrimary` |
| Transitions | `theme.transitions.fast` |

## Common mistakes

- Using `interface` instead of `type` for props
- Passing `variant` directly to a DOM element (use `$variant` transient prop)
- Hardcoding colour values (`#3b82f6`) instead of theme tokens
- Not setting `displayName` on the component
- Forgetting to export from `src/index.ts`
- Testing CSS class names or styled-component internals instead of behaviour
- Skipping `prefers-reduced-motion` for animated components
