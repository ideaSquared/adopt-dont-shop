# ListGroup Component

A flexible list group component for displaying collections of items with various styling options.

## Usage

```tsx
import { ListGroup } from '@/components/data/ListGroup'

// Basic usage
<ListGroup items={items} />

// With custom styling
<ListGroup
  items={items}
  variant="flush"
  className="custom-class"
/>
```

## Props

- `items`: Array of items to display in the list
- `variant`: Optional styling variant
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying element

## Features

- Flexible item rendering
- Multiple styling variants
- Accessible markup
- TypeScript support
