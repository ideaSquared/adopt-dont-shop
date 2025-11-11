# Testing Architecture Migration Plan

## Goal
Move from app-specific mocks to library-colocated mocks + shared test utilities for better maintainability across all 3 apps (client, rescue, admin).

## Current State
- ❌ Mocks in `app.client/src/__mocks__/@adopt-dont-shop/`
- ❌ Test helpers in `app.client/src/test-utils/`
- ❌ Explicit `moduleNameMapper` configuration required
- ❌ Would need duplication in app.rescue and app.admin

## Target State
- ✅ Mocks in each `lib.*/__mocks__/` (Jest automatic discovery)
- ✅ Shared test utilities in `lib.dev-tools/src/test-utils/`
- ✅ Minimal Jest configuration
- ✅ All apps automatically benefit

## Migration Steps

### Phase 1: Move Library Mocks (Co-located Pattern)

For each library that needs mocking:

1. **lib.auth**
   ```bash
   mkdir -p lib.auth/__mocks__
   mv app.client/src/__mocks__/@adopt-dont-shop/lib-auth.tsx lib.auth/__mocks__/index.ts
   ```

2. **lib.api**
   ```bash
   mkdir -p lib.api/__mocks__
   mv app.client/src/__mocks__/@adopt-dont-shop/lib-api.ts lib.api/__mocks__/index.ts
   ```

3. **lib.pets**
   ```bash
   mkdir -p lib.pets/__mocks__
   mv app.client/src/__mocks__/@adopt-dont-shop/lib-pets.ts lib.pets/__mocks__/index.ts
   ```

4. **lib.discovery**
   ```bash
   mkdir -p lib.discovery/__mocks__
   mv app.client/src/__mocks__/@adopt-dont-shop/lib-discovery.ts lib.discovery/__mocks__/index.ts
   ```

5. **lib.analytics**
   ```bash
   mkdir -p lib.analytics/__mocks__
   mv app.client/src/__mocks__/@adopt-dont-shop/lib-analytics.ts lib.analytics/__mocks__/index.ts
   ```

6. **lib.applications**
   ```bash
   mkdir -p lib.applications/__mocks__
   mv app.client/src/__mocks__/@adopt-dont-shop/lib-applications.ts lib.applications/__mocks__/index.ts
   ```

7. **lib.notifications**
   ```bash
   mkdir -p lib.notifications/__mocks__
   mv app.client/src/__mocks__/@adopt-dont-shop/lib-notifications.ts lib.notifications/__mocks__/index.ts
   ```

8. **lib.chat**
   ```bash
   mkdir -p lib.chat/__mocks__
   mv app.client/src/__mocks__/@adopt-dont-shop/lib-chat.ts lib.chat/__mocks__/index.ts
   ```

9. **lib.search**
   ```bash
   mkdir -p lib.search/__mocks__
   mv app.client/src/__mocks__/@adopt-dont-shop/lib-search.ts lib.search/__mocks__/index.ts
   ```

10. **lib.rescue**
    ```bash
    mkdir -p lib.rescue/__mocks__
    mv app.client/src/__mocks__/@adopt-dont-shop/lib-rescue.ts lib.rescue/__mocks__/index.ts
    ```

11. **lib.permissions**
    ```bash
    mkdir -p lib.permissions/__mocks__
    mv app.client/src/__mocks__/@adopt-dont-shop/lib-permissions.ts lib.permissions/__mocks__/index.ts
    ```

**Update each library's package.json:**
```json
{
  "files": [
    "dist",
    "src",
    "__mocks__"
  ]
}
```

### Phase 2: Move Shared Test Utilities to lib.dev-tools

1. **Move test helpers:**
   ```bash
   mv app.client/src/test-utils/test-helpers.tsx lib.dev-tools/src/test-utils/render-helpers.tsx
   mv app.client/src/test-utils/mock-providers.tsx lib.dev-tools/src/test-utils/mock-providers.tsx
   mv app.client/src/test-utils/msw-handlers.ts lib.dev-tools/src/test-utils/msw-handlers.ts
   ```

