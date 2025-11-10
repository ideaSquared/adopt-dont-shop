# Testing Guide

## Overview

Comprehensive testing strategy for the backend service using Jest. Follows the testing pyramid: 70% unit tests, 20% integration tests, 10% E2E tests.

## Test Structure

```
Testing Pyramid
├── E2E Tests (10%) - Full API integration and user journeys
├── Integration Tests (20%) - Database, services, external APIs
└── Unit Tests (70%) - Services, controllers, utilities, models
```

## Quick Start

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test user.service.test.ts

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

### Coverage Requirements
- Overall: 80%+ coverage
- Services: 90%+ coverage
- Controllers: 85%+ coverage
- Critical paths: 100% coverage

## Configuration

### Jest Setup

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000,
  maxWorkers: 1
};
```

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
      const response = await request(app)
        .post('/api/v1/pets')
        .send(validPetData);

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
    ...overrides
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
    ...overrides
  });
};
```

### Mock Services

```typescript
// test-helpers/mocks.ts
export const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendTemplate: jest.fn().mockResolvedValue({ success: true })
};

export const mockStorageService = {
  uploadFile: jest.fn().mockResolvedValue({ url: 'https://cdn.example.com/file.jpg' }),
  deleteFile: jest.fn().mockResolvedValue({ success: true })
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
# Single test file
npm test user.service.test.ts

# Single test case
npm test -t "should create user"

# With debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Common Issues

**Database Connection Issues**
```bash
# Check test database exists
npm run db:create:test

# Reset test database
npm run db:reset:test
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
