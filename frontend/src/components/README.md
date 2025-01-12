# Component Structure

This document outlines the standard structure for reusable components in the application.

## Component Template

```tsx
import React from 'react'

// Third-party imports (alphabetically ordered)
import styled from 'styled-components'

// Internal component imports (alphabetically ordered)
import { ComponentA } from '@adoptdontshop/components'

// Type imports (alphabetically ordered)
import { TypeA } from '@adoptdontshop/types'

// Style definitions
const StyledContainer = styled.div`
  // styles here
`

// Type definitions
type ComponentNameProps = {
  /** Description of propA */
  propA: string
  /** Description of propB */
  propB?: number
  /** Children elements */
  children?: React.ReactNode
}

// Component definition
export const ComponentName: React.FC<ComponentNameProps> = ({
  propA,
  propB,
  children,
}) => {
  // State and hooks (if needed)

  // Event handlers (if needed)

  // Render
  return <StyledContainer>{children}</StyledContainer>
}
```

## Directory Structure

Components should be organized by feature or type:

```
components/
    Button/
        index.ts
        Button.tsx
        Button.test.tsx
        Button.styles.ts
    TextField/
        index.ts
        TextField.tsx
        TextField.test.tsx
        TextField.styles.ts
    Header/
        index.ts
        Header.tsx
        Header.test.tsx
        Header.styles.ts
```

## Component Guidelines

1. Each component should:

   - Be focused on a single responsibility
   - Be reusable across different pages
   - Have proper TypeScript types
   - Include JSDoc comments for props
   - Be accessible (use proper ARIA attributes)
   - Have associated unit tests

2. Styling:
   - Use styled-components
   - Keep styles in separate .styles.ts files for complex components
   - Use theme variables for colors, spacing, etc.

## Export Pattern

Always use named exports and re-export through index.ts:

```ts
// Component file (Button.tsx)
export const Button: React.FC<ButtonProps> = () => {
  // ...
}

// Index file (index.ts)
export { Button } from './Button'
```

## Props Pattern

Use type aliases with JSDoc comments:

```ts
// ✅ Good
type ButtonProps = {
  /** The variant style of the button */
  variant: 'primary' | 'secondary'
  /** Handler for click events */
  onClick: () => void
}

// ❌ Avoid
interface ButtonProps {
  variant: 'primary' | 'secondary'
  onClick: () => void
}
```

## Testing Guidelines

Each component should have a test file that:

- Tests rendering
- Tests user interactions
- Tests accessibility
- Tests different prop combinations

Example:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```