2. **Update lib.dev-tools exports:**
   ```typescript
   // lib.dev-tools/src/test-utils/index.ts
   export * from './render-helpers';
   export * from './mock-providers';
   export * from './msw-handlers';
   export * from './setup-tests';
   ```

3. **Update lib.dev-tools/src/index.ts:**
   ```typescript
   // Add test-utils to main exports
   export * from './test-utils';
   ```

### Phase 3: Simplify Jest Configuration

**Remove explicit moduleNameMapper for library mocks:**

```javascript
// app.client/jest.config.cjs - BEFORE
moduleNameMapper: {
  '^@adopt-dont-shop/lib-auth$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-auth.tsx',
  '^@adopt-dont-shop/lib-api$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-api.ts',
  // ... many more
}

// app.client/jest.config.cjs - AFTER
moduleNameMapper: {
  // Only keep workspace source mapping
  '^@adopt-dont-shop/lib-(.*)$': '<rootDir>/lib.$1/src',
  '^@adopt-dont-shop/components$': '<rootDir>/lib.components/src',
  '^@/(.*)$': '<rootDir>/app.client/src/$1',
  // ... MSW mappings stay
}
```

**Jest will automatically find `lib.*/__mocks__/` when you call `jest.mock()`!**

### Phase 4: Update Test Imports

**In all test files across all apps:**

```typescript
// BEFORE - app-specific imports
import { renderWithProviders } from '../test-utils/test-helpers';
import { resetMockData } from '../test-utils/msw-handlers';

// AFTER - shared imports from lib.dev-tools
import { renderWithProviders, resetMockData } from '@adopt-dont-shop/lib-dev-tools/test-utils';
```

### Phase 5: Apply to Other Apps

**app.rescue and app.admin** can now use identical setup:

```javascript
// app.rescue/jest.config.cjs
// app.admin/jest.config.cjs
moduleNameMapper: {
  '^@adopt-dont-shop/lib-(.*)$': '<rootDir>/lib.$1/src',
  '^@adopt-dont-shop/components$': '<rootDir>/lib.components/src',
  '^@/(.*)$': '<rootDir>/app.rescue/src/$1', // or app.admin
  // ... MSW mappings
}
```

No mock duplication needed!

## Benefits After Migration

### For Development
- ✅ **Single source of truth**: Mock lives with library code
- ✅ **Easy maintenance**: Update mock when library changes
- ✅ **Type safety**: Mocks can import types from library
- ✅ **No duplication**: All apps use same mocks

### For All Apps
- ✅ **app.client**: Uses library mocks + shared test utils
- ✅ **app.rescue**: Uses library mocks + shared test utils
- ✅ **app.admin**: Uses library mocks + shared test utils
- ✅ **Consistent behavior**: All apps test against same mocks

### For New Libraries
- ✅ **Simple setup**: Just add `__mocks__/index.ts`
- ✅ **Auto-discovery**: Jest finds it automatically
- ✅ **No config changes**: Works across all apps

## Industry Examples

This pattern is used by:
- **Jest itself** - Has `__mocks__` folders throughout
- **React** - Co-located mocks + shared test-utils
- **Babel** - Library mocks in each package
- **Next.js** - test-utils package for shared helpers

## Testing the Migration

```bash
# Test in app.client
cd app.client && npm test

# Test in app.rescue
cd app.rescue && npm test

# Test in app.admin
cd app.admin && npm test
```

All should use the same mocks from libraries!

## Rollback Plan

If issues arise:
1. Git stash or revert the changes
2. Restore app.client/__mocks__ directory
3. Restore explicit moduleNameMapper in jest.config.cjs

## Success Criteria

- [ ] All library mocks moved to `lib.*/__mocks__/`
- [ ] Shared test utilities in `lib.dev-tools/src/test-utils/`
- [ ] app.client tests passing with new structure
- [ ] app.rescue can import and use mocks
- [ ] app.admin can import and use mocks
- [ ] No duplication of mock code
- [ ] Simplified jest.config.cjs in all apps
