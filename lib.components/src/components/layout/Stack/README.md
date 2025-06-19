# Stack Component

A flexible layout component for stacking elements vertically or horizontally with consistent spacing.

## Usage

```tsx
import { Stack } from '@/components/layout/Stack'

// Basic vertical stack
<Stack>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Stack>

// Horizontal stack with custom spacing
<Stack 
  direction="horizontal"
  spacing="lg"
  align="center"
  className="custom-stack"
>
  {children}
</Stack>
```

## Props

- `children`: Elements to stack
- `direction`: Stack direction (vertical, horizontal)
- `spacing`: Space between items (none, xs, sm, md, lg, xl)
- `align`: Alignment of items (start, center, end, stretch)
- `justify`: Justification of items (start, center, end, between, around)
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying div element

## Features

- Vertical and horizontal stacking
- Flexible spacing options
- Alignment and justification controls
- Responsive behavior
- Accessible markup
- TypeScript support 