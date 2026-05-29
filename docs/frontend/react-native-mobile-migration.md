# React Native + Expo — Mobile App Exploration

> **Status:** Exploratory. No mobile app exists today. This document captures *why* React Native + Expo is the best-aligned choice for a future native app, and *how* it would slot into this monorepo. It is a decision aid, not a committed roadmap.

## TL;DR

If we build a native mobile app, **React Native + Expo** aligns with this repo far better than the alternatives (Flutter, native Swift/Kotlin). It is the same insight that already drives our three web apps: share framework-agnostic TypeScript from `lib.*`, write per-surface UI on top. A React Native `app.mobile` would import `lib.types`, `lib.api`, `lib.validation`, `lib.utils`, and `lib.matching` straight from the npm workspace, be orchestrated by Turborepo, and be written by the same engineers in the same language.

The one thing it does **not** reuse is the view layer: React Native renders to `<View>`/`<Text>`, not the DOM, so `lib.components` (React DOM + Radix + Recharts + vanilla-extract) does not port.

## Why not Flutter (or native)?

The repo is a TypeScript/React monorepo on npm workspaces + Turborepo. Alignment was the deciding factor.

| Criterion | React Native + Expo | Flutter | Native (Swift + Kotlin) |
| --- | --- | --- | --- |
| Language | TypeScript (same as repo) | Dart (new) | Swift + Kotlin (two new) |
| Reuse `lib.types/api/validation/utils/matching` | ✅ directly via workspace | ❌ none | ❌ none |
| Reuse `lib.components` UI | ❌ (RN ≠ DOM) | ❌ | ❌ |
| Fits npm workspaces + Turborepo | ✅ native fit | ❌ tooling island | ❌ |
| Team skill match | ✅ React/TS already | ❌ retrain | ❌ retrain ×2 |
| Native UX / performance | ✅ very good | ✅ best-in-class | ✅ best-in-class |
| One codebase → iOS + Android | ✅ | ✅ | ❌ two codebases |

Flutter is an excellent framework on its own merits, but for *this repo* it shares none of our TypeScript, ignores Turbo/npm, and needs a parallel Dart toolchain — it becomes a tooling island. React Native keeps mobile inside the same mental model and build graph as everything else.

### Lighter-weight alternatives to consider first

A full native app is not always warranted. Cheaper options, in rough order of effort:

1. **PWA** — make `app.client` installable (manifest + service worker). Near-zero cost, no app store, but covers "usable and installable on a phone." Good for validating mobile demand before investing.
2. **Capacitor** — wrap the existing `app.client` web build in a native shell for app-store distribution with access to some native APIs. Maximum reuse, webview fidelity.
3. **React Native + Expo** — a true native app. Choose this when we need genuine native UX, smooth offline, push notifications, camera, or a first-class app-store presence.

A common path: ship the PWA first, then invest in React Native if native features become the driver.

## What gets reused vs. rewritten

The `lib.*` packages split cleanly by whether they touch React/DOM:

**Reusable as-is (framework-agnostic TypeScript):**

- `lib.types` — pure type definitions
- `lib.api` — Zod schemas + types (API contracts)
- `lib.validation` — Zod validation schemas
- `lib.utils` — date-fns helpers and pure utilities
- `lib.matching` — pure matching logic
- Likely candidates pending audit: `lib.discovery`, `lib.search`, `lib.permissions`, `lib.feature-flags` (reusable to the extent their logic is free of React/DOM)

**Not reusable (React DOM / web-only) — needs a mobile equivalent:**

- `lib.components` — depends on `react-dom`, Radix UI, Recharts, vanilla-extract. The mobile app needs its own RN component layer (e.g. via a UI kit or hand-rolled primitives).
- `lib.auth` — the auth *logic* is portable, but its UI components and vanilla-extract styles are web-only. Consider extracting any shared logic into a logic-only module if mobile needs it.

**Rule of thumb before importing a lib into mobile:** if its `package.json` lists `react-dom`, `@vanilla-extract/*`, or Radix, it is web-only. If it only depends on `zod`, `date-fns`, `lib.types`, etc., it is safe for React Native.

## How it slots into the monorepo

