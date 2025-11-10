// Mock env config FIRST before any imports
jest.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
}));

describe('Setup Test', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should import User model without errors', async () => {
    const User = await import('../models/User');
    expect(User.default).toBeDefined();
  });

  it('should import AuthService without errors', async () => {
    const { AuthService } = await import('../services/auth.service');
    expect(AuthService).toBeDefined();
  });

  it('should import UserService without errors', async () => {
    const { UserService } = await import('../services/user.service');
    expect(UserService).toBeDefined();
  });
});
