# Page Component Structure

This document outlines the standard structure for page components in the application.

## Component Template

```tsx
import React from 'react'

// Third-party imports (alphabetically ordered)
import styled from 'styled-components'

// Internal component imports (alphabetically ordered)
import { ComponentA, ComponentB } from '@adoptdontshop/components'

// Type imports (alphabetically ordered)
import { TypeA, TypeB } from '@adoptdontshop/types'

// Hook imports (alphabetically ordered)
import { useHookA } from 'hooks/useHookA'

// Style definitions
const StyledContainer = styled.div`
  // styles here
`

// Type definitions
type PageNameProps = {
  propA: string
  propB?: number
}

// Component definition
export const PageName: React.FC<PageNameProps> = ({ propA, propB }) => {
  // State and hooks
  const [state, setState] = useState()

  // Effects
  useEffect(() => {
    // effect code
  }, [])

  // Event handlers
  const handleEvent = () => {
    // handler code
  }

  // Render
  return <StyledContainer>{/* component content */}</StyledContainer>
}
```

## Directory Structure

Each page directory should have:

1. An index.ts file exporting the page components
2. Individual page component files
3. Page-specific components in a `components` subdirectory (if needed)

Example:

```
pages/
  dashboard/
    index.ts
    Dashboard.tsx
    Staff.tsx
    components/
      StaffList.tsx
      StaffForm.tsx
```

## Export Pattern

Use named exports in both component files and index.ts:

```ts
// Component file (Staff.tsx)
export const Staff: React.FC<StaffProps> = () => {
  // ...
}

// Index file (index.ts)
export { Staff } from './Staff'
```

## Props Pattern

Use type aliases instead of interfaces for prop definitions:

```ts
// ✅ Good
type StaffProps = {
  isAdmin: boolean
}

// ❌ Avoid
interface StaffProps {
  isAdmin: boolean
}
```