```
adopt-dont-shop/
├── app.admin/  app.client/  app.rescue/   # React web (Vite)
├── app.mobile/                            # NEW — React Native + Expo
│   ├── app/                               # screens (Expo Router)
│   ├── src/components/                    # RN UI primitives (replaces lib.components)
│   ├── app.json / app.config.ts           # Expo config
│   ├── package.json                       # @adopt-dont-shop/app.mobile
│   └── tsconfig.json
├── lib.*/                                 # shared libraries (unchanged)
└── service.backend/                       # API (the contract mobile consumes)
```

Integration points:

- **npm workspace:** add `"app.mobile"` to the root `package.json` `workspaces` array. It then resolves `@adopt-dont-shop/lib.*` like every other package.
- **Turborepo:** `build`, `lint`, `type-check`, and `test` tasks work out of the box once `app.mobile/package.json` defines those scripts. Mobile-specific tasks (`expo start`, EAS builds) live as additional scripts and run outside the normal web pipeline.
- **TypeScript:** extend `tsconfig.base.json` as the other packages do.
- **Testing:** the repo standard is Vitest; React Native's ecosystem standard is Jest + `@testing-library/react-native`. This is a real divergence — see Open Questions.
- **API contract:** mobile talks to `service.backend` over HTTP using the same Zod schemas/types from `lib.api`/`lib.types`, so the contract stays in sync without a separate codegen step.

## High-level migration phases

Each phase should leave the repo in a working, shippable state (per our TDD / small-increments workflow).

1. **Scaffold** → verify: `npx create-expo-app app.mobile` (TypeScript template), add to workspaces, `npm install` resolves, `expo start` boots the blank app on a simulator.
2. **Wire shared libs** → verify: import a type from `lib.types` and a schema from `lib.validation` in a screen; `npm run type-check` passes for `app.mobile`.
3. **Auth + API client** → verify: log in against `service.backend` (or staging) using `lib.api` contracts; token persisted; an authenticated request succeeds.
4. **Core adopter flows** → verify: browse pets, view pet detail, submit/track an application — driven by tests against the real API contract.
5. **Native capabilities** → verify: push notifications, image upload from camera/gallery, offline-friendly caching (React Query) behave on device.
6. **CI + release** → verify: GitHub Actions runs `type-check`/`lint`/tests for `app.mobile`; **EAS Build** produces iOS/Android artifacts; TestFlight + Play internal testing distribution works.

## Recommended stack within React Native

- **Expo (managed workflow)** — handles native build complexity, OTA updates, and EAS Build/Submit for the app stores. Avoid bare React Native unless a native module forces it.
- **Expo Router** — file-based routing, familiar to the team from web routing patterns.
- **React Query** — already our server-state model on web; carries over directly.
- **Styling** — vanilla-extract does not target RN. Pick an RN-native approach (StyleSheet, or a token-driven solution) and mirror our [design tokens](../../DESIGN_TOKENS.md) so the visual language stays consistent.

## Open questions before committing

1. **What is the driver?** App-store presence, push, camera, offline — or just "usable on a phone"? The last is a PWA, not React Native.
2. **Which surface?** Adopter/client experience only, or also rescue/admin tooling? (Admin/rescue are data-dense dashboards — often better as responsive web than native.)
3. **Test runner divergence.** The repo standardizes on Vitest; React Native's path of least resistance is Jest. Do we accept Jest in `app.mobile`, or invest in Vitest + RN? This needs a decision and ideally an ADR.
4. **Styling/design-token strategy** for RN so mobile and web stay visually aligned.
5. **In-repo vs. separate repo.** This doc assumes in-repo (for shared-lib reuse and atomic backend+mobile PRs). App-store release cadence differs sharply from web deploys — if the mobile team wants independent release control, a separate repo consuming `lib.*` as published packages is the alternative.

## References

- [Frontend technical architecture](./technical-architecture.md) — how the web app shells, routing, state, and styling are structured today
- [Design tokens](../../DESIGN_TOKENS.md) — theme tokens to mirror on mobile
- [Backend service PRD](../backend/service-backend-prd.md) — the API surface mobile would consume
