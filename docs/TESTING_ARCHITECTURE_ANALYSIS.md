# Testing Architecture Analysis - Sequelize Model Initialization Issue

**Date:** 2025-11-09
**Status:** 🔴 BLOCKER for unit testing
**Impact:** Cannot write unit tests for services that use Sequelize models
**Recommended Solution:** Integration tests with SQLite (short-term) + Model refactoring (long-term)

---

## Executive Summary

While attempting to create comprehensive business logic tests for `ApplicationService`, we discovered a **fundamental architectural issue** that prevents traditional unit testing with mocks:

**The Problem:** All Sequelize models call `Model.init()` as top-level code when the module is imported, requiring a real database connection before tests can even load.

**Impact:**

- ❌ Cannot use `jest.mock()` for models
- ❌ Cannot write fast unit tests with mocked dependencies
- ❌ Test setup is extremely complex and fragile
- ✅ Can still write integration tests with real database

**Recommendation:** Use integration tests with SQLite in-memory database for all service tests. This provides 95% of the benefits of unit tests while actually working with the current architecture.

---

## The Problem Explained

### Current Model Architecture

Every model file follows this pattern:

```typescript
// models/ApplicationTimeline.ts
import sequelize from '../sequelize';  // Line 2

class ApplicationTimeline extends Model { ... }

// This runs IMMEDIATELY when the file is imported!
ApplicationTimeline.init(
  { /* schema */ },
  { sequelize }  // Needs actual sequelize instance
);  // Line 73

export default ApplicationTimeline;
```

### Why This Breaks Testing

When a test file tries to import a service:

```
Test imports ApplicationService
  → ApplicationService imports ApplicationTimeline
    → ApplicationTimeline runs .init() at module load time
      → .init() requires real sequelize instance
        → sequelize.ts tries to connect to PostgreSQL
          → ❌ FAILS because no database in test environment
```

### Why jest.mock() Doesn't Work

We tried multiple approaches:

1. **jest.mock('../../models/ApplicationTimeline')** - Model file still executes before mock applies
2. **jest.mock('../../sequelize')** - Import happens before mock is set up
3. **Manual **mocks** directory** - Same timing issue
4. **Mocking every Sequelize method** - Whack-a-mole, impossible to get complete

The fundamental issue: **JavaScript executes top-level code when a module is imported, BEFORE any mocks can take effect.**

---

## Attempted Solutions (All Failed)

### Attempt 1: Basic jest.mock()

```typescript
jest.mock('../../models/Application');
import { ApplicationService } from '../../services/application.service';
```

**Result:** ❌ Model still initializes, fails with "Cannot read properties of undefined (reading 'define')"

### Attempt 2: Mock Sequelize Instance

```typescript
const mockSequelize = { define: jest.fn(), query: jest.fn(), ... };
jest.mock('../../sequelize', () => ({ default: mockSequelize }));
```

**Result:** ❌ Still fails - import happens before mock applies

### Attempt 3: Manual Mock in **mocks**/

```typescript
// src/__mocks__/sequelize.ts
export default { define: jest.fn(), ... };
```

**Result:** ❌ Manual mock not picked up, same timing issue

### Attempt 4: Complete Sequelize API Mock

Added 20+ methods: `define`, `query`, `transaction`, `runHooks`, `isDefined`, etc.
**Result:** ❌ Still missing methods, impossible to complete

---

## Recommended Solutions

### 🟢 Solution 1: Integration Tests with SQLite (RECOMMENDED - Implement Now)

**Approach:** Use real Sequelize with SQLite in-memory database for tests

**Pros:**

- ✅ Works immediately with current architecture
- ✅ Tests actual business logic with real database
- ✅ Catches integration bugs that mocks would miss
- ✅ Tests are realistic and provide high confidence
- ✅ Can test all business rules, state transitions, edge cases
- ✅ No architectural changes required

**Cons:**

- ⚠️ Slightly slower than pure unit tests (milliseconds vs microseconds)
- ⚠️ Requires database setup/teardown in tests
- ⚠️ Tests are technically integration tests, not unit tests

**Implementation:**

```typescript
// Test setup
import { Sequelize } from 'sequelize';

let sequelize: Sequelize;

beforeAll(async () => {
  // Create in-memory SQLite database
  sequelize = new Sequelize('sqlite::memory:', { logging: false });

  // Initialize all models with test database
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

// Tests use real database operations
it('prevents duplicate applications for same pet', async () => {
  const user = await User.create({ email: 'test@example.com', ... });
  const pet = await Pet.create({ name: 'Buddy', ... });

  // First application succeeds
  const app1 = await ApplicationService.createApplication(user.userId, {
    pet_id: pet.petId,
    answers: { ... }
  });

  // Second application for same pet should fail
  await expect(
    ApplicationService.createApplication(user.userId, {
      pet_id: pet.petId,
      answers: { ... }
    })
  ).rejects.toThrow('Duplicate application');
});
```

