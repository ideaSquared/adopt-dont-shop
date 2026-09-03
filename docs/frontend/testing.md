# Frontend testing guide

_How the three React apps (`app.admin`, `app.client`, `app.rescue`) are tested: the per-app render
helpers, MSW wiring, the co-location convention, and the CI ratchets. Authoring patterns (queries,
assertions, TDD) are in the [`frontend-test` skill](../../.claude/skills/frontend-test/SKILL.md)._

Stack: Vitest + React Testing Library + MSW, `jsdom` environment (repo-wide — see
[CONTRIBUTING.md](../../CONTRIBUTING.md#test-dom-environment)). Run one package with
`pnpm exec turbo test --filter=@adopt-dont-shop/app.<name>`.

## Render helpers

Each app has its own `src/test-utils/render.tsx` exporting `renderWithProviders` (also aliased as
`render`). It wraps the UI in a fresh `QueryClient` (`retry: false`), a router, and `ThemeProvider`.
**The three helpers are not identical:**

| App          | Router          | Route option                                                         |
| ------------ | --------------- | -------------------------------------------------------------------- |
| `app.admin`  | `MemoryRouter`  | `renderWithProviders(ui, { initialRoute: '/things' })` (default `/`) |
| `app.client` | `BrowserRouter` | none — takes `Omit<RenderOptions, 'wrapper'>`                        |
| `app.rescue` | `BrowserRouter` | none — takes `Omit<RenderOptions, 'wrapper'>`                        |

Only `app.admin` supports `initialRoute`. In `app.client` / `app.rescue`, set the URL before
rendering:

```tsx
import { renderWithProviders } from '@/test-utils/render';

window.history.pushState({}, '', '/search?type=dog');
renderWithProviders(<SearchPage />);
```

Unifying the three helpers (adding `initialRoute` to client/rescue) is an open follow-up — until then,
do not pass `initialRoute` to the client or rescue helper; it is silently ignored.

## MSW handlers

Shared request handlers live at `apps/client/src/test-utils/msw-handlers.ts` and
`apps/rescue/src/test-utils/msw-handlers.ts`, each exporting a `mswHandlers` array. **`app.admin` has
no shared handler module** — its tests mock services directly.

There is no global MSW server; each behaviour test in `src/__tests__/` builds its own from the shared
handlers and overrides per-test with `server.use(...)`:

```tsx
import { setupServer } from 'msw/node';
import { mswHandlers } from '../test-utils/msw-handlers';

const server = setupServer(...mswHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Co-location convention

- Unit/component tests sit next to source: `Component.tsx` + `Component.test.tsx`.
- Cross-cutting behaviour tests (full user flows against MSW) live in `src/__tests__/`, named
  `*.behavior.test.tsx`.
- There is no 1:1 test-file-per-source-file requirement — test business behaviour through the public
  UI, not implementation details.

## Coverage floors and ratchets

Per-app coverage thresholds are set in each app's `vitest.config.ts` under `coverage.thresholds`
(statements / branches / functions / lines). They are ratcheted **upward** by
`scripts/ratchet-coverage.mjs` (`pnpm ratchet:coverage`) and must never be lowered by hand.
`test:coverage` runs in `pnpm ci:local`.

Two more ratchets gate frontend code:

- `pnpm check:stories` (`scripts/check-storybook-coverage.mjs`) — every `lib.components/src/components/ui/`
  component needs a `*.stories.tsx`; the floor only rises. `pnpm ratchet:stories-coverage` bumps it.
- `pnpm check:forms` (`scripts/check-form-primitives.mjs`) — counts raw `<input>/<select>/<textarea>`
  and the deprecated `<TextInput>` as debt against `form-primitives-threshold.json`; new code must not
  raise the count. Use `FormField` + `Input` instead.

## Related

- [`frontend-test` skill](../../.claude/skills/frontend-test/SKILL.md) — authoring patterns
- [`docs/testing.md`](../testing.md) — repo-wide testing overview
- [`app-shell.md`](./app-shell.md) — what the render helpers wrap
