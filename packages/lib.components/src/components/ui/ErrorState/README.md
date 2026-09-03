# ErrorState

A presentational error display for surfacing failed operations in a consistent,
accessible way. Renders an alert with a title, an optional message and icon, and
an optional retry button.

## Usage

```tsx
import { ErrorState } from '@adopt-dont-shop/lib.components';

function PetList() {
  const { data, isError, error, refetch } = usePets();

  if (isError) {
    return (
      <ErrorState
        title='Failed to load pets'
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  return <PetGrid pets={data} />;
}
```

## Props

| Prop          | Type                   | Default                  | Description                                       |
| ------------- | ---------------------- | ------------------------ | ------------------------------------------------- |
| `title`       | `string`               | `'Something went wrong'` | Main heading text                                 |
| `message`     | `string`               | -                        | Optional supporting detail                        |
| `onRetry`     | `() => void`           | -                        | When provided, renders a "Try again" retry button |
| `icon`        | `React.ReactNode`      | -                        | Optional icon rendered above the title            |
| `size`        | `'sm' \| 'md' \| 'lg'` | `'md'`                   | Size of the error state                           |
| `className`   | `string`               | -                        | Additional CSS class                              |
| `data-testid` | `string`               | -                        | Test id forwarded to the root element             |

## Accessibility

- Root element has `role="alert"` so screen readers announce the error.
- The retry button is a native `<button>` and is fully keyboard accessible.
- A supplied icon is decorative and sized within its container.

## Examples

### Basic

```tsx
<ErrorState message='We could not reach the server.' />
```

### With retry

```tsx
<ErrorState
  title='Failed to load applications'
  message='Please try again in a moment.'
  onRetry={() => refetch()}
/>
```

### With a custom icon

```tsx
<ErrorState icon={<WarningIcon />} title='Upload failed' onRetry={retry} />
```
