# DropdownMenu Component

A dropdown menu component with support for menu items, separators, and nested menus.

## Usage

```tsx
import { DropdownMenu } from '@/components/ui/DropdownMenu'

// Basic usage
<DropdownMenu 
  trigger={<button>Menu</button>}
  items={menuItems}
/>

// With custom configuration
<DropdownMenu 
  trigger={triggerElement}
  items={menuItems}
  position="bottom-start"
  onItemClick={handleItemClick}
  className="custom-menu"
/>
```

## Props

- `trigger`: Element that triggers the menu
- `items`: Array of menu items
- `position`: Menu position relative to trigger
- `onItemClick`: Function called when item is clicked
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying element

## Features

- Keyboard navigation
- Menu item icons and shortcuts
- Separators and groups
- Accessible markup
- TypeScript support 