# FilterPanel Component

A flexible filter panel component for creating advanced filtering interfaces with various filter types.

## Usage

```tsx
import { FilterPanel } from '@/components/form/FilterPanel'

// Basic usage
<FilterPanel 
  filters={filters}
  onApplyFilters={handleApplyFilters}
/>

// With custom configuration
<FilterPanel 
  filters={filters}
  onApplyFilters={handleApplyFilters}
  onClearFilters={handleClearFilters}
  className="custom-filter-panel"
/>
```

## Props

- `filters`: Array of filter configurations
- `onApplyFilters`: Function called when filters are applied
- `onClearFilters`: Optional function called when filters are cleared
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying element

## Features

- Multiple filter types support
- Collapsible sections
- Clear all functionality
- Accessible markup
- TypeScript support 