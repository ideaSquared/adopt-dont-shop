# DropdownButton Component

A button component that triggers dropdown menus with flexible content and positioning.

## Usage

```tsx
import { DropdownButton } from '@/components/ui/DropdownButton'

// Basic usage
<DropdownButton label="Actions">
  <div>Dropdown content</div>
</DropdownButton>

// With custom configuration
<DropdownButton
  label="More Options"
  variant="secondary"
  position="bottom-end"
  className="custom-dropdown"
>
  {dropdownContent}
</DropdownButton>
```

## Props

- `label`: Button text or content
- `children`: Dropdown content
- `variant`: Button styling variant
- `position`: Dropdown position relative to button
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying button element

## Features

- Flexible positioning
- Keyboard navigation
- Click outside to close
- Accessible markup
- TypeScript support
