---
name: feature-flags
description: >
  How to gate code with Statsig feature flags via lib.feature-flags. Apply when
  introducing a new feature toggle, A/B test, reading a dynamic config value,
  or working with useFeatureGate / useDynamicConfig / useConfigValue.
---

# Feature Flags (Statsig via lib.feature-flags)

Feature flags are managed through **Statsig**, accessed via
`@adopt-dont-shop/lib.feature-flags`. The library wraps Statsig's SDK with typed
hooks and a list of known gates/configs.

The backend-managed feature flag system was removed — Statsig is the only path.

## The three hooks

| Hook                                  | Returns                                   | Use when                                 |
| ------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `useFeatureGate(name)`                | `{ value: boolean }` — **destructure it** | Simple on/off toggle                     |
| `useDynamicConfig(name)`              | full config object                        | You need multiple values from one config |
| `useConfigValue(name, key, fallback)` | a single value                            | You only need one value from a config    |

**`useFeatureGate` returns an object, not a boolean.** `const x = useFeatureGate(...)` is always
truthy — the gate reads as permanently on. Always destructure `{ value }`:

```typescript
import {
  useFeatureGate,
  useConfigValue,
  KNOWN_GATES,
  KNOWN_CONFIGS,
} from '@adopt-dont-shop/lib.feature-flags';

const AdvancedSearch = () => {
  const { value: isEnabled } = useFeatureGate(KNOWN_GATES.ENABLE_ADVANCED_SEARCH);
  const maxResults = useConfigValue(
    KNOWN_CONFIGS.SYSTEM_SETTINGS,
    'api_rate_limit_per_minute',
    20
  );

  if (!isEnabled) return <LegacySearch />;
  return <SearchV2 maxResults={maxResults} />;
};
```

The real gate names are in `KNOWN_GATES` (`packages/lib.feature-flags/src/types/index.ts`):
`ENABLE_REAL_TIME_MESSAGING`, `ENABLE_ADVANCED_SEARCH`, `ENABLE_NOTIFICATION_CENTER`,
`ENABLE_APPLICATION_WORKFLOW`, `ENABLE_CONTENT_MODERATION`, `UI_SHOW_BETA_FEATURES`,
`FEATURE_SOCIAL_SHARING`, `ENABLE_ANALYTICS_TRACKING`, `ALLOW_BULK_OPERATIONS`,
`FEATURE_RATING_SYSTEM`. The real configs are `APPLICATION_SETTINGS`, `SYSTEM_SETTINGS`,
`MODERATION_SETTINGS`.

> Note: as of today no `KNOWN_GATES` constant is referenced anywhere in `apps/*/src` — the only live
> gates are two string literals (`advanced_search_filters`, `new_hero_design`). Treat `KNOWN_GATES`
> as the catalogue to add to when you deploy a named gate.

## Use the constants, not string literals

`KNOWN_GATES` and `KNOWN_CONFIGS` are the source of truth for what's currently
deployed. Using them gives type safety + autocomplete:

```typescript
// GOOD — typo here is a compile error
useFeatureGate(KNOWN_GATES.ENABLE_ADVANCED_SEARCH);

// BAD — silently returns { value: false } if the gate name is misspelled
useFeatureGate('enable_advnaced_search');
```

When adding a new gate or config:

1. Define it in Statsig first
2. Add it to `KNOWN_GATES` / `KNOWN_CONFIGS` in
   `packages/lib.feature-flags/src/types/index.ts`
3. In dev the Vite alias picks up the source directly; for a production build run
   `pnpm build:libs` (see the `new-lib` skill)

## Flag patterns

### Simple toggle

```typescript
const { value: showCenter } = useFeatureGate(KNOWN_GATES.ENABLE_NOTIFICATION_CENTER);
return showCenter ? <NotificationCenter /> : null;
```

### A/B variant

```typescript
const variant = useConfigValue(KNOWN_CONFIGS.APPLICATION_SETTINGS, 'variant', 'control');

switch (variant) {
  case 'control': return <SignupControl />;
  case 'simplified': return <SignupSimplified />;
  case 'with-onboarding': return <SignupOnboarding />;
  default: return <SignupControl />;
}
```

The fallback is critical — if Statsig is unreachable, the user sees the safe
default, not a blank screen.

