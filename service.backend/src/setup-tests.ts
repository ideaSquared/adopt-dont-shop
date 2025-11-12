/**
 * Test Setup for Backend Service
 *
 * Industry Standard Approach: Real SQLite in-memory database + external service mocks
 * - Models initialize properly with real Sequelize instance
 * - Database behavior is tested accurately
 * - External services (email, auth, file system) are mocked
 */

import { config } from 'dotenv';
import { vi, beforeEach, afterAll, beforeAll } from 'vitest';
import sequelize from './sequelize';
// Import all models to ensure they're loaded before tests run
import './models/index';

// Load test environment variables
config({ path: '.env.test' });

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-characters-long';
process.env.TEST_DB_NAME = 'test_db';
process.env.POSTGRES_USER = 'test';
process.env.POSTGRES_PASSWORD = 'test';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';

// =======================
// External Service Mocks
// =======================

// Mock logger to prevent console noise in tests
vi.mock('./utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    http: vi.fn(),
    end: vi.fn(),
    log: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    http: vi.fn(),
    end: vi.fn(),
    log: vi.fn(),
  },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logAuth: vi.fn(),
    logSecurity: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logLifecycle: vi.fn(),
    logExternalService: vi.fn(),
    logAuditableAction: vi.fn(),
    logRequest: vi.fn(),
  },
  safeLoggerHelpers: {
    logBusiness: vi.fn(),
  },
}));

// Mock bcryptjs for password hashing (slow operation, doesn't need real testing)
vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
  genSalt: vi.fn(),
}));

// Mock jsonwebtoken (JWT operations don't need real testing)
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
  decode: vi.fn(),
}));

// Mock crypto for predictable UUIDs in tests
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => `test-uuid-${Date.now()}`),
  randomBytes: vi.fn(() => Buffer.from('mock-random-bytes')),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mock-hash'),
  })),
}));

// Mock nodemailer (don't send real emails in tests)
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  })),
  createTestAccount: vi.fn().mockResolvedValue({
    user: 'test',
    pass: 'test',
    smtp: { host: 'smtp.test.com', port: 587, secure: false },
  }),
}));

// Mock email service (integration point)
vi.mock('./services/email.service', () => ({
  default: {
    sendEmail: vi.fn().mockResolvedValue(undefined),
    queueEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock file system operations
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn(),
      mkdir: vi.fn(),
    },
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn(),
  },
}));

// =======================
// Database Setup
// =======================

/**
 * Initialize test database - sync all models
 */
async function initializeTestDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Clean all tables between tests
 */
async function cleanDatabase(): Promise<void> {
  try {
    const models = Object.keys(sequelize.models);
    for (const modelName of models) {
      await sequelize.models[modelName].destroy({
        where: {},
        truncate: true,
        cascade: true,
        restartIdentity: true,
      });
    }
  } catch (error) {
    // Silently ignore errors if tables don't exist yet
    // (happens on first test before models are loaded)
  }
}

/**
 * Close database connection
 */
async function closeDatabase(): Promise<void> {
  await sequelize.close();
}

// Initialize test database before all tests
beforeAll(async () => {
  await initializeTestDatabase();
});

// Clean database between each test for isolation
beforeEach(async () => {
  await cleanDatabase();
  vi.clearAllMocks();
});

// Close database after all tests
afterAll(async () => {
  await closeDatabase();
});

// =======================
// Test Helpers
// =======================

export const createMockUser = (overrides: Record<string, unknown> = {}) => ({
  userId: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  userType: 'adopter',
  status: 'active',
  emailVerified: true,
  ...overrides,
});

export const createMockPet = (overrides: Record<string, unknown> = {}) => ({
  petId: 'pet-123',
  name: 'Test Pet',
  type: 'dog',
  status: 'available',
  rescueId: 'rescue-123',
  ...overrides,
});

// Export test database for direct access in tests
export { sequelize as testDb };
