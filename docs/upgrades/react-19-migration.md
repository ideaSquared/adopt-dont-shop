# React 18 → React 19 Migration Plan

**Linear**: ADS-531 (this document covers the React portion)
**Status**: Not started — planning only
**Recommended quarter**: After Express 5 lands; before mid-2026 to stay on
ecosystem-supported majors.

> React 19 stable shipped on **2024-12-05**. The big-ticket items are
> stable `use()`, the React Compiler (opt-in), removal of legacy APIs, and
> changes to `forwardRef`/`useReducer`/`useDeferredValue` semantics. We are
> already on the modern entry points (`createRoot`, no `defaultProps` on
> function components, no `propTypes`, no `ReactDOM.render`), so the
> upgrade is largely mechanical.

## 1. Current state

React lives in three apps and one shared component library:

| Package | `react` | `react-dom` | `@types/react` | `react-router-dom` | `styled-components` |
| --- | --- | --- | --- | --- | --- |
| `app.admin` | ^18.2.0 | ^18.2.0 | ^18.3.3 | ^6.22.3 | ^6.1.12 |
| `app.client` | ^18.2.0 | ^18.2.0 | ^18.3.3 | ^6.22.3 | ^6.1.12 |
| `app.rescue` | ^18.2.0 | ^18.2.0 | ^18.3.3 | ^6.22.3 | ^6.1.19 |
| `lib.components` (peer) | >=18.0.0 | >=18.0.0 | ^18.3.3 | >=6.0.0 | ^6.1.12 |

Build/test toolchain (modern, no blockers):

- `vite`: ^8.0.10
- `@vitejs/plugin-react`: ^6.0.1
- `vitest`: ^4.0.8
- `@testing-library/react`: ^16.3.2 (already React 19 aware — v16 is the v19 line)

Surface area:

| Concern | Count |
| --- | --- |
| `*.tsx`/`*.ts` files in apps + lib.components | 709 |
| `useEffect` call sites | 200 |
| `forwardRef` call sites | 21 |
| `<Suspense>` usages | 13 |
| `<StrictMode>` usages | 3 (one per app — already on, good) |
| `defaultProps` on function components | 0 |
| `propTypes` declarations | 0 |
| `ReactDOM.render` (legacy) | 0 — all use `createRoot` |
| `react-test-renderer` | 0 — we use Testing Library |

We are in genuinely good shape — no legacy APIs to retire.

## 2. Breaking changes

References:
- React 19 release post — <https://react.dev/blog/2024/12/05/react-19>
- React 19 upgrade guide — <https://react.dev/blog/2024/04/25/react-19-upgrade-guide>
- React 19 RC notes — <https://react.dev/blog/2024/04/25/react-19>

| Change | Risk for us | Notes |
| --- | --- | --- |
| **`forwardRef` no longer required** — `ref` is a regular prop on function components | Low | We can leave existing 21 `forwardRef` call sites alone; cleanup later. |
| **`propTypes` and `defaultProps` removed for function components** | None | We use neither. |
| **Legacy context (`contextTypes`) removed** | None | Not used. |
| **String refs removed** | None | Not used. |
| **Module pattern factories removed** | None | Not used. |
| **`createFactory` removed** | None | Not used. |
| **`react-test-renderer/shallow` removed** | None | Not used. |
| **`<Context.Provider>` → `<Context>`** (Provider element type now optional) | Low | Old form still works; cleanup later. |
| **`useRef` requires an argument** | Low | Verify all `useRef()` no-arg calls. |
| **`act` from `react`/`react-dom/test-utils` deprecated → use `@testing-library/react`'s `act`** | Low | Re-export pattern; minor codemod. |
| **`ReactDOM.findDOMNode` removed** | None | Not used. |
| **`react-dom` server export changes** (`renderToString` warns on Suspense) | Low | We don't SSR. |
| **`styled-components` v6 ESM/CJS friction with React 19** | Medium | Verify with smoke test. styled-components 6.1.x supports React 19 from 6.1.13+. We're on 6.1.12/6.1.19 — `app.client` and `app.admin` will need a tiny bump. |
| **`react-router-dom@6` works with React 19**; v7 is the next major and is independent | None | We can stay on v6 for this upgrade. |
| **`@testing-library/react@16` is the React 19 line** | None | Already there. |
| **Hydration error message format changed** | Low | We don't SSR; only matters if devs rely on log strings. |
| **`<form action={fn}>` server actions** | New feature | Adopt incrementally after the bump. |
| **`use()` hook stable** | New feature | Adopt incrementally. |
| **React Compiler (experimental)** | Optional | Don't enable on first pass. |
| **Stricter dev warnings around effect re-runs** | Low | We already have one StrictMode-induced bug fixed (ADS-375); upgrade may surface another. |

## 3. Risk inventory

### 3.1 styled-components version bump

`app.admin` and `app.client` are on `styled-components@^6.1.12`. The first
React-19-safe release is `6.1.13`. Bump these as part of the React 19 PR
(or in a separate prep PR — see Stage 1 below). `app.rescue` is on `^6.1.19`
already.

### 3.2 `forwardRef` cleanup (optional)

21 call sites can be simplified post-upgrade. Not required for the bump.
File a follow-up.

