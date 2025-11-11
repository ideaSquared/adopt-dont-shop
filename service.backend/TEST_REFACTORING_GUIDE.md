# Test Refactoring Guide: From Mocks to Real Database

This guide explains how to refactor tests from heavy mocking to real database operations after migrating to SQLite in-memory testing.

## Why Real Database Testing?

**Before (Mock-based):**
- 750+ lines of model mocks in setup-tests.ts
- Model initialization errors
- Tests don't catch SQL bugs
- Brittle tests that break when models change

**After (Real Database):**
- 90% less test code
- Tests actual database behavior
- Industry standard approach
- Catches real bugs

## Current Status

✅ **Infrastructure Complete:**
- SQLite in-memory database configured (`sequelize.ts`)
- Global test setup configured (`setup-tests.ts`)
- Test data factory created (`test-data-factory.ts`)
- External services properly mocked

⚠️ **Tests Need Refactoring:**
- 29 test files need conversion from mocks to real database
- 392 tests to refactor (straightforward, just tedious)

## Refactoring Pattern

### OLD APPROACH ❌ (Mocking everything)

```typescript
import { vi } from 'vitest';
import User from '../../models/User';

vi.mock('../../models/User');

describe('UserService', () => {
  it('should get user by ID', async () => {
    // Mock the database call
    (User.findByPk as vi.Mock).mockResolvedValue({
      userId: '123',
      email: 'test@example.com',
      name: 'Test User',
    });

    const user = await UserService.getUserById('123');

    expect(user.email).toBe('test@example.com');
  });
});
```

**Problems:**
- Not testing real database behavior
- Model mocks conflict with Sequelize initialization
- Doesn't catch SQL bugs

### NEW APPROACH ✅ (Real database)

```typescript
import { createTestUser } from '../helpers/test-data-factory';
import User from '../../models/User';

// No mocking of models!

describe('UserService', () => {
  it('should get user by ID', async () => {
    // Create real data in database
    const createdUser = await createTestUser({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    });

    // Test real database query
    const user = await UserService.getUserById(createdUser.userId);

    expect(user.email).toBe('test@example.com');
    expect(user.firstName).toBe('Test');
  });
});
```

**Benefits:**
- Tests actual SQL queries
- No model mocks needed
- Catches constraint violations, relation issues, etc.
- Database automatically cleaned between tests

## What to Mock vs What to Use Real

### ✅ KEEP MOCKED (External Services)

These are already mocked in `setup-tests.ts`:

- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT operations
- `nodemailer` - Email sending
- `fs` - File system
- `logger` - Logging

**Why?** These are integration points. We don't need to test bcrypt's hashing algorithm or Gmail's SMTP server.

### ✅ USE REAL DATABASE (Models & Queries)

- All Sequelize models
- Database queries
- Relations/associations
- Constraints
- Transactions

**Why?** This is what we're actually testing - our business logic's interaction with the database.

## Test Data Factory Helpers

Use the helpers in `test-data-factory.ts` to create test data:

```typescript
import {
  createTestUser,
  createTestRescue,
  createTestPet,
  createTestApplication,
  createTestChat,
  createTestMessage,
  createTestEmailTemplate,
  createTestEmailQueue,
  createTestNotification,
  createTestAuditLog,
  createTestReport,
  createTestStaffMember,
  createTestEmailPreference,
} from '../helpers/test-data-factory';

// Example: Create a complete test scenario
const user = await createTestUser({ email: 'adopter@example.com' });
const rescue = await createTestRescue({ organizationName: 'Happy Paws' });
const pet = await createTestPet(rescue.rescueId, { name: 'Buddy', type: 'dog' });
const application = await createTestApplication(user.userId, rescue.rescueId, pet.petId);
```

## Common Refactoring Scenarios

### Scenario 1: Testing CRUD Operations

**OLD:**
```typescript
vi.mock('../../models/User');

it('should create user', async () => {
  (User.create as vi.Mock).mockResolvedValue({ userId: '123', ... });
  const user = await UserService.createUser({...});
  expect(User.create).toHaveBeenCalled();
});
```

**NEW:**
```typescript
it('should create user', async () => {
  const userData = {
    email: 'new@example.com',
    firstName: 'New',
    lastName: 'User',
    password: 'password123',
  };

  const user = await UserService.createUser(userData);

  // Verify in database
  const found = await User.findByPk(user.userId);
  expect(found?.email).toBe('new@example.com');
  expect(found?.firstName).toBe('New');
});
```

### Scenario 2: Testing Queries with Relations

**OLD:**
```typescript
(Pet.findAll as vi.Mock).mockResolvedValue([
  { petId: '1', name: 'Buddy', Rescue: { name: 'Happy Paws' } },
]);
```

**NEW:**
```typescript
const rescue = await createTestRescue({ organizationName: 'Happy Paws' });
const pet = await createTestPet(rescue.rescueId, { name: 'Buddy' });

const pets = await PetService.getPetsByRescue(rescue.rescueId);

expect(pets).toHaveLength(1);
expect(pets[0].name).toBe('Buddy');
```

### Scenario 3: Testing Error Cases

**OLD:**
```typescript
(User.findByPk as vi.Mock).mockResolvedValue(null);
await expect(UserService.getUserById('invalid')).rejects.toThrow('User not found');
```

**NEW:**
```typescript
// Don't create any users
await expect(UserService.getUserById('nonexistent-id')).rejects.toThrow('User not found');
```

### Scenario 4: Testing Updates

