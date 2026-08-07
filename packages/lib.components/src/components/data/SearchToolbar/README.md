# SearchToolbar Component

A presentational composition that ties together the pieces every list page rebuilds by hand: a search field, an optional filter panel, removable active-filter chips, and an accessible result-count summary. It owns no data — callers keep the search string, filter values and result count in their own state (and debounce if they need to).

## Usage

```tsx
import { SearchToolbar } from '@lib/components';

function PetsList() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ species: '', status: '' });

  const activeFilters = Object.entries(filters)
    .filter(([, value]) => value !== '')
    .map(([name, value]) => ({ name, label: labels[name], value: String(value) }));

  return (
    <SearchToolbar
      searchValue={search}
      onSearchChange={setSearch}
      searchLabel='Search pets'
      searchPlaceholder='Search by name…'
      filterConfig={filterConfig}
      filters={filters}
      onFilterChange={(name, value) => setFilters(prev => ({ ...prev, [name]: value }))}
      activeFilters={activeFilters}
      onRemoveFilter={name => setFilters(prev => ({ ...prev, [name]: '' }))}
      resultCount={pets.length}
    />
  );
}
```

## Props

| Prop                | Type                                                       | Default    | Description                                                                                                                                         |
| ------------------- | ---------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `searchValue`       | `string`                                                   | -          | Controlled value of the search field                                                                                                                |
| `onSearchChange`    | `(value: string) => void`                                  | -          | Called with the new value on every keystroke — debounce upstream. Omit both this and `searchValue` to render a filter-only bar with no search field |
| `searchPlaceholder` | `string`                                                   | -          | Placeholder text for the search field                                                                                                               |
| `searchLabel`       | `string`                                                   | `'Search'` | Accessible label rendered above the search field                                                                                                    |
| `filterConfig`      | `FilterConfig[]`                                           | -          | Passed straight through to the shared `FilterPanel`                                                                                                 |
| `filters`           | `Record<string, string \| boolean \| number \| undefined>` | -          | Current filter values for `FilterPanel`                                                                                                             |
| `onFilterChange`    | `(name: string, value: string \| boolean) => void`         | -          | Called by `FilterPanel` when a filter changes                                                                                                       |
| `activeFilters`     | `SearchToolbarActiveFilter[]`                              | `[]`       | Renders one removable chip per entry                                                                                                                |
| `onRemoveFilter`    | `(name: string) => void`                                   | -          | Called with the filter name when a chip's remove button is activated                                                                                |
| `resultCount`       | `number`                                                   | -          | Renders a polite live-region summary (e.g. `3 results`); `0` is honoured                                                                            |
| `resultNoun`        | `string`                                                   | `'result'` | Singular noun for the summary; pluralised automatically                                                                                             |
| `className`         | `string`                                                   | -          | Extra class on the container                                                                                                                        |
| `data-testid`       | `string`                                                   | -          | Test id on the container                                                                                                                            |

The filter panel only renders when `filterConfig`, `filters` and `onFilterChange` are all provided.

## SearchToolbarActiveFilter

```tsx
type SearchToolbarActiveFilter = {
  name: string;
  label: string;
  value: string;
};
```

## Accessibility

- The container is a `role="search"` landmark (labelled "Search and filter").
- The search field has a real, associated `<label>` via the shared `Input`.
- Each active-filter chip has a real `<button>` with an explicit label such as `Remove filter Species: Dog`, so it is fully keyboard-operable.
- The result count is a polite live region (`role="status"` / `aria-live="polite"`) so screen-reader users hear the count change as they type or filter.

## Composition note

`SearchToolbar` **reuses the shared `FilterPanel`** (`components/form/FilterPanel`) directly for filter rendering rather than reinventing it — callers get the exact same inputs (`text` / `date` / `select` / `checkbox`) they already use. The search field, chips and result summary are rendered by `SearchToolbar` itself, since `FilterPanel` covers only the filter inputs.
