---
name: react-query
description: >
  TanStack Query (React Query) patterns for server state. Apply when adding or
  modifying custom hooks that fetch, mutate, or cache data; when wiring optimistic
  updates; or when working with query keys, invalidation, or stale times.
---

# React Query (TanStack Query) Patterns

The apps use React Query for ALL server state. Local UI state is `useState`,
shared UI state is React Context, server state is React Query. Don't mix them.

`QueryClient` is set up in each app's `main.tsx`. Custom hooks wrap `useQuery` /
`useMutation` and live in `app.*/src/hooks/`.

## Query keys

Keys are arrays. Convention: `[entity, filters?]`.

```typescript
['pets']                          // list of pets
['pets', filters]                 // filtered list
['pets', { id: petId }]           // single pet
['pets', petId, 'comments']       // nested resource
```

Identical keys share a cache entry. Use plain objects/arrays — React Query does
structural equality, so `{ status: 'active' }` and `{ status: 'active' }` match.

## Basic query hook

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { petService, type PetFilters } from '../services/petService';

export const usePets = (filters: PetFilters = {}) =>
  useQuery({
    queryKey: ['pets', filters],
    queryFn: () => petService.getAll(filters),
    placeholderData: keepPreviousData,    // avoid blank flash on filter change
    staleTime: 30_000,                    // 30s before refetch
  });
```

| Option | When to use |
|--------|-------------|
| `staleTime` | How long data is "fresh". Set per-query based on volatility. Default 0 (always stale). |
| `gcTime` | How long to keep unused data cached (was `cacheTime` in v4). Default 5min. |
| `placeholderData: keepPreviousData` | For paginated/filtered lists — keeps the old data visible while the new query loads |
| `enabled: boolean` | Conditionally run the query. E.g. `enabled: !!userId` skips until userId exists |
| `select` | Transform/narrow data before returning — derived data without recomputing |
| `refetchInterval` | Polling. Use sparingly — prefer WebSocket or invalidation. |

## Service module pattern

The hook calls a service module (which uses `apiService` — see `api-fetch`):

```typescript
// services/petService.ts
import { apiService } from './libraryServices';
import type { Pet, PetFilters } from '../types/pet';

export const petService = {
  getAll: (filters: PetFilters) =>
    apiService.get<{ data: Pet[] }>('/api/v1/pets', { params: filters }),
  getById: (petId: string) =>
    apiService.get<{ data: Pet }>(`/api/v1/pets/${petId}`),
  create: (payload: CreatePetPayload) =>
    apiService.post<{ data: Pet }>('/api/v1/pets', payload),
};
```

Don't call `useQuery` from a component directly — wrap in a hook so the key
naming and service binding stay consistent.

## Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreatePet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePetPayload) => petService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });
};
```

In the component:

```typescript
const createPet = useCreatePet();

const handleSubmit = (data: CreatePetPayload) => {
  createPet.mutate(data, {
    onSuccess: () => navigate('/pets'),
    onError: err => toast.error(err.message),
  });
};

<Button disabled={createPet.isPending}>...</Button>
```

## Invalidation

After a mutation, invalidate the queries that depend on the changed data.
`invalidateQueries` with a prefix invalidates all matching keys:

```typescript
// Invalidates ['pets'], ['pets', filters], ['pets', petId, ...]
queryClient.invalidateQueries({ queryKey: ['pets'] });

// More targeted — only the single-pet query
queryClient.invalidateQueries({ queryKey: ['pets', petId] });
```

Be precise when you can. Invalidating `['pets']` after editing a single pet's
description re-fetches every paginated page — wasteful.

## Optimistic updates

For instant UI feedback on mutations:

```typescript
export const useTogglePetFavourite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ petId, favourite }: { petId: string; favourite: boolean }) =>
      petService.setFavourite(petId, favourite),

    onMutate: async ({ petId, favourite }) => {
      await queryClient.cancelQueries({ queryKey: ['pets', petId] });
      const previous = queryClient.getQueryData<{ data: Pet }>(['pets', petId]);

      queryClient.setQueryData<{ data: Pet }>(['pets', petId], old =>
        old ? { ...old, data: { ...old.data, favourite } } : old
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['pets', context!.previous]);
      }
    },

    onSettled: (_data, _err, { petId }) => {
      queryClient.invalidateQueries({ queryKey: ['pets', petId] });
    },
  });
};
```

The four hooks:
- `onMutate` — snapshot + apply optimistic value
- `onError` — roll back to snapshot
- `onSuccess` — usually empty (server already confirmed)
- `onSettled` — invalidate to reconcile with the server

## Pagination

For paginated lists, use `keepPreviousData` so the old page stays visible while
the new one loads:

```typescript
const filters = { page, limit: 20, status: 'available' };
const { data, isFetching } = useQuery({
  queryKey: ['pets', filters],
  queryFn: () => petService.getAll(filters),
  placeholderData: keepPreviousData,
});
```

For "load more" lists, use `useInfiniteQuery` instead.

## Auth-gated queries

Queries that need an authenticated user should be conditional on auth state:

```typescript
const { user, isAuthenticated } = useAuth();
const { data } = useQuery({
  queryKey: ['profile', user?.userId],
  queryFn: () => userService.getProfile(user!.userId),
  enabled: isAuthenticated && !!user?.userId,
});
```

The `enabled` flag prevents an unauthenticated request firing before the auth
context is ready, which would cause a 401 retry storm.

## Testing

Per the `frontend-test` skill: use `renderWithProviders` (which provides a fresh
`QueryClient` per test with retries disabled). For testing hooks directly,
construct a wrapper:

```typescript
const wrapper = ({ children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const { result } = renderHook(() => usePets(), { wrapper });
await waitFor(() => expect(result.current.isSuccess).toBe(true));
```

Mock the service module, not React Query itself. Don't `vi.mock('@tanstack/react-query')`.

## What NOT to do

- **Don't store server data in `useState`/Redux/Context** — that's React Query's
  job. Storing it elsewhere creates two sources of truth.
- **Don't `useEffect` + `setState` to fetch** — duplicates what React Query gives
  you (loading, error, caching, dedupe, refetch on focus).
- **Don't manually set `data` after a mutation** unless it's an optimistic update.
  Invalidate instead.
- **Don't put non-serializable values in query keys** (Dates, class instances).
  Use ISO strings or primitives.
- **Don't share a `QueryClient` across tests** — cached responses leak.

## Common mistakes

- Forgetting to `enabled: !!userId` on a query that depends on auth → 401 spam
- Invalidating `['pets']` after a single-pet edit → re-fetches every page
- Storing query data in component state with `useState(data)` → defeats caching
- `useEffect` to refetch on prop change → React Query already does this via key
- Mutation `onSuccess` doesn't invalidate → stale list after a create
- Not handling `isPending`/`isError` in the UI → blank screens, no error messages
- Calling `mutate` instead of `mutateAsync` and trying to `await` it → mutate
  returns void, use mutateAsync if you need the promise
- Forgetting `placeholderData: keepPreviousData` on paginated queries → flicker
  on page change
