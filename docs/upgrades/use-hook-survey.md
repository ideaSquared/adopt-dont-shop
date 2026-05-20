# React 19 `use()` adoption — codebase survey

**Status:** evaluated and deferred. No conversion sites identified.

**Scope:** React 19 plan Stage 3 cleanup item §13 ("Adopt `use()` where it
simplifies code"), ADS-531.

## What `use()` is for

`use()` unwraps a promise inside a component, suspending until the promise
settles. It enables Suspense-based data fetching without writing a
`useState`/`useEffect`/`loading`/`error` state machine by hand. Errors throw
into the nearest `<ErrorBoundary>`; loading state defers to the nearest
`<Suspense fallback>`.

Canonical fit: a one-shot fetch on mount, where the loaded data is read but
not subsequently mutated, and where a thrown error is the right
shape for the failure UX.

## What we looked at

Every async-loading context and every page-level loader across the three apps.
Full per-site verdicts captured in the survey commit message.

## Why nothing converted

Every candidate fell into at least one of these buckets:

1. **Loaded data is mutated in place after load** — optimistic add/remove
   (favorites, notifications), pagination append (search results),
   server-driven status updates (applications). `use()` returns an immutable
   value per render; layering a `useState` mirror on top to enable mutation
   would *add* code, not remove it.

2. **Error semantics aren't "throw to boundary"** — pages catch the failure
   and either `navigate()` away (`HelpArticlePage`, `BlogPostPage` redirect
   on 404), fall back to a derived value (`app.rescue/PermissionsContext`
   falls back to a `user.role`-derived permission set), or render rich
   in-page error UI with recovery actions (`AcceptInvitation`,
   rescue `Dashboard`). Converting these would force the error into an
   ErrorBoundary and lose the bespoke UX.

3. **Interactive refetch on user input** — filters, selected resource,
   pagination cursor. Not the single-mount one-shot pattern `use()` is built
   for.

4. **Third-party async lifecycle managed by the provider** —
   `useClientAsyncInit` (Statsig) already exposes its loading state through
   the provider's `loadingComponent` prop. No useState/useEffect dance of
   ours to remove.

5. **Already using React Query** — every admin list/detail page. React
   Query is explicitly out of scope; replacing it with `use()` would lose
   the cache, retry, and staleness behaviour we rely on.

## When this should be revisited

Worth re-evaluating if any of the following land:

- A genuinely one-shot read-only fetch site is added (e.g. a static
  marketing page that loads CMS copy on mount). Convert it as part of
  the feature PR, not retroactively.
- The Statsig provider stops managing its own loading lifecycle.
- We migrate a non-React-Query page to a one-shot fetch and stop
  mutating the result. Unlikely; React Query is doing the right thing
  for that surface.

## What the team should NOT do

- Force a conversion to "demonstrate" `use()`. The hook is good — the
  fits in this codebase are bad. Forcing it regresses UX in at least
  one dimension at every site we considered.
- Convert React Query call sites to `use()`. They'd lose caching and
  retry; that's a regression even if the type signature reads cleaner.

## References

- React 19 plan: `docs/upgrades/react-19-migration.md` §4 Stage 3.13.
- ADS-531 Phase tracking: this is the last "evaluate" item from the
  React 19 plan that doesn't require its own implementation effort.