**OLD:**
```typescript
(User.update as vi.Mock).mockResolvedValue([1]);
await UserService.updateUser('123', { firstName: 'Updated' });
expect(User.update).toHaveBeenCalled();
```

**NEW:**
```typescript
const user = await createTestUser({ firstName: 'Original' });

await UserService.updateUser(user.userId, { firstName: 'Updated' });

const updated = await User.findByPk(user.userId);
expect(updated?.firstName).toBe('Updated');
```

## Step-by-Step Refactoring Process

For each test file:

1. **Remove model mocks:**
   ```typescript
   // DELETE these lines
   vi.mock('../../models/User');
   vi.mock('../../models/Pet');
   ```

2. **Import test data factory:**
   ```typescript
   import { createTestUser, createTestPet } from '../helpers/test-data-factory';
   ```

3. **Replace mock setup with real data:**
   ```typescript
   // OLD
   beforeEach(() => {
     (User.findByPk as vi.Mock).mockResolvedValue({...});
   });

   // NEW
   let testUser;
   beforeEach(async () => {
     testUser = await createTestUser({...});
   });
   ```

4. **Replace mock assertions with database queries:**
   ```typescript
   // OLD
   expect(User.create).toHaveBeenCalledWith({...});

   // NEW
   const user = await User.findOne({ where: { email: 'test@example.com' } });
   expect(user).toBeDefined();
   expect(user?.firstName).toBe('Test');
   ```

5. **Run tests and fix any issues:**
   ```bash
   npm test -- path/to/test/file.test.ts
   ```

## Files That Need Refactoring

### Service Tests (Priority: High)
- `src/__tests__/services/auth.service.test.ts`
- `src/__tests__/services/user.service.test.ts`
- `src/__tests__/services/pet.service.test.ts`
- `src/__tests__/services/application.service.test.ts`
- `src/__tests__/services/chat.service.test.ts`
- `src/__tests__/services/rescue.service.test.ts`
- `src/__tests__/services/notification.service.test.ts`
- `src/__tests__/services/email.service.test.ts`
- `src/__tests__/services/discovery.service.test.ts`
- `src/__tests__/services/admin.service.test.ts`
- `src/__tests__/services/moderation.service.test.ts`
- `src/__tests__/services/swipe.service.test.ts`
- `src/__tests__/services/auditLog.service.test.ts`
- `src/__tests__/services/auth-security.test.ts`
- `src/__tests__/services/pet-business-logic.test.ts`
- `src/__tests__/services/rescue-business-logic.test.ts`

### Controller Tests (Priority: Medium)
- `src/__tests__/controllers/user.controller.test.ts`
- `src/__tests__/controllers/chat.controller.test.ts`

### Integration Tests (Priority: Medium)
- `src/__tests__/integration/auth-flow.test.ts`
- `src/__tests__/integration/application-workflow.test.ts`
- `src/__tests__/integration/chat-messaging-flow.test.ts`
- `src/__tests__/integration/pet-discovery-flow.test.ts`
- `src/__tests__/integration/pet-discovery-matching.test.ts`
- `src/__tests__/integration/admin-moderation-flow.test.ts`

### Middleware Tests (Priority: Low)
- `src/__tests__/middleware/auth.middleware.test.ts`
- `src/__tests__/middleware/rbac.middleware.test.ts`
- `src/__tests__/middleware/csrf.middleware.test.ts`
- `src/__tests__/middleware/rate-limiter.middleware.test.ts`

### Model Tests (Priority: Low)
- `src/__tests__/models/EmailQueue.model.test.ts`

## Tips and Tricks

### 1. Unique Emails/IDs
The factory helpers automatically generate unique emails using timestamps:
```typescript
email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
```

### 2. Testing Transactions
```typescript
it('should rollback on error', async () => {
  const initialCount = await User.count();

  await expect(
    UserService.createUserWithProfile({ invalid: 'data' })
  ).rejects.toThrow();

  const finalCount = await User.count();
  expect(finalCount).toBe(initialCount); // Rolled back
});
```

### 3. Testing Soft Deletes (Paranoid Models)
```typescript
const user = await createTestUser();
await User.destroy({ where: { userId: user.userId } });

// Still in database with deletedAt set
const found = await User.findByPk(user.userId, { paranoid: false });
expect(found?.deletedAt).toBeDefined();
```

### 4. Parallel Test Safety
Each test has isolated database state (cleaned in `beforeEach`). Tests can run in parallel safely.

## Performance

SQLite in-memory is FAST:
- Database creation: ~5ms
- Model sync: ~50ms
- Typical test: 10-50ms

This is actually faster than complex mock setup!

## Troubleshooting

### "Cannot read property 'create' of undefined"
Model hasn't been imported yet. The test database syncs models on first import.

**Fix:** Import the model at the top of your test file:
```typescript
import User from '../../models/User';
```

### "No such table"
Model hasn't been synced to the database yet.

**Fix:** Make sure `setup-tests.ts` is configured as setupFiles in vitest.config.ts (already done).

### "UNIQUE constraint failed"
Creating duplicate data with same email/ID.

**Fix:** Use the factory helpers which generate unique values, or manually ensure uniqueness.

## Next Steps

1. Pick a test file from the list above
2. Follow the refactoring pattern
3. Run the tests and verify they pass
4. Move to the next file
5. Commit regularly

Estimated time: 5-10 minutes per test file × 29 files = 2.5-5 hours total

This is a one-time investment that eliminates maintenance overhead forever!
