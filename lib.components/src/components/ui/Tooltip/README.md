# Tooltip Component

A tooltip component for displaying contextual information on hover or focus with flexible positioning.

## Usage

```tsx
import { Tooltip } from '@/components/ui/Tooltip'

// Basic usage
<Tooltip content="This is a tooltip">
  <button>Hover me</button>
</Tooltip>

// With custom configuration
<Tooltip
  content={tooltipContent}
  position="top"
  delay={500}
  className="custom-tooltip"
>
  {triggerElement}
</Tooltip>
```

## Props

- `content`: Tooltip content (string or JSX)
- `children`: Element that triggers the tooltip
- `position`: Tooltip position relative to trigger
- `delay`: Delay before showing tooltip
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying element

## Features

- Smart positioning
- Hover and focus triggers
- Customizable delay
- Keyboard accessible
- Screen reader support
- TypeScript support
