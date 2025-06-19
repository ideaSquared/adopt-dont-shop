# BaseSidebar Component

A base sidebar component providing the foundation for navigation sidebars with collapsible functionality.

## Usage

```tsx
import { BaseSidebar } from '@/components/layout/BaseSidebar'

// Basic usage
<BaseSidebar>
  <nav>
    {/* Navigation items */}
  </nav>
</BaseSidebar>

// With custom props
<BaseSidebar 
  isOpen={isOpen}
  onToggle={handleToggle}
  className="custom-sidebar"
>
  {children}
</BaseSidebar>
```

## Props

- `children`: Content to display in the sidebar
- `isOpen`: Whether the sidebar is expanded
- `onToggle`: Function to handle sidebar toggle
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying element

## Features

- Collapsible functionality
- Responsive design
- Accessible markup
- TypeScript support
- Flexible content area 