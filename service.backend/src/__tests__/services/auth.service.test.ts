import { vi } from 'vitest';
// Mock env config FIRST before any imports
vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuditLog } from '../../models/AuditLog';
import User, { UserStatus, UserType } from '../../models/User';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials, RegisterData } from '../../types';

// Mock dependencies (but NOT models - they use real database)
// Logger is already mocked in setup-tests.ts
vi.mock('jsonwebtoken');
vi.mock('bcryptjs');
vi.mock('crypto');

// Mock JWT and bcrypt functions
const mockedJwt = jwt as vi.Mocked<typeof jwt>;
const mockedBcrypt = bcrypt as vi.Mocked<typeof bcrypt>;

// Mock environment variables
const originalEnv = process.env;

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables for tests
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
    };

    // Mock bcrypt hash globally for all tests
    mockedBcrypt.hash = vi.fn().mockImplementation((password: string) =>
      Promise.resolve(`hashed_${password}` as never)
    );
    mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

    // Mock crypto for verification tokens
    const mockCrypto = crypto as vi.Mocked<typeof crypto>;
    (mockCrypto.randomBytes as unknown as vi.Mock) = vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('mock-token'),
    });

    // Mock the generateTokens method to avoid JWT secret issues
    vi.spyOn(AuthService as any, 'generateTokens').mockResolvedValue({
      token: 'mocked-access-token',
      refreshToken: 'mocked-refresh-token',
      expiresIn: 900000, // 15 minutes in ms
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('register', () => {
    const userData: RegisterData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
      userType: UserType.ADOPTER,
    };

    it('should register user successfully', async () => {
      mockedJwt.sign = vi.fn().mockReturnValue('access-token' as any);

      const result = await AuthService.register(userData);

      // Verify the result
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email.toLowerCase());
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.lastName).toBe(userData.lastName);
      expect(result.user.userType).toBe(userData.userType);
      expect(result.token).toBe('mocked-access-token');

      // Verify user was created in database
      const createdUser = await User.findOne({
        where: { email: userData.email.toLowerCase() },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser?.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(createdUser?.emailVerified).toBe(false);
      expect(createdUser?.verificationToken).toBeDefined();
      expect(createdUser?.verificationTokenExpiresAt).toBeDefined();

      // Verify audit log was created
      const auditLog = await AuditLog.findOne({
        where: { action: 'USER_REGISTERED' },
      });
      expect(auditLog).toBeDefined();
    });

    it('should throw error if user already exists', async () => {
      // Use unique email for this test
      const uniqueEmail = `existing-${Date.now()}@example.com`;
      const testData = { ...userData, email: uniqueEmail };

      // First register a user
      await AuthService.register(testData);

      // Try to register again with the same email
      await expect(AuthService.register(testData)).rejects.toThrow(
        'User already exists with this email'
      );
    });

    it('should throw error for invalid password', async () => {
      const invalidUserData = { ...userData, password: 'weak' };

      await expect(AuthService.register(invalidUserData)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });
  });

  describe('login', () => {
    const credentials: LoginCredentials = {
      email: 'login-test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      // Create user in database (password will be hashed by User model's beforeCreate hook)
      const user = await User.create({
        email: credentials.email.toLowerCase(),
        password: credentials.password,
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 0,
        twoFactorEnabled: false,
        rescueId: null,
      });

      mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);
      mockedJwt.sign = vi.fn().mockReturnValue('access-token' as any);

      const result = await AuthService.login(credentials);

      expect(mockedBcrypt.compare).toHaveBeenCalled();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(credentials.email.toLowerCase());
      expect(result.token).toBe('mocked-access-token');

      // Verify lastLoginAt was updated
      const updatedUser = await User.findOne({
        where: { email: credentials.email.toLowerCase() },
      });
      expect(updatedUser?.lastLoginAt).toBeDefined();

      // Verify audit log was created
      const auditLog = await AuditLog.findOne({
        where: { action: 'USER_LOGIN' },
      });
      expect(auditLog).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      // No user in database
      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for wrong password', async () => {
      // Create user with different email to avoid conflicts
      const wrongPasswordCreds = {
        email: 'wrong-password@example.com',
        password: 'WrongPassword123!',
      };

      await User.create({
        email: wrongPasswordCreds.email.toLowerCase(),
        password: 'someotherpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 0,
        rescueId: null,
      });

      mockedBcrypt.compare = vi.fn().mockResolvedValue(false as never);

      await expect(AuthService.login(wrongPasswordCreds)).rejects.toThrow('Invalid credentials');
    });

    it('should handle account locking after failed attempts', async () => {
      // Create user with unique email and 4 failed attempts (one more will lock the account)
      const lockTestCreds = {
        email: 'lock-test@example.com',
        password: 'LockTest123!',
      };

      await User.create({
        email: lockTestCreds.email.toLowerCase(),
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 4,
        lockedUntil: null,
        rescueId: null,
      });

      mockedBcrypt.compare = vi.fn().mockResolvedValue(false as never);

      await expect(AuthService.login(lockTestCreds)).rejects.toThrow('Invalid credentials');

      // Verify account is now locked
      const lockedUser = await User.findOne({
        where: { email: lockTestCreds.email.toLowerCase() },
      });
      expect(lockedUser?.loginAttempts).toBe(5);
      expect(lockedUser?.lockedUntil).toBeInstanceOf(Date);

      // Verify audit log for account lock
      const auditLog = await AuditLog.findOne({
        where: { action: 'ACCOUNT_LOCKED' },
      });
      expect(auditLog).toBeDefined();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';

      // Create user in database
      const user = await User.create({
        email: 'refresh-test@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        rescueId: null,
      });

      const mockPayload = {
        userId: user.userId,
        tokenId: 'token-123',
      };

      mockedJwt.verify = vi.fn().mockReturnValue(mockPayload);

      const result = await AuthService.refreshToken(refreshToken);

      expect(mockedJwt.verify).toHaveBeenCalledWith(
        refreshToken,
        'test-refresh-secret-min-32-characters-long-12345'
      );
      expect(result.user).toBeDefined();
      expect(result.user.userId).toBe(user.userId);
      expect(result.token).toBe('mocked-access-token');
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      mockedJwt.verify = vi.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.refreshToken(invalidToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('requestPasswordReset', () => {
    it('should create password reset request', async () => {
      const email = 'reset-test@example.com';

      // Create user in database
      await User.create({
        email: email.toLowerCase(),
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        rescueId: null,
      });

      const authService = new AuthService();
      await authService.requestPasswordReset({ email });

      // Verify password reset token was set
      const user = await User.findOne({
        where: { email: email.toLowerCase() },
      });
      expect(user?.resetToken).toBeDefined();
      expect(user?.resetTokenExpiration).toBeDefined();
      expect(user?.resetTokenExpiration).toBeInstanceOf(Date);
    });

    it('should not throw error for non-existent email', async () => {
      const email = 'nonexistent@example.com';

      const authService = new AuthService();
      await expect(authService.requestPasswordReset({ email })).resolves.not.toThrow();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'valid-verification-token';

      // Create user with verification token in database
      await User.create({
        email: 'verify-test@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        verificationToken: token,
        verificationTokenExpiresAt: new Date(Date.now() + 3600000),
        rescueId: null,
      });

      const authService = new AuthService();
      await authService.verifyEmail(token);

      // Verify email was verified in database
      const verifiedUser = await User.findOne({
        where: { email: 'verify-test@example.com' },
      });
      expect(verifiedUser?.emailVerified).toBe(true);
      expect(verifiedUser?.verificationToken).toBe(null);
      expect(verifiedUser?.status).toBe(UserStatus.ACTIVE);

      // Verify audit log was created
      const auditLog = await AuditLog.findOne({
        where: { action: 'EMAIL_VERIFIED' },
      });
      expect(auditLog).toBeDefined();
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';

      const authService = new AuthService();
      await expect(authService.verifyEmail(token)).rejects.toThrow(
        'Invalid or expired verification token'
      );
    });
  });

  describe('logout', () => {
    it('should handle logout without refresh token', async () => {
      await expect(AuthService.logout()).resolves.not.toThrow();
    });

    it('should handle logout with refresh token', async () => {
      const refreshToken = 'some.refresh.token';
      await expect(AuthService.logout(refreshToken)).resolves.not.toThrow();
    });

    it('should log the logout event when refresh token provided', async () => {
      const refreshToken = 'some.refresh.token.that.is.long.enough';
      const { logger } = await import('../../utils/logger');
      const loggerSpy = vi.spyOn(logger, 'info');

      await AuthService.logout(refreshToken);

      expect(loggerSpy).toHaveBeenCalledWith('User logout requested', {
        refreshToken: 'some.refre...',
      });

      loggerSpy.mockRestore();
    });
  });
});
