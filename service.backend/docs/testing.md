# Testing Guide

## Overview

The Adopt Don't Shop Backend Service implements comprehensive testing strategies including unit tests, integration tests, and end-to-end tests. The testing framework uses Jest with additional tools for database testing and API validation.

## Testing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                         │
├─────────────────────────────────────────────────────────────┤
│  E2E Tests (10%)                                           │
│  ├── API Integration Tests                                 │
│  ├── User Journey Tests                                    │
│  └── Performance Tests                                     │
├─────────────────────────────────────────────────────────────┤
│  Integration Tests (20%)                                   │
│  ├── Database Integration                                  │
│  ├── Service Integration                                   │
│  └── External API Tests                                    │
├─────────────────────────────────────────────────────────────┤
│  Unit Tests (70%)                                          │
│  ├── Service Layer Tests                                   │
│  ├── Controller Tests                                      │
│  ├── Utility Function Tests                               │
│  └── Model Validation Tests                               │
└─────────────────────────────────────────────────────────────┘
```

## Test Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/sequelize.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/setup-tests.ts'],
  testTimeout: 10000,
  maxWorkers: 1 // For database tests
};
```

### Test Database Setup

```typescript
// src/setup-tests.ts
import { sequelize } from './sequelize';
import { User, Pet, Rescue, Application } from './models';

beforeAll(async () => {
  // Connect to test database
  await sequelize.authenticate();
  
  // Sync database schema
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  // Clean up database before each test
  await User.destroy({ where: {}, force: true });
  await Pet.destroy({ where: {}, force: true });
  await Rescue.destroy({ where: {}, force: true });
  await Application.destroy({ where: {}, force: true });
});

afterAll(async () => {
  // Close database connection
  await sequelize.close();
});
```

## Unit Tests

### Service Layer Tests

```typescript
// src/__tests__/services/user.service.test.ts
import { UserService } from '../../services/user.service';
import { User } from '../../models/User';
import { hashPassword } from '../../utils/password';

jest.mock('../../models/User');
jest.mock('../../utils/password');

describe('UserService', () => {
  let userService: UserService;
  const mockUser = User as jest.Mocked<typeof User>;
  const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'ADOPTER' as const
      };

      const hashedPassword = 'hashed_password';
      const createdUser = {
        userId: 'user-uuid',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        userType: userData.userType,
        passwordHash: hashedPassword
      };

      mockHashPassword.mockResolvedValue(hashedPassword);
      mockUser.create.mockResolvedValue(createdUser as any);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(mockHashPassword).toHaveBeenCalledWith(userData.password);
      expect(mockUser.create).toHaveBeenCalledWith({
        email: userData.email,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        userType: userData.userType
      });
      expect(result).toEqual(createdUser);
    });

    it('should throw error for duplicate email', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'ADOPTER' as const
      };

      const duplicateError = new Error('Validation error');
      duplicateError.name = 'SequelizeUniqueConstraintError';
      mockUser.create.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects.toThrow('Email already exists');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 'user-uuid';
      const user = {
        userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockUser.findByPk.mockResolvedValue(user as any);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(mockUser.findByPk).toHaveBeenCalledWith(userId, {
        attributes: { exclude: ['passwordHash'] }
      });
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const userId = 'non-existent-uuid';
      mockUser.findByPk.mockResolvedValue(null);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

### Controller Tests

```typescript
// src/__tests__/controllers/auth.controller.test.ts
import request from 'supertest';
import { app } from '../../app';
import { AuthService } from '../../services/auth.service';
import { EmailService } from '../../services/email.service';

jest.mock('../../services/auth.service');
jest.mock('../../services/email.service');

describe('AuthController', () => {
  const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
  const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'ADOPTER'
      };

      const mockUser = {
        userId: 'user-uuid',
        email: registerData.email,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        userType: registerData.userType
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900
      };

      mockAuthService.prototype.register.mockResolvedValue({
        user: mockUser,
        ...mockTokens
      });

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        expiresIn: mockTokens.expiresIn
      });
    });

    it('should return validation error for invalid email', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'ADOPTER'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockResponse = {
        user: {
          userId: 'user-uuid',
          email: loginData.email,
          firstName: 'John',
          lastName: 'Doe'
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900
      };

      mockAuthService.prototype.login.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        ...mockResponse
      });
    });

    it('should return error for invalid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockAuthService.prototype.login.mockRejectedValue(
        new Error('Invalid credentials')
      );

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });
});
```

## Integration Tests

### Database Integration Tests

```typescript
// src/__tests__/integration/database.test.ts
import { sequelize } from '../../sequelize';
import { User, Pet, Rescue, Application } from '../../models';

