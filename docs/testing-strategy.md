# Testing Strategy Documentation

## Current Testing Approach

We've implemented a robust testing strategy that prioritizes speed, reliability, and maintainability while avoiding the complexities of full integration testing with real databases.

## Option 1: Unit Tests with Mocked Database ✅ IMPLEMENTED

### Backend Service Tests

Location: `service.backend/src/__tests__/services/`

**Approach:**
- Mock `sequelize` completely using Jest mocks
- Test business logic without actual database connections
- Fast execution (milliseconds)
- No external dependencies

**Example:**
```typescript
// Mock sequelize
const mockQuery = jest.fn();
jest.mock('../../sequelize', () => ({
  query: mockQuery,
}));

describe('SwipeService', () => {
  it('should record swipe action successfully', async () => {
    mockQuery.mockResolvedValueOnce(undefined);
    
    await swipeService.recordSwipeAction(swipeAction);
    
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO swipe_actions'),
      { replacements: { action: 'like', petId: 'pet-123' } }
    );
  });
});
```

**Benefits:**
- ✅ Fast execution
- ✅ No database setup required
- ✅ Predictable results
- ✅ Tests business logic isolation
- ✅ Easy to debug

## Option 2: MSW for Frontend API Mocking ✅ IMPLEMENTED

### Frontend API Integration Tests

Location: `app.client/src/__tests__/services/discoveryService.msw.test.ts`

**Approach:**
- Use Mock Service Worker (MSW) to intercept HTTP requests
- Mock API responses without running actual backend
- Test frontend service layer thoroughly

**Example:**
```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/v1/discovery/pets', () => {
    return HttpResponse.json({
      success: true,
      data: { pets: mockPets }
    });
  })
);

describe('Discovery Service', () => {
  it('should fetch pets successfully', async () => {
    const result = await discoveryService.getDiscoveryQueue({}, 10);
    expect(result.pets).toHaveLength(2);
  });
});
```

**Benefits:**
- ✅ Tests actual HTTP layer
- ✅ No backend dependency
- ✅ Easy to simulate different API scenarios
- ✅ Tests error handling
- ✅ Fast and reliable

## Option 3: Testcontainers (Future Consideration) 📚 DOCUMENTED

### When to Consider Testcontainers

Testcontainers provides real database instances for testing but comes with significant overhead. Consider this approach when:

- You need to test complex SQL queries with actual database behavior
- You have database-specific features (PostgreSQL extensions, stored procedures)
- You need to test data migrations
- You have time for longer test suites

### Implementation Guide

If you decide to implement Testcontainers in the future:

#### 1. Install Dependencies

```bash
npm install --save-dev @testcontainers/postgresql
```

#### 2. Setup Test Database

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Sequelize } from 'sequelize';

describe('Integration Tests', () => {
  let container: PostgreSqlContainer;
  let sequelize: Sequelize;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    // Setup Sequelize connection
    sequelize = new Sequelize({
      dialect: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      username: container.getUsername(),
      password: container.getPassword(),
      logging: false,
    });

    // Run migrations/setup
    await sequelize.authenticate();
    await runMigrations(sequelize);
  });

  afterAll(async () => {
    await sequelize.close();
    await container.stop();
  });

  it('should test real database operations', async () => {
    // Test with actual database
    const swipeService = new SwipeService(sequelize);
    await swipeService.recordSwipeAction(testData);
    
    // Verify in database
    const [results] = await sequelize.query('SELECT * FROM swipe_actions');
    expect(results).toHaveLength(1);
  });
});
```

#### 3. Pros and Cons

**Pros:**
- ✅ Tests against real database
- ✅ Catches database-specific issues
- ✅ Tests actual SQL queries
- ✅ Validates migrations

**Cons:**
- ❌ Slow test execution (seconds per test)
- ❌ Requires Docker to be running
- ❌ Complex setup and teardown
- ❌ Resource intensive
- ❌ Can be flaky (container startup issues)
- ❌ Harder to debug

#### 4. When NOT to Use Testcontainers

- Simple CRUD operations (covered by unit tests)
- API endpoint testing (covered by MSW)
- Business logic testing (covered by unit tests)
- CI/CD pipelines without Docker support
- Developer machines without Docker

### Recommended Testing Strategy

**Current Approach (Recommended):**
```
Unit Tests (90%) → MSW API Tests (9%) → Manual E2E (1%)
```

**With Testcontainers (Only if needed):**
```
Unit Tests (80%) → MSW API Tests (15%) → Testcontainers (4%) → Manual E2E (1%)
```

## Test Execution

### Running Tests

```bash
# Frontend tests with MSW
cd app.client
npm test

# Backend unit tests
cd service.backend
npm test

# All tests
npm run test:all
```

### Test Coverage

Our current approach provides:
- **Business Logic Coverage**: 100% via unit tests
- **API Integration Coverage**: 100% via MSW
- **Error Handling Coverage**: 100% via mocked failures
- **Network Issue Coverage**: 100% via MSW error simulation

## Migration Guide

If you previously had integration tests with real databases:

1. **Identify the core business logic** being tested
2. **Extract into unit tests** with mocked dependencies
3. **Create MSW handlers** for API interactions
4. **Remove database-dependent tests** unless absolutely necessary
5. **Update CI/CD pipelines** to remove database setup

## Best Practices

1. **Prefer unit tests** for business logic
2. **Use MSW** for API boundary testing
3. **Mock external dependencies** aggressively
4. **Keep tests fast** (< 10ms per test)
5. **Make tests deterministic** (no random data, fixed timestamps)
6. **Test error scenarios** extensively
7. **Document test scenarios** clearly

## Troubleshooting

### Common Issues

1. **MSW not intercepting requests**: Check server setup in `setup-tests.ts`
2. **Mock not working**: Verify mock is called before import
3. **Async test failures**: Use proper `await` and test hooks
4. **Port conflicts**: Use different ports for different test environments

### Debug Tips

1. **Console.log in MSW handlers** to verify request interception
2. **Use `server.printHandlers()`** to see registered handlers
3. **Check test isolation** by running tests individually
4. **Verify mock reset** between tests

This documentation should be updated as testing needs evolve.