### Gated route

```typescript
import { Navigate } from 'react-router';

const ReportsRoute = () => {
  const { value: enabled } = useFeatureGate(KNOWN_GATES.UI_SHOW_BETA_FEATURES);
  if (!enabled) return <Navigate to="/dashboard" replace />;
  return <ReportsV2Page />;
};
```

### Gated server call

Don't roll your own backend gate — pass the flag to the API and let the backend
decide:

```typescript
const { value: includeBeta } = useFeatureGate(KNOWN_GATES.ENABLE_APPLICATION_WORKFLOW);
const { data } = usePets({ ...filters, beta: includeBeta });
```

The backend should accept the parameter and act on it. Backend code MUST NOT
re-check Statsig — only the frontend evaluates user-targeted gates.

## Loading state

Statsig evaluates client-side after a roundtrip. Until the SDK is ready, every
gate returns `{ value: false }`. For most UI this is fine — the safe default
renders, then flips when the SDK loads. Frame gates so that "off" is the safe
state and no readiness check is needed.

## Fallback safety

Every flag check needs a safe default. Ask: "if Statsig is down, what should
the user see?" — usually the existing behaviour, not the new one.

```typescript
// GOOD — feature is off when SDK is down or slow
const { value: showBeta } = useFeatureGate(KNOWN_GATES.UI_SHOW_BETA_FEATURES);
return showBeta ? <Experimental /> : <Stable />;

// BAD — a gate named to mean "hide the new thing" shows experimental UI on outage
const { value: hideBeta } = useFeatureGate(KNOWN_GATES.UI_SHOW_BETA_FEATURES);
return hideBeta ? <Stable /> : <Experimental />;
```

Frame gates as "show the new thing" not "hide the new thing" — the false default
is safer.

## Don't gate forever

Feature flags are temporary. Once a feature is fully rolled out:

1. Remove the gate from the code
2. Delete the entry from `KNOWN_GATES`
3. Archive the gate in Statsig

Leaving flags around indefinitely creates dead code paths, confuses developers,
and the underlying code drifts from the gated branch.

## What NOT to flag

- Permission/auth decisions — those are RBAC, not feature flags
- Schema/validation rules — those are versioned, not flagged
- Hotfix toggles — those should be config, not flags
- Anything that needs server-side enforcement — flags are advisory, not security

If a user shouldn't be able to do something, the backend RBAC must enforce it
(see the `permissions-frontend` and field-permissions skills). A frontend flag
is bypassable.

## Testing flagged code

Mock the hook in tests:

```typescript
vi.mock('@adopt-dont-shop/lib.feature-flags', () => ({
  useFeatureGate: vi.fn(),
  KNOWN_GATES: { ENABLE_ADVANCED_SEARCH: 'enable_advanced_search' },
}));

import { useFeatureGate } from '@adopt-dont-shop/lib.feature-flags';

it('renders legacy when flag off', () => {
  vi.mocked(useFeatureGate).mockReturnValue({ value: false });
  renderWithProviders(<PetSearchEntry />);
  expect(screen.getByTestId('legacy-search')).toBeInTheDocument();
});

it('renders v2 when flag on', () => {
  vi.mocked(useFeatureGate).mockReturnValue({ value: true });
  renderWithProviders(<PetSearchEntry />);
  expect(screen.getByTestId('search-v2')).toBeInTheDocument();
});
```

Test both branches — that's the entire point of the flag.

## Common mistakes

- String-literal flag names (`useFeatureGate('foo')`) → typo silently returns false
- No fallback value on `useConfigValue` → undefined breaks downstream consumers
- Defaulting to the new behaviour when Statsig is down → outage = experimental
  UI for everyone
- Backend re-evaluating the same gate → either source-of-truth ambiguity or a
  redundant SDK call. Frontend evaluates, server accepts a parameter.
- Flag left in code after full rollout → dead code, confused readers
- Using flags for permission gates → bypassable, use RBAC instead
- Testing only the "flag on" branch — the off branch is the rollback path, test it
- Not destructuring `useFeatureGate` — `{ value }`, never the bare object

Canonical doc: [`packages/lib.feature-flags/README.md`](../../../packages/lib.feature-flags/README.md).
