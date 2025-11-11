# Testing Architecture: Current vs. Recommended

## Current Architecture (❌ Not Scalable)

```
adopt-dont-shop/
├── app.client/
│   ├── src/
│   │   ├── __mocks__/
│   │   │   └── @adopt-dont-shop/
│   │   │       ├── lib-auth.tsx          ← DUPLICATED for each app
│   │   │       ├── lib-api.ts
│   │   │       ├── lib-pets.ts
│   │   │       ├── lib-discovery.ts
│   │   │       └── ...
│   │   └── test-utils/
│   │       ├── test-helpers.tsx          ← DUPLICATED for each app
│   │       ├── mock-providers.tsx
│   │       └── msw-handlers.ts
│   └── jest.config.cjs                   ← Requires explicit moduleNameMapper
│
├── app.rescue/                            ← Would need ALL the same mocks
│   ├── src/
│   │   ├── __mocks__/                    ← DUPLICATE EVERYTHING
│   │   └── test-utils/                   ← DUPLICATE EVERYTHING
│   └── jest.config.cjs                   ← DUPLICATE config
│
├── app.admin/                             ← Would need ALL the same mocks
│   ├── src/
│   │   ├── __mocks__/                    ← DUPLICATE EVERYTHING
│   │   └── test-utils/                   ← DUPLICATE EVERYTHING
│   └── jest.config.cjs                   ← DUPLICATE config
│
└── lib.auth/
    └── src/
        └── AuthService.ts                 ← Mock lives far away from source
```

**Problems:**
- 🔴 3x duplication of ALL mocks (client, rescue, admin)
- 🔴 3x duplication of ALL test helpers
- 🔴 Update auth mock = 3 files to change
- 🔴 New library = 3 new mock files
- 🔴 Configuration nightmare
- 🔴 Not DRY at all

---

## Recommended Architecture (✅ Industry Standard)

```
adopt-dont-shop/
├── app.client/
│   ├── jest.config.cjs                   ← Minimal config, no mock paths
│   └── src/
│       └── (tests use shared mocks)
│
├── app.rescue/
│   ├── jest.config.cjs                   ← Same minimal config
│   └── src/
│       └── (tests use shared mocks)
│
├── app.admin/
│   ├── jest.config.cjs                   ← Same minimal config
│   └── src/
│       └── (tests use shared mocks)
│
├── lib.auth/                              ← Mock lives WITH the code
│   ├── src/
│   │   ├── index.ts
│   │   └── AuthService.ts
│   └── __mocks__/
│       └── index.ts                       ← Single source of truth
│
├── lib.discovery/
│   ├── src/
│   │   └── DiscoveryService.ts
│   └── __mocks__/
│       └── index.ts                       ← Auto-discovered by Jest
│
├── lib.pets/
│   ├── src/
│   │   └── PetsService.ts
│   └── __mocks__/
│       └── index.ts                       ← Co-located with source
│
├── lib.api/
│   ├── src/
│   │   └── ApiService.ts
│   └── __mocks__/
│       └── index.ts
│
└── lib.dev-tools/                         ← Shared test utilities
    └── src/
        └── test-utils/
            ├── render-helpers.tsx         ← Used by ALL apps
            ├── mock-providers.tsx         ← Used by ALL apps
            ├── msw-handlers.ts            ← Used by ALL apps
            └── fixtures.ts                ← Used by ALL apps
```

**Benefits:**
- ✅ **Zero duplication** - Each mock exists once
- ✅ **Auto-discovery** - Jest finds `__mocks__/` automatically
- ✅ **Co-location** - Mock lives with the code it mocks
- ✅ **Shared utilities** - All apps import from lib.dev-tools
- ✅ **Easy updates** - Change mock in one place
- ✅ **Type safety** - Mocks can import from library source
- ✅ **New libraries** - Just add `__mocks__/index.ts`

---

## How Jest Finds Mocks

### Current (Manual Configuration)
```javascript
// app.client/jest.config.cjs
moduleNameMapper: {
  '^@adopt-dont-shop/lib-auth$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-auth.tsx',
  // Must explicitly map EVERY library
}
```

### Recommended (Automatic Discovery)
```javascript
// app.client/jest.config.cjs
moduleNameMapper: {
  // Only map to source, Jest finds __mocks__ automatically
  '^@adopt-dont-shop/lib-(.*)$': '<rootDir>/lib.$1/src',
}
```

**When you call:**
```typescript
jest.mock('@adopt-dont-shop/lib-auth');
```

**Jest automatically looks for:**
1. `node_modules/@adopt-dont-shop/lib-auth/__mocks__/index.ts` ✅
2. Falls back to auto-mock if not found

---

## Usage Comparison

### Current Usage
```typescript
// app.client/src/__tests__/some.test.tsx
import { renderWithProviders } from '../test-utils/test-helpers';
import { resetMockData } from '../test-utils/msw-handlers';
import { AuthService } from '@adopt-dont-shop/lib-auth';

// Mock is configured in jest.config.cjs moduleNameMapper
// No explicit jest.mock() needed, but also no control
```