### 3.3 `useRef()` no-arg calls

```bash
grep -rE "useRef\(\)" app.*/src lib.components/src
```

Run before the upgrade and pass an explicit `null` (or appropriate initial
value) to silence the new warning.

### 3.4 Suspense / `use()` boundaries

13 `<Suspense>` sites — verify the loading-state UX still renders the
expected fallback under React 19's slightly tightened transition timing.
Spot-check, no automated fix.

### 3.5 Test infrastructure

- `@testing-library/react@16` is already the React 19 line.
- `act` should already be imported from `@testing-library/react`, not from
  `react-dom/test-utils`. Run:

  ```bash
  grep -rE "from ['\"]react-dom/test-utils['\"]" app.*/src lib.components/src
  ```

  At audit time this returns 0 — we're clean.

### 3.6 Vitest + React DOM compatibility

`vitest@4` + `@vitejs/plugin-react@6` already support React 19. No bump
required there.

### 3.7 ESM/CJS interop quirks

Watch for any deps still shipping CommonJS-only `react` re-exports.
Vite usually papers over this; if a dep breaks, we'll see it as a
build-time error.

## 4. Migration path

**Stage 1 — Preparatory (low-risk, can happen now):**

1. Bump `styled-components` to `^6.1.13` minimum in `app.admin` and
   `app.client` (already higher in `app.rescue`). Out of scope for the
   audit PR but explicitly low-risk.
2. Sweep for `useRef()` no-arg calls and pass explicit initial values.
3. Add a smoke test per app that renders the home route and asserts a key
   element appears (regression tripwire for the upgrade).

**Stage 2 — The bump (one PR per app, or one combined PR — pick based on
team preference):**

4. Bump `react` and `react-dom` to `^19.x` in all four packages
   (`app.admin`, `app.client`, `app.rescue`, `lib.components` peerDeps and
   devDeps). The peer-dep pin in `lib.components` should be `>=18.0.0`
   broadened to `>=18.0.0` (no change needed) **or** tightened to `>=19.0.0`
   if we don't want to support both — recommend keeping permissive.
5. Bump `@types/react` and `@types/react-dom` to `^19.x`.
6. `npm install` to resolve. Run the type-checker — fix any type drift
   (mostly `ReactNode` and `JSX.Element` namespace tweaks).
7. Run all three apps' Vitest suites.
8. Run all three apps in dev mode locally; smoke-test each route group.
9. Storybook (`lib.components`) — verify all stories render.

**Stage 3 — Optional follow-ups:**

10. Drop `forwardRef` wrappers in favour of plain `ref` props.
11. Adopt `<Context>` shorthand.
12. Evaluate React Compiler opt-in.
13. Adopt server actions / `use()` where they simplify code.

## 5. Effort estimate

- Stage 1 prep: **0.5 dev-day**.
- Stage 2 bump + fix per app: **1 dev-day per app + 0.5 day for
  lib.components** = **3.5 dev-days**.
- Stage 3 cleanups: **2–4 dev-days**, deferrable indefinitely.

**Total: ~4 dev-days for the upgrade itself, ~6–8 with cleanup.**

## 6. Test / rollback plan

**Tests:**

- Full Vitest suite for each app (`npx turbo test --filter=@adopt-dont-shop/app.admin` etc.).
- Storybook build for `lib.components` (`npx turbo storybook:build`).
- Manual smoke of every app:
  - `app.client`: home, sign-in, sign-up, verify-email, browse pets,
    application form.
  - `app.rescue`: dashboard, pets list, applications list, edit profile.
  - `app.admin`: dashboard, users list, audit logs, support tickets.
- Visual regression: load each major page in dev mode, eyeball for layout
  shifts (styled-components is the most likely culprit).

**Rollback:**

- Bumps confined to four `package.json` files + lockfile + a small number
  of code adjustments. A revert PR returns to React 18.
- No persistent state involved — frontend rollback is a redeploy.

## 7. Prerequisites

- Should land **after** Express 5 / Sequelize 7 backend work to keep
  frontend churn separate from backend churn during integration testing.
- Node 22 migration (ADS-532) is independent — Vite/Vitest run on whatever
  Node version is current.
- styled-components ≥ 6.1.13 in all consumer apps (Stage 1 above).

## 8. Linear follow-up sub-issues to file (titles only)

- `[Deps][React 19] Bump styled-components to 6.1.13+ in app.admin and app.client`
- `[Deps][React 19] Sweep useRef() no-arg calls and pass explicit initial values`
- `[Deps][React 19] Add per-app smoke tests rendering home route as upgrade tripwire`
- `[Deps][React 19] Bump react/react-dom/@types/react in app.admin`
- `[Deps][React 19] Bump react/react-dom/@types/react in app.client`
- `[Deps][React 19] Bump react/react-dom/@types/react in app.rescue`
- `[Deps][React 19] Bump react/react-dom/@types/react in lib.components`
- `[Deps][React 19] Cleanup: drop forwardRef wrappers in favour of ref props`
- `[Deps][React 19] Cleanup: shorten <Context.Provider> to <Context>`
- `[Deps][React 19] Evaluate React Compiler opt-in (separate spike ticket)`