describe('Database Integration', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('User Model', () => {
    it('should create and retrieve a user', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'ADOPTER'
      };

      // Act
      const createdUser = await User.create(userData);
      const retrievedUser = await User.findByPk(createdUser.userId);

      // Assert
      expect(retrievedUser).toBeTruthy();
      expect(retrievedUser?.email).toBe(userData.email);
      expect(retrievedUser?.firstName).toBe(userData.firstName);
    });

    it('should enforce unique email constraint', async () => {
      // Arrange
      const userData = {
        email: 'duplicate@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'ADOPTER'
      };

      await User.create(userData);

      // Act & Assert
      await expect(User.create(userData))
        .rejects.toThrow();
    });
  });

  describe('Pet Model Relationships', () => {
    it('should create pet with rescue relationship', async () => {
      // Arrange
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'rescue@example.com',
        address: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        contactPerson: 'Jane Doe'
      });

      const petData = {
        rescueId: rescue.rescueId,
        name: 'Buddy',
        type: 'DOG',
        ageGroup: 'ADULT',
        gender: 'MALE',
        size: 'LARGE',
        energyLevel: 'HIGH',
        vaccinationStatus: 'UP_TO_DATE',
        spayNeuterStatus: 'NEUTERED'
      };

      // Act
      const pet = await Pet.create(petData);
      const petWithRescue = await Pet.findByPk(pet.petId, {
        include: [Rescue]
      });

      // Assert
      expect(petWithRescue).toBeTruthy();
      expect(petWithRescue?.Rescue?.name).toBe('Test Rescue');
    });
  });
});
```

### API Integration Tests

```typescript
// src/__tests__/integration/api.test.ts
import request from 'supertest';
import { app } from '../../app';
import { sequelize } from '../../sequelize';
import { User, Pet, Rescue } from '../../models';
import { generateToken } from '../../utils/jwt';

describe('API Integration Tests', () => {
  let authToken: string;
  let testUser: User;
  let testRescue: Rescue;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      firstName: 'John',
      lastName: 'Doe',
      userType: 'ADOPTER',
      emailVerified: true
    });

    // Create test rescue
    testRescue = await Rescue.create({
      name: 'Test Rescue',
      email: 'rescue@example.com',
      address: '123 Main St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      contactPerson: 'Jane Doe',
      status: 'verified'
    });

    // Generate auth token
    authToken = generateToken({
      userId: testUser.userId,
      email: testUser.email,
      userType: testUser.userType
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Pet Search API', () => {
    beforeEach(async () => {
      // Create test pets
      await Pet.bulkCreate([
        {
          rescueId: testRescue.rescueId,
          name: 'Buddy',
          type: 'DOG',
          breed: 'Golden Retriever',
          ageGroup: 'ADULT',
          gender: 'MALE',
          size: 'LARGE',
          energyLevel: 'HIGH',
          vaccinationStatus: 'UP_TO_DATE',
          spayNeuterStatus: 'NEUTERED',
          status: 'AVAILABLE'
        },
        {
          rescueId: testRescue.rescueId,
          name: 'Luna',
          type: 'CAT',
          breed: 'Siamese',
          ageGroup: 'YOUNG',
          gender: 'FEMALE',
          size: 'MEDIUM',
          energyLevel: 'MEDIUM',
          vaccinationStatus: 'UP_TO_DATE',
          spayNeuterStatus: 'SPAYED',
          status: 'AVAILABLE'
        }
      ]);
    });

    it('should return all available pets', async () => {
      const response = await request(app)
        .get('/api/v1/pets')
        .expect(200);

      expect(response.body.pets).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter pets by type', async () => {
      const response = await request(app)
        .get('/api/v1/pets?type=DOG')
        .expect(200);

      expect(response.body.pets).toHaveLength(1);
      expect(response.body.pets[0].name).toBe('Buddy');
    });

    it('should search pets by name', async () => {
      const response = await request(app)
        .get('/api/v1/pets?search=Luna')
        .expect(200);

      expect(response.body.pets).toHaveLength(1);
      expect(response.body.pets[0].name).toBe('Luna');
    });
  });

  describe('Application Workflow', () => {
    let testPet: Pet;

    beforeEach(async () => {
      testPet = await Pet.create({
        rescueId: testRescue.rescueId,
        name: 'Test Pet',
        type: 'DOG',
        ageGroup: 'ADULT',
        gender: 'MALE',
        size: 'MEDIUM',
        energyLevel: 'MEDIUM',
        vaccinationStatus: 'UP_TO_DATE',
        spayNeuterStatus: 'NEUTERED',
        status: 'AVAILABLE'
      });
    });

    it('should complete full application workflow', async () => {
      // Submit application
      const applicationData = {
        petId: testPet.petId,
        answers: {
          housing_type: 'House',
          has_yard: true,
          previous_pets: 'Yes'
        }
      };

      const submitResponse = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(applicationData)
        .expect(201);

      const applicationId = submitResponse.body.applicationId;

      // Get application
      const getResponse = await request(app)
        .get(`/api/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.status).toBe('SUBMITTED');
      expect(getResponse.body.answers).toEqual(applicationData.answers);

      // List user's applications
      const listResponse = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.applications).toHaveLength(1);
      expect(listResponse.body.applications[0].applicationId).toBe(applicationId);
    });
  });
});
```

## End-to-End Tests

### User Journey Tests

```typescript
// src/__tests__/e2e/adoption-journey.test.ts
import request from 'supertest';
import { app } from '../../app';
import { sequelize } from '../../sequelize';

describe('Adoption Journey E2E', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should complete full adoption journey', async () => {
    // 1. User Registration
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'adopter@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        userType: 'ADOPTER'
      })
      .expect(201);

    const { accessToken } = registerResponse.body;

    // 2. Browse Pets
    const petsResponse = await request(app)
      .get('/api/v1/pets')
      .expect(200);

    expect(petsResponse.body.pets).toBeDefined();

    // 3. View Pet Details
    if (petsResponse.body.pets.length > 0) {
      const petId = petsResponse.body.pets[0].petId;
      
      const petResponse = await request(app)
        .get(`/api/v1/pets/${petId}`)
        .expect(200);

      expect(petResponse.body.name).toBeDefined();

      // 4. Add to Favorites
      await request(app)
        .post(`/api/v1/pets/${petId}/favorite`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      // 5. Submit Application
      const applicationResponse = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          petId,
          answers: {
            housing_type: 'House',
            has_yard: true,
            experience_level: 'Beginner'
          }
        })
        .expect(201);

      // 6. Check Application Status
      const applicationId = applicationResponse.body.applicationId;
      
      await request(app)
        .get(`/api/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    }
  });
});
```

## Performance Tests

### Load Testing

```typescript
// src/__tests__/performance/load.test.ts
import request from 'supertest';
import { app } from '../../app';