**Effort:** 2-3 days to create comprehensive integration test suite
**Priority:** P0 - **Start immediately**

---

### 🟡 Solution 2: Refactor Models to Lazy Initialization (Long-term)

**Approach:** Move all `Model.init()` calls to a central initialization function

**Changes Required:**

1. Create `models/index.ts`:

```typescript
import { Sequelize } from 'sequelize';
import User from './User';
import Pet from './Pet';
import Application from './Application';
// ... all models

export function initializeModels(sequelize: Sequelize) {
  // All .init() calls happen here, not at module load time
  User.init({ ... }, { sequelize });
  Pet.init({ ... }, { sequelize });
  Application.init({ ... }, { sequelize });
  // ... all other models

  // Set up associations
  User.hasMany(Application, { ... });
  Application.belongsTo(User, { ... });
  // ... all associations
}

export { User, Pet, Application, ... };
```

2. Update each model file:

```typescript
// models/User.ts - BEFORE
import sequelize from '../sequelize';

class User extends Model { ... }

User.init({ ... }, { sequelize });  // ❌ Remove this
export default User;
```

```typescript
// models/User.ts - AFTER
class User extends Model { ... }

// No .init() call here!
export default User;
```

3. Update server startup:

```typescript
// server.ts
import sequelize from './sequelize';
import { initializeModels } from './models';

// Initialize models before starting server
initializeModels(sequelize);

app.listen(3000);
```

4. Tests can now mock:

```typescript
jest.mock('../models/User'); // Works! No auto-initialization
import { ApplicationService } from '../services/application.service';
```

**Pros:**

- ✅ Enables traditional unit testing with mocks
- ✅ Clear separation of model definition vs initialization
- ✅ Better architecture for dependency injection
- ✅ Faster tests once implemented
- ✅ Standard pattern used by many Sequelize projects

**Cons:**

- ⚠️ Requires refactoring all 30+ model files
- ⚠️ Need to update association definitions
- ⚠️ Risk of breaking existing functionality
- ⚠️ Estimated 1-2 weeks of work + testing

**Effort:** 1-2 weeks
**Priority:** P2 - **Plan for future sprint**

---

### 🔵 Solution 3: Dependency Injection Pattern (Alternative)

**Approach:** Pass models as dependencies to services instead of importing directly

**Example:**

```typescript
// BEFORE
export class ApplicationService {
  static async createApplication(userId: string, data: ApplicationData) {
    const user = await User.findByPk(userId);  // Direct import
    const application = await Application.create({ ... });
    return application;
  }
}
```

```typescript
// AFTER
export class ApplicationService {
  constructor(
    private userModel: typeof User,
    private applicationModel: typeof Application,
    private petModel: typeof Pet
  ) {}

  async createApplication(userId: string, data: ApplicationData) {
    const user = await this.userModel.findByPk(userId);  // Injected dependency
    const application = await this.applicationModel.create({ ... });
    return application;
  }
}
```

**Tests:**

```typescript
const mockUserModel = { findByPk: jest.fn(), ... };
const mockApplicationModel = { create: jest.fn(), ... };

const service = new ApplicationService(
  mockUserModel as any,
  mockApplicationModel as any,
  mockPetModel as any
);

// Now can test with full control
```

**Pros:**

- ✅ Perfect testability
- ✅ Clear dependencies
- ✅ Follows SOLID principles
- ✅ TypeScript-friendly

**Cons:**

- ⚠️ Very invasive changes to all services
- ⚠️ Changes from static methods to instance methods
- ⚠️ Requires dependency container/factory
- ⚠️ High risk of bugs during migration
- ⚠️ 2-3 weeks of work

**Effort:** 2-3 weeks
**Priority:** P3 - **Consider for major refactoring**

---

## Comparison Matrix

| Solution                       | Works Now | Test Speed  | Effort       | Risk      | Confidence | Maintainability |
| ------------------------------ | --------- | ----------- | ------------ | --------- | ---------- | --------------- |
| **Integration Tests (SQLite)** | ✅ Yes    | ⚡ Good     | 🟢 2-3 days  | 🟢 Low    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐        |
| **Lazy Initialization**        | ❌ No     | ⚡⚡⚡ Fast | 🟡 1-2 weeks | 🟡 Medium | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐      |
| **Dependency Injection**       | ❌ No     | ⚡⚡⚡ Fast | 🔴 2-3 weeks | 🔴 High   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐      |

