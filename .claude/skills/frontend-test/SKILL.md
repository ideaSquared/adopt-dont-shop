---
name: frontend-test
description: >
  Patterns for testing React apps (app.admin, app.client, app.rescue) with Vitest,
  React Testing Library, and MSW. Apply when adding or modifying component, page,
  hook, or context tests in any app.* package.
---

# Frontend Testing Patterns

The frontend apps use **Vitest** (not Jest) + **React Testing Library** + **MSW** for
API mocking. Each app has a `src/test-utils/` directory with the shared render helper.

## The shared render helper

Every test should use `renderWithProviders` from `src/test-utils/render.tsx`, never
the raw `render` from `@testing-library/react`. It wires up:

- `QueryClientProvider` with retries disabled
- `MemoryRouter` (configurable `initialRoute`)
- `ThemeProvider` from `lib.components`

```typescript
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import { describe, it, expect, vi } from 'vitest';
import { MyPage } from './MyPage';

describe('MyPage', () => {
  it('renders the heading', () => {
    renderWithProviders(<MyPage />, { initialRoute: '/things' });
    expect(screen.getByRole('heading', { name: /things/i })).toBeInTheDocument();
  });
});
```

Without this wrapper, components using `useQuery`, `useNavigate`, or theme tokens
will throw at render. Bare `render(<MyPage />)` is wrong.

## Query selectors — by accessibility, not by DOM

Prefer queries in this order (matches the React Testing Library priority):

1. `getByRole('button', { name: /save/i })` — semantic role + accessible name
2. `getByLabelText(/email/i)` — for form inputs
3. `getByPlaceholderText(...)` — when label isn't present
4. `getByText(...)` — visible static text
5. `getByDisplayValue(...)` — for input current value
6. `getByTestId(...)` — last resort

Don't query by class name, CSS selector, or DOM structure — these are implementation
details and tests break on every refactor.

```typescript
// GOOD — survives styling changes
fireEvent.click(screen.getByRole('button', { name: /submit/i }));

// BAD — coupled to implementation
fireEvent.click(container.querySelector('.submit-btn'));
```

## Mocking `apiService`

Frontend services wrap `apiService` (see the `api-fetch` skill). Mock the service
module, not `apiService` itself:

```typescript
import { vi } from 'vitest';

vi.mock('../services/petService', () => ({
  petService: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: { petId: 'p1' } }),
  },
}));

import { petService } from '../services/petService';
import { PetsPage } from './PetsPage';

it('lists pets returned by the API', async () => {
  vi.mocked(petService.getAll).mockResolvedValueOnce({
    data: [{ petId: 'p1', name: 'Buddy', status: 'available' }],
  });

  renderWithProviders(<PetsPage />);
  expect(await screen.findByText('Buddy')).toBeInTheDocument();
});
```

`findBy*` queries wait for the element to appear (async); `getBy*` is synchronous.
Use `findBy*` after any data-fetching trigger.

## Mocking custom hooks

When testing a page that uses a custom hook (e.g. `useInbox`), mock the hook
module so you can drive its return value per test:

```typescript
const mockUseInbox = vi.fn();
vi.mock('../hooks/useInbox', () => ({
  useInbox: () => mockUseInbox(),
}));

beforeEach(() => {
  mockUseInbox.mockReturnValue({ items: [], isLoading: false, error: null });
});

it('shows loading state', () => {
  mockUseInbox.mockReturnValueOnce({ items: [], isLoading: true, error: null });
  renderWithProviders(<InboxPage />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
```

## Testing hooks directly

For hooks with real logic (not just data fetching), use `renderHook`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePets } from './usePets';

const wrapper = ({ children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

it('returns pets from the service', async () => {
  const { result } = renderHook(() => usePets(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.data).toHaveLength(2);
});
```

## MSW for network-layer mocks

For integration tests that exercise multiple components fetching real network
calls, use MSW handlers from `src/test-utils/msw-handlers.ts` instead of mocking
each service. MSW intercepts `fetch`/`axios` at the network boundary:

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../test-utils/msw-server';

it('handles a 500 from the API', async () => {
  server.use(
    http.get('/api/v1/pets', () => HttpResponse.json({ error: 'Server error' }, { status: 500 }))
  );
  renderWithProviders(<PetsPage />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

Use service mocks for unit-style tests, MSW for integration tests.

## User events

`fireEvent` is fine for simple clicks. For realistic user input (typing, tabbing,
keyboard nav), use `@testing-library/user-event`:

```typescript
import userEvent from '@testing-library/user-event';

it('submits when Enter is pressed', async () => {
  const user = userEvent.setup();
  renderWithProviders(<SearchForm />);
  await user.type(screen.getByLabelText(/search/i), 'border collie{Enter}');
  expect(screen.getByText('Results for "border collie"')).toBeInTheDocument();
});
```

## Async expectations

Always `await` async assertions:

```typescript
// GOOD
expect(await screen.findByText('Saved')).toBeInTheDocument();

// BAD — flaky, the element may not have appeared yet
expect(screen.getByText('Saved')).toBeInTheDocument();
```

For absence: use `waitForElementToBeRemoved` or `queryBy*` + `waitFor`:

```typescript
await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));
```

## TypeScript rules apply

- No `any` — use `vi.MockedFunction<typeof fn>` for typed mocks
- No `as` assertions on test data — declare it with the real type
- Strict mode is on; tests must compile cleanly

## What NOT to test

- CSS class names or vanilla-extract output — that's a snapshot of styling
- Internal component state (`useState` values) — observable behaviour only
- That `apiService.get` was called — test the resulting UI

## Common mistakes

- Using raw `render` instead of `renderWithProviders` → missing context/router
- `jest.fn()` / `jest.mock()` → wrong framework, use `vi.fn()` / `vi.mock()`
- `getByText` for an async element → use `findByText`
- Asserting on class names (`.submit-button`) → coupled to implementation
- Forgetting to mock the network → tests hit real endpoints, fail in CI
- Not awaiting `userEvent` actions — they're async since v14
- Sharing a `QueryClient` across tests → cached responses leak between cases