describe('Performance Tests', () => {
  const CONCURRENT_REQUESTS = 50;
  const TIMEOUT = 30000;

  it('should handle concurrent pet searches', async () => {
    const startTime = Date.now();
    
    const requests = Array(CONCURRENT_REQUESTS)
      .fill(null)
      .map(() => 
        request(app)
          .get('/api/v1/pets?limit=20')
          .expect(200)
      );

    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(responses).toHaveLength(CONCURRENT_REQUESTS);
    expect(duration).toBeLessThan(TIMEOUT);
    
    console.log(`Handled ${CONCURRENT_REQUESTS} requests in ${duration}ms`);
  }, TIMEOUT);

  it('should respond to health checks quickly', async () => {
    const startTime = Date.now();
    
    await request(app)
      .get('/health')
      .expect(200);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100); // Should respond in under 100ms
  });
});
```

## Test Data Management

### Test Factories

```typescript
// src/__tests__/factories/user.factory.ts
import { User } from '../../models/User';
import { faker } from '@faker-js/faker';

export class UserFactory {
  static async create(overrides: Partial<any> = {}) {
    const userData = {
      email: faker.internet.email(),
      passwordHash: 'hashed_password',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      userType: 'ADOPTER',
      emailVerified: true,
      ...overrides
    };

    return await User.create(userData);
  }

  static async createMany(count: number, overrides: Partial<any> = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(overrides));
    }
    return users;
  }
}

// Usage in tests
const testUser = await UserFactory.create({
  email: 'specific@example.com',
  userType: 'RESCUE_STAFF'
});
```

### Test Fixtures

```typescript
// src/__tests__/fixtures/pets.ts
export const petFixtures = {
  goldenRetriever: {
    name: 'Buddy',
    type: 'DOG',
    breed: 'Golden Retriever',
    ageGroup: 'ADULT',
    gender: 'MALE',
    size: 'LARGE',
    energyLevel: 'HIGH',
    vaccinationStatus: 'UP_TO_DATE',
    spayNeuterStatus: 'NEUTERED',
    status: 'AVAILABLE'
  },
  
  siameseCat: {
    name: 'Luna',
    type: 'CAT',
    breed: 'Siamese',
    ageGroup: 'YOUNG',
    gender: 'FEMALE',
    size: 'MEDIUM',
    energyLevel: 'MEDIUM',
    vaccinationStatus: 'UP_TO_DATE',
    spayNeuterStatus: 'SPAYED',
    status: 'AVAILABLE'
  }
};
```

## Running Tests

### Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=__tests__/services",
    "test:integration": "jest --testPathPattern=__tests__/integration",
    "test:e2e": "jest --testPathPattern=__tests__/e2e",
    "test:performance": "jest --testPathPattern=__tests__/performance"
  }
}
```

### Running Different Test Types

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- user.service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create user"
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: adopt_dont_shop_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run unit tests
      run: npm run test:unit
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: adopt_dont_shop_test
        DB_USER: postgres
        DB_PASS: postgres
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: adopt_dont_shop_test
        DB_USER: postgres
        DB_PASS: postgres
    
    - name: Generate coverage report
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

## Test Best Practices

### Writing Good Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: Test names should describe what they test
3. **Test One Thing**: Each test should verify one specific behavior
4. **Use Proper Mocking**: Mock external dependencies appropriately
5. **Clean Up**: Ensure tests don't affect each other

### Test Organization

```
src/
├── __tests__/
│   ├── unit/
│   │   ├── services/
│   │   ├── controllers/
│   │   └── utils/
│   ├── integration/
│   │   ├── database/
│   │   └── api/
│   ├── e2e/
│   │   └── user-journeys/
│   ├── performance/
│   └── fixtures/
├── __mocks__/
└── setup-tests.ts
```

---

This comprehensive testing guide ensures the Adopt Don't Shop Backend Service maintains high quality and reliability through thorough testing practices. 