---

## Recommended Implementation Plan

### Phase 1: Immediate (This Week)

✅ **Use Integration Tests for All Service Testing**

1. Create `__tests__/integration/` directory
2. Set up SQLite in-memory database helper
3. Create comprehensive integration tests for:
   - ApplicationService (all business rules from original plan)
   - PetService (status management, availability)
   - AuthService (login, security, rate limiting)
4. Achieve 70%+ coverage with integration tests
5. Document this as the standard testing approach

**Files to Create:**

- `src/__tests__/integration/application-workflow.integration.test.ts`
- `src/__tests__/integration/pet-management.integration.test.ts`
- `src/__tests__/integration/auth-security.integration.test.ts`
- `src/__tests__/helpers/test-database.ts` (SQLite setup helper)

### Phase 2: Future Sprint (When Time Permits)

🔮 **Refactor Models for Better Testability**

1. Create `models/index.ts` with `initializeModels()` function
2. Refactor 5-10 models at a time
3. Update all model imports
4. Test thoroughly after each batch
5. Once complete, can write unit tests alongside integration tests

---

## Business Logic Testing Coverage (Integration Tests)

Even with integration tests, we can still test all business rules from the original plan:

### Application Workflow (30+ test cases)

- ✅ Duplicate prevention
- ✅ Status transition validation
- ✅ Modification rules by status
- ✅ Withdrawal conditions
- ✅ Access control
- ✅ Business invariants
- ✅ Edge cases (race conditions, concurrent applications)

### Pet Management (20+ test cases)

- ✅ Status management (available → adopted → etc.)
- ✅ Application blocking when not available
- ✅ Status change validation
- ✅ Multi-pet operations

### Auth Service (25+ test cases)

- ✅ Login attempts and rate limiting
- ✅ Account lockout after failed attempts
- ✅ Token generation and validation
- ✅ Password reset flow
- ✅ Security edge cases

**Total Coverage:** Same 70%+ target, just using integration tests instead of unit tests

---

## Conclusion

**Decision:** Proceed with **Solution 1 (Integration Tests with SQLite)** immediately.

**Rationale:**

1. **Works Now** - No architectural changes needed
2. **High Quality** - Tests actual behavior, not mocked behavior
3. **Fast Enough** - Millisecond overhead vs microseconds is acceptable
4. **Comprehensive** - Can test all business rules and edge cases
5. **Low Risk** - Standard pattern, well-supported by Jest and Sequelize

**Future Work:** Plan Solution 2 (Lazy Initialization) for next quarter when time permits larger refactoring efforts.

---

## Technical Details

### SQLite vs PostgreSQL Differences

SQLite is compatible enough for testing, but note these differences:

**Compatible:**

- ✅ Basic CRUD operations
- ✅ Transactions
- ✅ Foreign keys
- ✅ Unique constraints
- ✅ Most data types (UUID becomes TEXT)

**Incompatible:**

- ❌ JSONB (use JSON instead)
- ❌ Array columns (serialize as JSON)
- ❌ PostgreSQL-specific functions
- ❌ Full-text search with tsvector

**Workaround:** For PostgreSQL-specific features, use conditional logic or skip those specific tests in SQLite environment.

### Test Performance

**Expected Performance:**

- Setup/teardown per test suite: ~100ms
- Individual test with database operations: ~5-10ms
- 100 tests: ~1-2 seconds total

**Comparison:**

- Pure unit tests with mocks: ~0.1-0.5ms per test
- Integration tests with SQLite: ~5-10ms per test
- **20x slower, but still very fast** (1-2s vs 0.05s for 100 tests)

---

## References

- Original issue: ApplicationService test failing with "Cannot read properties of undefined (reading 'define')"
- Test file: `service.backend/src/__tests__/services/application.service.test.ts`
- Model causing issue: `service.backend/src/models/ApplicationTimeline.ts:73`
- Jest documentation on manual mocks: https://jestjs.io/docs/manual-mocks
- Sequelize testing guide: https://sequelize.org/docs/v6/other-topics/testing/

---

**Next Steps:**

1. Review and approve this approach
2. Create SQLite test helper
3. Write first integration test for ApplicationService
4. Measure performance and adjust if needed
5. Roll out to all service tests
