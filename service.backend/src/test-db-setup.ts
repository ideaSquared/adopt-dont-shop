/**
 * Test Database Setup - Industry Standard Approach
 *
 * Uses SQLite in-memory database for fast, isolated testing.
 * Models initialize properly, migrations run, real database behavior tested.
 */

import { Sequelize } from 'sequelize';

// Create SQLite in-memory database instance
export const testDb = new Sequelize('sqlite::memory:', {
  logging: false, // Set to console.log to debug SQL queries
  dialect: 'sqlite',
  storage: ':memory:',
});

/**
 * Initialize all models with the test database
 * Models will call Model.init() successfully with this real Sequelize instance
 */
export async function initializeTestDatabase(): Promise<void> {
  try {
    // Test connection
    await testDb.authenticate();

    // Sync all models (creates tables)
    // alter: true allows schema changes without dropping data
    // force: false means don't drop existing tables
    await testDb.sync({ force: true });
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Clean all tables between tests
 * Truncates data but keeps schema intact
 */
export async function cleanDatabase(): Promise<void> {
  try {
    // Get all model names
    const models = Object.keys(testDb.models);

    // Truncate each table
    for (const modelName of models) {
      await testDb.models[modelName].destroy({
        where: {},
        truncate: true,
        cascade: true,
        restartIdentity: true,
      });
    }
  } catch (error) {
    console.error('Failed to clean database:', error);
    throw error;
  }
}

/**
 * Close database connection
 * Call this after all tests complete
 */
export async function closeDatabase(): Promise<void> {
  await testDb.close();
}

/**
 * Create test data helpers
 */
export const testDataHelpers = {
  /**
   * Create a test user with default values
   */
  async createTestUser(overrides: Record<string, unknown> = {}) {
    const User = testDb.models.User;
    return await User.create({
      email: `test-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      firstName: 'Test',
      lastName: 'User',
      userType: 'adopter',
      status: 'active',
      emailVerified: true,
      ...overrides,
    });
  },

  /**
   * Create a test rescue with default values
   */
  async createTestRescue(overrides: Record<string, unknown> = {}) {
    const Rescue = testDb.models.Rescue;
    return await Rescue.create({
      organizationName: `Test Rescue ${Date.now()}`,
      email: `rescue-${Date.now()}@example.com`,
      phone: '555-0100',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'US',
      verificationStatus: 'verified',
      ...overrides,
    });
  },

  /**
   * Create a test pet with default values
   */
  async createTestPet(rescueId: string, overrides: Record<string, unknown> = {}) {
    const Pet = testDb.models.Pet;
    return await Pet.create({
      rescueId,
      name: `Test Pet ${Date.now()}`,
      type: 'dog',
      breed: 'Mixed Breed',
      ageYears: 2,
      gender: 'male',
      size: 'medium',
      status: 'available',
      description: 'A friendly test pet',
      ...overrides,
    });
  },

  /**
   * Create a test application
   */
  async createTestApplication(
    userId: string,
    rescueId: string,
    petId: string,
    overrides: Record<string, unknown> = {}
  ) {
    const Application = testDb.models.Application;
    return await Application.create({
      userId,
      rescueId,
      petId,
      status: 'submitted',
      responses: {},
      ...overrides,
    });
  },
};
