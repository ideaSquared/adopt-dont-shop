# Testing Guide

## Overview

Comprehensive testing strategy for the backend service using **Vitest**. We follow a behaviour-driven pyramid: most tests exercise service-layer behaviour through public APIs, with a smaller ring of integration tests that hit the database and routes end-to-end.

```
Testing Pyramid
├── Integration Tests — Database + HTTP routes (src/__tests__/integration/, src/__tests__/controllers/)
└── Service / behaviour tests — Services, utilities, middleware, models (src/__tests__/services/, etc.)
```

Tests live under `service.backend/src/__tests__/` organised by layer (`services/`, `controllers/`, `integration/`, `middleware/`, `models/`, `security/`, `utils/`, `validation/`).

## Quick Start

### Running Tests

From `service.backend/` (or via `npx turbo test --filter=@adopt-dont-shop/service-backend` at the repo root):

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Vitest UI
npm run test:ui

# Coverage report
npm run test:coverage

# Specific test file — Vitest takes a substring filter
npm test user.service.test.ts
```

There are no separate `test:integration` / `test:e2e` scripts; integration and route tests run in the same Vitest invocation. Target them via substring or file path.

### Coverage Targets

Follow the [project CLAUDE.md](../../.claude/CLAUDE.md) guidance: aim for 100% behavioural coverage, not per-line targets — add tests for the behaviours you care about, not to hit a number.

## Configuration

Vitest is configured in `service.backend/vitest.config.ts`. The service does not use Jest; any legacy `jest.config.js` should be treated as stale.

### Test Database

```typescript
// Test database automatically created per test suite
beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  // Clean database before each test
  await clearDatabase();
});

afterAll(async () => {
  await sequelize.close();
});
```

## Unit Tests

### Service Layer

**Example: User Service**

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const user = await UserService.createUser(userData);

      expect(user.email).toBe(userData.email);
      expect(user.passwordHash).not.toBe(userData.password);
      expect(user.emailVerified).toBe(false);
    });

    it('should throw error for duplicate email', async () => {
      await UserService.createUser({ email: 'test@example.com', ... });

      await expect(
        UserService.createUser({ email: 'test@example.com', ... })
      ).rejects.toThrow('Email already exists');
    });
  });
});
```

### Controller Layer

**Example: Pet Controller**

```typescript
describe('PetController', () => {
  describe('POST /api/v1/pets', () => {
    it('should create pet with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/pets')
        .set('Authorization', `Bearer ${rescueStaffToken}`)
        .send(validPetData);

      expect(response.status).toBe(201);
      expect(response.body.pet).toHaveProperty('petId');
    });

    it('should reject unauthorized users', async () => {
      const response = await request(app).post('/api/v1/pets').send(validPetData);

      expect(response.status).toBe(401);
    });
  });
});
```

### Utility Functions

```typescript
describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });
});
```

## Integration Tests

### Database Integration

```typescript
describe('User Database Integration', () => {
  it('should handle user creation with relationships', async () => {
    const user = await User.create({ email: 'test@example.com', ... });
    const rescue = await Rescue.create({ rescueName: 'Test Rescue', ... });

    await StaffMember.create({
      userId: user.userId,
      rescueId: rescue.rescueId,
      role: 'STAFF'
    });

    const staffMember = await StaffMember.findOne({
      where: { userId: user.userId },
      include: [User, Rescue]
    });

    expect(staffMember.user.email).toBe('test@example.com');
    expect(staffMember.rescue.rescueName).toBe('Test Rescue');
  });
});
```

### API Integration

```typescript
describe('Application Workflow Integration', () => {
  it('should complete full application workflow', async () => {
    // Create user, rescue, and pet
    const { user, rescue, pet } = await setupTestData();

    // Submit application
    const app = await request(server)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ petId: pet.petId })
      .expect(201);

    // Progress through stages
    await request(server)
      .patch(`/api/v1/applications/${app.body.applicationId}/stage`)
      .set('Authorization', `Bearer ${rescueToken}`)
      .send({ stage: 'REVIEWING' })
      .expect(200);

    // Verify stage transition
    const updated = await Application.findByPk(app.body.applicationId);
    expect(updated.stage).toBe('REVIEWING');
    expect(updated.reviewStartedAt).toBeTruthy();
  });
});
```

