# Pagination Component

A flexible pagination component for navigating through multiple pages of content with customizable appearance and behavior.

## Usage

```tsx
import { Pagination } from '@lib/components';

function PetListings() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalPets / petsPerPage);

  return (
    <div>
      {/* Your content */}
      <PetGrid pets={currentPets} />
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        showFirstLast
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentPage` | `number` | - | Current active page (required) |
| `totalPages` | `number` | - | Total number of pages (required) |
| `onPageChange` | `(page: number) => void` | - | Callback when page changes (required) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of pagination buttons |
| `variant` | `'default' \| 'outlined' \| 'minimal'` | `'default'` | Visual style variant |
| `showFirstLast` | `boolean` | `false` | Show first and last page buttons |
| `showPrevNext` | `boolean` | `true` | Show previous and next buttons |
| `siblingCount` | `number` | `1` | Number of sibling pages around current |
| `boundaryCount` | `number` | `1` | Number of pages at start/end |
| `disabled` | `boolean` | `false` | Disable all pagination controls |

## Features

- **Smart Page Range**: Automatically calculates which pages to show with ellipsis
- **Flexible Navigation**: Previous/next and first/last buttons
- **Multiple Variants**: Default, outlined, and minimal styles
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Full keyboard navigation and screen reader support
- **Customizable**: Configurable sibling and boundary counts

## Examples

### Basic Pagination
```tsx
<Pagination
  currentPage={3}
  totalPages={10}
  onPageChange={(page) => console.log('Page:', page)}
/>
```

### With First/Last Buttons
```tsx
<Pagination
  currentPage={5}
  totalPages={20}
  onPageChange={handlePageChange}
  showFirstLast
/>
```

### Different Sizes
```tsx
<Pagination
  currentPage={1}
  totalPages={5}
  onPageChange={handlePageChange}
  size="sm"
/>

<Pagination
  currentPage={1}
  totalPages={5}
  onPageChange={handlePageChange}
  size="lg"
/>
```

### Different Variants
```tsx
{/* Default variant with filled active state */}
<Pagination
  currentPage={3}
  totalPages={10}
  onPageChange={handlePageChange}
  variant="default"
/>

{/* Outlined variant */}
<Pagination
  currentPage={3}
  totalPages={10}
  onPageChange={handlePageChange}
  variant="outlined"
/>

{/* Minimal variant */}
<Pagination
  currentPage={3}
  totalPages={10}
  onPageChange={handlePageChange}
  variant="minimal"
/>
```

### Custom Sibling Count
```tsx
{/* Show 2 pages on each side of current page */}
<Pagination
  currentPage={10}
  totalPages={20}
  onPageChange={handlePageChange}
  siblingCount={2}
/>
```

### Minimal Navigation
```tsx
{/* Only show page numbers, no prev/next */}
<Pagination
  currentPage={3}
  totalPages={10}
  onPageChange={handlePageChange}
  showPrevNext={false}
/>
```

### Disabled State
```tsx
<Pagination
  currentPage={3}
  totalPages={10}
  onPageChange={handlePageChange}
  disabled
/>
```

## Page Range Algorithm

The pagination component uses an intelligent algorithm to determine which pages to display:

1. **Small ranges**: If total pages fit in available space, show all pages
2. **Large ranges**: Show current page with configurable siblings
3. **Ellipsis**: Use "..." to indicate skipped pages
4. **Boundaries**: Always show first and last pages when appropriate

### Examples of Page Ranges

```
Current: 1, Total: 10, Siblings: 1
[1] 2 3 ... 10

Current: 5, Total: 10, Siblings: 1
1 ... 4 [5] 6 ... 10

Current: 10, Total: 10, Siblings: 1
1 ... 8 9 [10]

Current: 5, Total: 20, Siblings: 2
1 ... 3 4 [5] 6 7 ... 20
```

## Integration with Data Fetching

```tsx
function PaginatedList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  const { data, totalCount } = usePaginatedData({
    page: currentPage,
    pageSize,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = async (page: number) => {
    setLoading(true);
    setCurrentPage(page);
    // Data fetching handled by hook
    setLoading(false);
  };

  return (
    <div>
      {loading ? (
        <Spinner />
      ) : (
        <ItemList items={data} />
      )}
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        disabled={loading}
      />
    </div>
  );
}
```

## Accessibility

- Full keyboard navigation (Tab, Enter, Space)
- Screen reader support with proper ARIA labels
- Current page indication with `aria-current="page"`
- Semantic navigation landmark with `role="navigation"`
- Descriptive button labels for screen readers 