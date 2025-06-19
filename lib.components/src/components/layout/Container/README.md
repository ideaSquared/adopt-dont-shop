# Container Component

A layout container component that provides consistent spacing, max-width constraints, and responsive behavior.

## Usage

```tsx
import { Container } from '@/components/layout/Container'

// Basic usage
<Container>
  <div>Content goes here</div>
</Container>

// With custom configuration
<Container 
  maxWidth="lg"
  padding="md"
  centered={true}
  className="custom-container"
>
  {children}
</Container>
```

## Props

- `children`: Content to display within the container
- `maxWidth`: Maximum width constraint (xs, sm, md, lg, xl, full)
- `padding`: Padding size (none, sm, md, lg)
- `centered`: Whether to center the container
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying div element

## Features

- Responsive max-width constraints
- Flexible padding options
- Centering functionality
- Accessible markup
- TypeScript support 