## E2E Tests

### User Journey

```typescript
describe('Adopter User Journey', () => {
  it('should complete full adoption process', async () => {
    // 1. Register
    const registerRes = await request(server)
      .post('/api/v1/auth/register')
      .send({ email: 'adopter@example.com', ... })
      .expect(201);

    // 2. Login
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'adopter@example.com', password: 'password' })
      .expect(200);

    const token = loginRes.body.accessToken;

    // 3. Search pets
    const petsRes = await request(server)
      .get('/api/v1/pets?type=DOG')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // 4. Submit application
    const appRes = await request(server)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ petId: petsRes.body.pets[0].petId, answers: {} })
      .expect(201);

    // 5. Check application status
    const statusRes = await request(server)
      .get(`/api/v1/applications/${appRes.body.applicationId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(statusRes.body.stage).toBe('PENDING');
  });
});
```

## Test Utilities

### Test Data Factory

```typescript
// test-helpers/factories.ts
export const createTestUser = async (overrides = {}) => {
  return await User.create({
    email: `test-${Date.now()}@example.com`,
    passwordHash: await hashPassword('password123'),
    firstName: 'Test',
    lastName: 'User',
    userType: 'ADOPTER',
    emailVerified: true,
    ...overrides,
  });
};

export const createTestPet = async (rescueId: string, overrides = {}) => {
  return await Pet.create({
    rescueId,
    name: 'Test Pet',
    type: 'DOG',
    breed: 'Mixed',
    age: 24,
    status: 'AVAILABLE',
    ...overrides,
  });
};
```

### Mock Services

```typescript
// test-helpers/mocks.ts
import { vi } from 'vitest';

export const mockEmailService = {
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendTemplate: vi.fn().mockResolvedValue({ success: true }),
};

export const mockStorageService = {
  uploadFile: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/file.jpg' }),
  deleteFile: vi.fn().mockResolvedValue({ success: true }),
};
```

## Best Practices

### Test Organization

- One test file per service/controller
- Group related tests with `describe` blocks
- Use clear, descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

### Test Independence

- Each test should be independent
- Use `beforeEach` to set up clean state
- Don't rely on test execution order
- Clean up resources in `afterEach`

### Test Coverage

- Test happy paths and edge cases
- Test error conditions and validation
- Test boundary conditions
- Mock external dependencies

### Performance

- Keep tests fast (< 100ms per unit test)
- Use database transactions when possible
- Mock external services
- Run tests in parallel where safe

## Debugging Tests

### Running Specific Tests

```bash
# Single test file (substring match)
npm test user.service.test.ts

# Single test case
npm test -- -t "should create user"

# With Node debugger (Vitest)
node --inspect-brk node_modules/.bin/vitest run --no-threads
```

### Common Issues

**Database Connection Issues**

Vitest uses the database configured via `DB_*` / `TEST_DB_NAME` env vars (see `.env.example`). If you're working in Docker, ensure the database container is healthy:

```bash
docker compose ps database      # must be "healthy"
npm run docker:reset            # last resort — wipes the volume
npm run docker:dev:detach
npm run db:reset
```

**Timeout Errors**

```typescript
// Increase timeout for specific test
it('slow operation', async () => {
  // test code
}, 30000); // 30 second timeout
```

**Flaky Tests**

- Ensure proper cleanup in `afterEach`
- Check for race conditions
- Avoid timing-dependent assertions
- Use proper async/await

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Tests
  run: |
    npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Pre-commit Hook

```bash
# Run tests before commit
npm test

# Run only changed files
npm test --findRelatedTests $(git diff --cached --name-only)
```

## Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# View report
open coverage/index.html

# Check coverage threshold
npm run test:coverage -- --coverageThreshold='{"global":{"lines":80}}'
```

## Additional Resources

- **API Documentation**: [api-endpoints.md](./api-endpoints.md)
- **Implementation Guide**: [implementation-guide.md](./implementation-guide.md)
- **Database Schema**: [database-schema.md](./database-schema.md)
- **Service PRD**: [service-backend-prd.md](./service-backend-prd.md)
