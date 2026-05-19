# GenericFilters (`form/FilterPanel`)

Generic filter bar for table / list views. Default export from `FilterPanel.tsx`; the component is named `GenericFilters`. Not re-exported from `lib.components/src/index.ts` — the `FilterPanel` re-export at the top level refers to a different (reports) component.

```tsx
import GenericFilters from '@adopt-dont-shop/lib.components/src/components/form/FilterPanel/FilterPanel';

const filterConfig = [
  { name: 'status', label: 'Status', type: 'select', options: [/* … */] },
  { name: 'search', label: 'Search', type: 'text' },
];

<GenericFilters
  filters={filters}
  onFilterChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
  filterConfig={filterConfig}
/>
```

## Props

| Prop             | Type                                                                | Required | Description                                            |
| ---------------- | ------------------------------------------------------------------- | -------- | ------------------------------------------------------ |
| `filters`        | `T extends Record<string, string \| boolean \| number \| undefined>` | Yes     | Current filter values.                                 |
| `onFilterChange` | `(name: string, value: string \| boolean \| number) => void`        | Yes      | Called when an individual field changes.               |
| `filterConfig`   | `FilterConfig[]`                                                    | Yes      | Field schema (label, type, options for selects, etc.). |

> The top-level `FilterPanel` named export from `@adopt-dont-shop/lib.components` is the reports-domain component (`components/reports/FilterPanel`), which has a different API. Pick the one that matches your use case.
