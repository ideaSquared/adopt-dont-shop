# QueryBoundary Component

A prop-driven wrapper that renders the correct branch for an async data view:
loading, error, empty, or the successful `children`. It removes the hand-written
loading/error/empty branches every page repeats.

`QueryBoundary` is deliberately **data-source agnostic** — it takes plain
booleans, so it works with React Query, SWR, `useState`, or anything else. It
does **not** depend on `@tanstack/react-query`.

## Branch precedence

`loading → error → empty → children`

The first matching state wins, so a loading view is never masked by a stale
error or empty flag.

## Usage

```tsx
import { QueryBoundary } from '@lib/components';
import { useQuery } from '@tanstack/react-query';

function PetList() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pets'],
    queryFn: fetchPets,
  });

  return (
    <QueryBoundary
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={data?.length === 0}
      onRetry={() => refetch()}
    >
      <PetGrid pets={data ?? []} />
    </QueryBoundary>
  );
}
```

## Props

| Prop              | Type              | Default                                   | Description                                     |
| ----------------- | ----------------- | ----------------------------------------- | ----------------------------------------------- |
| `isLoading`       | `boolean`         | -                                         | When `true`, renders the loading fallback       |
| `isError`         | `boolean`         | `false`                                   | When `true`, renders the error fallback         |
| `error`           | `unknown`         | -                                         | Used to derive the default error message        |
| `isEmpty`         | `boolean`         | `false`                                   | When `true`, renders the empty fallback         |
| `onRetry`         | `() => void`      | -                                         | Passed to the default `ErrorState` retry button |
| `children`        | `React.ReactNode` | -                                         | Rendered on success                             |
| `loadingFallback` | `React.ReactNode` | `<Skeleton />`                            | Override for the loading branch                 |
| `errorFallback`   | `React.ReactNode` | `<ErrorState onRetry message />`          | Override for the error branch                   |
| `emptyFallback`   | `React.ReactNode` | `<EmptyState title="Nothing here yet" />` | Override for the empty branch                   |

## Error message derivation

The `error` prop is typed `unknown`. The default error fallback derives a
readable message safely: an `Error` contributes its `.message`, a `string` is
used verbatim, and anything else falls back to the `ErrorState` default title.
No type assertions are used.

## Custom fallbacks

Each branch can be replaced independently:

```tsx
<QueryBoundary
  isLoading={isLoading}
  isError={isError}
  isEmpty={isEmpty}
  loadingFallback={<SkeletonCard lines={4} />}
  emptyFallback={<EmptyState title='No pets yet' description='Add your first pet.' />}
>
  <PetGrid pets={pets} />
</QueryBoundary>
```
