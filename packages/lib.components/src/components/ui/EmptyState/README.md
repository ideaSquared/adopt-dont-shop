# EmptyState

Shown when a list or view has no data: a title, optional description/icon, and
optional action buttons. Variants provide preset icons for empty, error,
search, and loading contexts.

## Usage

```tsx
import { EmptyState } from '@adopt-dont-shop/lib.components';

<EmptyState
  title='No pets found'
  description='No pets match your search. Try adjusting your filters.'
  variant='search'
  actions={[
    { label: 'Clear filters', onClick: clearFilters, variant: 'primary' },
    { label: 'Browse all pets', onClick: showAll, variant: 'secondary' },
  ]}
/>;
```

## Props

| Prop          | Type                                            | Required | Default       | Description                               |
| ------------- | ----------------------------------------------- | -------- | ------------- | ----------------------------------------- |
| `title`       | `string`                                        | Yes      | —             | Main heading.                             |
| `description` | `string`                                        | No       | —             | Supporting text.                          |
| `icon`        | `React.ReactNode`                               | No       | per `variant` | Custom icon (overrides the variant icon). |
| `image`       | `string`                                        | No       | —             | Image URL shown instead of an icon.       |
| `size`        | `'sm' \| 'md' \| 'lg'`                          | No       | `'md'`        | Overall size.                             |
| `variant`     | `'default' \| 'error' \| 'search' \| 'loading'` | No       | `'default'`   | Preset icon + tone.                       |
| `actions`     | `EmptyStateAction[]`                            | No       | `[]`          | Action buttons.                           |

`EmptyStateAction` is `{ label: string; onClick: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean }`.

Write a specific title and an actionable description ("Try removing a filter"),
not a bare "Nothing here".

## Accessibility

Renders with `role="status"` and `aria-live="polite"` so the empty state is
announced, using a semantic `<h3>` for the title. The variant icon is
decorative. Action buttons are real buttons — keyboard operable and focusable.