### Recommended Usage
```typescript
// app.client/src/__tests__/some.test.tsx (or app.rescue, or app.admin)
import { renderWithProviders, resetMockData } from '@adopt-dont-shop/lib-dev-tools/test-utils';
import { AuthService } from '@adopt-dont-shop/lib-auth';

jest.mock('@adopt-dont-shop/lib-auth'); // Uses lib.auth/__mocks__/index.ts

// AuthService is now the mock from lib.auth/__mocks__/index.ts
```

**Same code works in ALL three apps!**

---

## Real-World Example: Adding a New Library

### Current Approach
When you create `lib.feature-flags`:

1. ❌ Create `lib.feature-flags/src/FeatureFlagService.ts`
2. ❌ Create `app.client/src/__mocks__/@adopt-dont-shop/lib-feature-flags.ts`
3. ❌ Update `app.client/jest.config.cjs` to add moduleNameMapper entry
4. ❌ Create `app.rescue/src/__mocks__/@adopt-dont-shop/lib-feature-flags.ts`
5. ❌ Update `app.rescue/jest.config.cjs` to add moduleNameMapper entry
6. ❌ Create `app.admin/src/__mocks__/@adopt-dont-shop/lib-feature-flags.ts`
7. ❌ Update `app.admin/jest.config.cjs` to add moduleNameMapper entry

**Total: 7 steps, 3 duplicated mocks, 3 config changes**

### Recommended Approach
When you create `lib.feature-flags`:

1. ✅ Create `lib.feature-flags/src/FeatureFlagService.ts`
2. ✅ Create `lib.feature-flags/__mocks__/index.ts`

**Total: 2 steps, works automatically in ALL apps**

---

## Migration Impact

### Files to Move

**From app.client to libraries:**
- `lib-auth.tsx` → `lib.auth/__mocks__/index.ts`
- `lib-api.ts` → `lib.api/__mocks__/index.ts`
- `lib-pets.ts` → `lib.pets/__mocks__/index.ts`
- `lib-discovery.ts` → `lib.discovery/__mocks__/index.ts`
- `lib-analytics.ts` → `lib.analytics/__mocks__/index.ts`
- `lib-applications.ts` → `lib.applications/__mocks__/index.ts`
- `lib-notifications.ts` → `lib.notifications/__mocks__/index.ts`
- `lib-chat.ts` → `lib.chat/__mocks__/index.ts`
- `lib-search.ts` → `lib.search/__mocks__/index.ts`
- `lib-rescue.ts` → `lib.rescue/__mocks__/index.ts`
- `lib-permissions.ts` → `lib.permissions/__mocks__/index.ts`

**From app.client to lib.dev-tools:**
- `test-helpers.tsx` → `lib.dev-tools/src/test-utils/render-helpers.tsx`
- `mock-providers.tsx` → `lib.dev-tools/src/test-utils/mock-providers.tsx`
- `msw-handlers.ts` → `lib.dev-tools/src/test-utils/msw-handlers.ts`

### Configuration Changes

**app.client/jest.config.cjs:**
```diff
  moduleNameMapper: {
-   '^@adopt-dont-shop/lib-auth$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-auth.tsx',
-   '^@adopt-dont-shop/lib-api$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-api.ts',
-   '^@adopt-dont-shop/lib-analytics$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-analytics.ts',
-   // ... 8 more lines removed
    '^@adopt-dont-shop/lib-(.*)$': '<rootDir>/lib.$1/src',
    '^@adopt-dont-shop/components$': '<rootDir>/lib.components/src',
    '^@/(.*)$': '<rootDir>/app.client/src/$1',
  }
```

**Test file imports:**
```diff
- import { renderWithProviders } from '../test-utils/test-helpers';
- import { resetMockData } from '../test-utils/msw-handlers';
+ import { renderWithProviders, resetMockData } from '@adopt-dont-shop/lib-dev-tools/test-utils';
```

---

## Why This Is Industry Standard

### Examples from Major Projects

**Jest:**
```
jest/
├── packages/
│   ├── jest-runtime/
│   │   ├── src/
│   │   └── __mocks__/           ← Co-located mocks
│   ├── jest-environment-node/
│   │   ├── src/
│   │   └── __mocks__/           ← Co-located mocks
```

**React:**
```
react/
├── packages/
│   ├── react/
│   │   └── src/
│   │       └── __mocks__/       ← Co-located mocks
│   ├── shared/
│   │   └── test/                ← Shared test utilities
```

**This pattern is recommended because:**
1. It's how Jest is designed to work
2. It scales to any number of consumers
3. It maintains single source of truth
4. It's easier to maintain long-term

---

## Decision Summary

| Aspect | Current | Recommended |
|--------|---------|-------------|
| **Mock Location** | App-specific __mocks__/ | Library __mocks__/ |
| **Duplication** | 3x (all apps) | None (shared) |
| **Configuration** | Complex moduleNameMapper | Minimal config |
| **Maintenance** | Update in 3 places | Update in 1 place |
| **New Libraries** | 7 steps | 2 steps |
| **Jest Support** | Manual mapping | Built-in discovery |
| **Industry Alignment** | Non-standard | Standard pattern |
| **Scalability** | Doesn't scale | Scales infinitely |

**Recommendation: Migrate to library co-located mocks + shared test utilities in lib.dev-tools**
