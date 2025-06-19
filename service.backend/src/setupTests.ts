// Test setup for backend service
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock console methods during tests if needed
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test teardown
afterAll(async () => {
  // Close any open connections, clean up resources
});
