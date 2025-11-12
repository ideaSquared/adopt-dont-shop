import { vi } from 'vitest';
/**
 * Auth Service - Security Business Logic Tests
 *
 * Tests security-critical business rules:
 * - Account lockout after failed login attempts
 * - Password complexity validation
 * - Token expiration and validation
 * - Two-factor authentication flow
 * - Email verification requirements
 * - Secure credential handling
 * - Rate limiting and security logging
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User, { UserStatus, UserType } from '../../models/User';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials, RegisterData } from '../../types/auth';

// Mocked dependencies
const MockedUser = User as vi.MockedObject<User>;

// Mock bcrypt
vi.mock('bcryptjs');
const MockedBcrypt = bcrypt as vi.MockedObject<bcrypt>;

// Mock jwt
vi.mock('jsonwebtoken');
const MockedJwt = jwt as vi.MockedObject<jwt>;

// Mock crypto
vi.mock('crypto');

// Mock env config to avoid validation errors
vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
}));

// Test constants
const mockUserId = 'user-123';
const mockEmail = 'test@example.com';
const validPassword = 'Test@Password123';
const mockJwtSecret = 'test-jwt-secret-min-32-characters-long-12345';
const mockRefreshSecret = 'test-refresh-secret-min-32-characters-long-12345';

// ============================================================================
// Mock Factory Functions
// ============================================================================

const createMockUser = (overrides = {}) => ({
  userId: mockUserId,
  email: mockEmail,
  password: 'hashed_password',
  firstName: 'John',
  lastName: 'Doe',
  userType: UserType.ADOPTER,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  twoFactorEnabled: false,
  loginAttempts: 0,
  lockedUntil: null as Date | null,
  lastLoginAt: null as Date | null,
  resetToken: null as string | null,
  resetTokenExpiration: null as Date | null,
  resetTokenForceFlag: false,
  save: vi.fn().mockResolvedValue(undefined),
  toJSON: vi.fn().mockReturnValue({ userId: mockUserId, email: mockEmail }),
  isAccountLocked: vi.fn().mockReturnValue(false),
  canLogin: vi.fn().mockReturnValue(true),
  ...overrides,
});

const createValidRegisterData = (overrides = {}): RegisterData => ({
  firstName: 'John',
  lastName: 'Doe',
  email: mockEmail,
  password: validPassword,
  userType: UserType.ADOPTER,
  ...overrides,
});

const createValidLoginCredentials = (overrides = {}): LoginCredentials => ({
  email: mockEmail,
  password: validPassword,
  ...overrides,
});

describe('AuthService - Security Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup environment variables
    process.env.JWT_SECRET = mockJwtSecret;
    process.env.JWT_REFRESH_SECRET = mockRefreshSecret;
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    // Setup JWT mocks
    MockedJwt.sign = vi.fn().mockReturnValue('mock-token');
    MockedJwt.verify = vi.fn();
  });

  // ==========================================================================
  // Account Lockout Security
  // ==========================================================================

  describe('Account Lockout After Failed Login Attempts', () => {
    it('should increment login attempts on failed password', async () => {
      // Given: User with 0 login attempts
      const mockUser = createMockUser({ loginAttempts: 0 });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(false);

      const credentials = createValidLoginCredentials({ password: 'wrong_password' });

      // When: Login fails
      try {
        await AuthService.login(credentials);
      } catch (error) {
        // Expected to fail
      }

      // Then: Login attempts are incremented
      expect(mockUser.loginAttempts).toBe(1);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should lock account after 5 failed login attempts', async () => {
      // Given: User with 4 failed login attempts
      const mockUser = createMockUser({ loginAttempts: 4 });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(false);

      const credentials = createValidLoginCredentials({ password: 'wrong_password' });

      // When: 5th login fails
      try {
        await AuthService.login(credentials);
      } catch (error) {
        // Expected to fail
      }

      // Then: Account is locked for 30 minutes
      expect(mockUser.loginAttempts).toBe(5);
      expect(mockUser.lockedUntil).toBeInstanceOf(Date);
      if (mockUser.lockedUntil) {
        expect(mockUser.lockedUntil.getTime()).toBeGreaterThan(Date.now());
        expect(mockUser.lockedUntil.getTime()).toBeLessThanOrEqual(
          Date.now() + 30 * 60 * 1000 + 1000 // 30 minutes + 1 second buffer
        );
      }
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should prevent login when account is locked', async () => {
      // Given: User with locked account
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Locked for 15 more minutes
      const mockUser = createMockUser({
        loginAttempts: 5,
        lockedUntil,
      });
      mockUser.isAccountLocked.mockReturnValue(true);

      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });

      const credentials = createValidLoginCredentials();

      // When & Then: Login is rejected
      await expect(AuthService.login(credentials)).rejects.toThrow(
        'Account is temporarily locked. Please try again later.'
      );
    });

    it('should reset login attempts after successful login', async () => {
      // Given: User with failed login attempts
      const mockUser = createMockUser({ loginAttempts: 3, lockedUntil: null });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      const credentials = createValidLoginCredentials();

      // When: Login succeeds
      await AuthService.login(credentials);

      // Then: Login attempts are reset
      expect(mockUser.loginAttempts).toBe(0);
      expect(mockUser.lockedUntil).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should allow login after lock period expires', async () => {
      // Given: User with expired lock
      const expiredLock = new Date(Date.now() - 1000); // Locked until 1 second ago
      const mockUser = createMockUser({
        loginAttempts: 5,
        lockedUntil: expiredLock,
      });
      mockUser.isAccountLocked.mockReturnValue(false); // Lock expired

      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      const credentials = createValidLoginCredentials();

      // When: Login with expired lock
      const result = await AuthService.login(credentials);

      // Then: Login succeeds and attempts are reset
      expect(result).toBeDefined();
      expect(mockUser.loginAttempts).toBe(0);
      expect(mockUser.lockedUntil).toBeNull();
    });

    it('should not reveal if email exists when login fails', async () => {
      // Given: Non-existent user
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(null),
      });

      const credentials = createValidLoginCredentials({ email: 'nonexistent@example.com' });

      // When & Then: Generic error message
      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });

  // ==========================================================================
  // Password Complexity Validation
  // ==========================================================================

  describe('Password Complexity Requirements', () => {
    it('should reject password shorter than 8 characters', async () => {
      // Given: Registration with short password
      const registerData = createValidRegisterData({ password: 'Short1!' });

      // When & Then: Registration fails
      await expect(AuthService.register(registerData)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject password without lowercase letter', async () => {
      // Given: Password without lowercase
      const registerData = createValidRegisterData({ password: 'PASSWORD123!' });

      // When & Then: Registration fails
      await expect(AuthService.register(registerData)).rejects.toThrow(
        'Password must contain at least one lowercase letter'
      );
    });

    it('should reject password without uppercase letter', async () => {
      // Given: Password without uppercase
      const registerData = createValidRegisterData({ password: 'password123!' });

      // When & Then: Registration fails
      await expect(AuthService.register(registerData)).rejects.toThrow(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should reject password without number', async () => {
      // Given: Password without number
      const registerData = createValidRegisterData({ password: 'Password!' });

      // When & Then: Registration fails
      await expect(AuthService.register(registerData)).rejects.toThrow(
        'Password must contain at least one number'
      );
    });

    it('should reject password without special character', async () => {
      // Given: Password without special character
      const registerData = createValidRegisterData({ password: 'Password123' });

      // When & Then: Registration fails
      await expect(AuthService.register(registerData)).rejects.toThrow(
        'Password must contain at least one special character'
      );
    });

    it('should accept password meeting all requirements', async () => {
      // Given: Valid password and no existing user
      const registerData = createValidRegisterData({ password: 'Valid@Password123' });
      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      const mockCreatedUser = createMockUser();
      MockedUser.create = vi.fn().mockResolvedValue(mockCreatedUser);

      // Mock crypto for token generation
      const mockCrypto = crypto as vi.MockedObject<crypto>;
      (mockCrypto.randomBytes as unknown as vi.Mock) = vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue('mock-verification-token'),
      });

      // When: Registering with valid password
      const result = await AuthService.register(registerData);

      // Then: Registration succeeds
      expect(result).toBeDefined();
      expect(MockedUser.create).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Email Verification Requirements
  // ==========================================================================

  describe('Email Verification Security', () => {
    it('should prevent login for unverified email', async () => {
      // Given: User with unverified email
      const mockUser = createMockUser({ emailVerified: false });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      const credentials = createValidLoginCredentials();

      // When & Then: Login fails
      await expect(AuthService.login(credentials)).rejects.toThrow(
        'Please verify your email before logging in'
      );
    });

    it('should allow login after email verification', async () => {
      // Given: User with verified email
      const mockUser = createMockUser({ emailVerified: true });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      const credentials = createValidLoginCredentials();

      // When: Login with verified email
      const result = await AuthService.login(credentials);

      // Then: Login succeeds
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should set status to PENDING_VERIFICATION on registration', async () => {
      // Given: New registration
      const registerData = createValidRegisterData();
      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      const mockCreatedUser = createMockUser({
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
      });
      MockedUser.create = vi.fn().mockResolvedValue(mockCreatedUser);

      const mockCrypto = crypto as vi.MockedObject<crypto>;
      (mockCrypto.randomBytes as unknown as vi.Mock) = vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue('verification-token'),
      });

      // When: Registering
      await AuthService.register(registerData);

      // Then: User created with PENDING_VERIFICATION status
      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
          verificationToken: expect.any(String),
          verificationTokenExpiresAt: expect.any(Date),
        })
      );
    });
  });

  // ==========================================================================
  // Two-Factor Authentication
  // ==========================================================================

  describe('Two-Factor Authentication Security', () => {
    it('should require 2FA token when enabled', async () => {
      // Given: User with 2FA enabled
      const mockUser = createMockUser({ twoFactorEnabled: true });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      const credentials = createValidLoginCredentials(); // No 2FA token

      // When & Then: Login fails without 2FA token
      await expect(AuthService.login(credentials)).rejects.toThrow(
        'Two-factor authentication code required'
      );
    });

    it('should reject invalid 2FA token', async () => {
      // Given: User with 2FA enabled
      const mockUser = createMockUser({ twoFactorEnabled: true });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      const credentials = createValidLoginCredentials({ twoFactorToken: 'invalid-token' });

      // When & Then: Login fails with invalid token
      await expect(AuthService.login(credentials)).rejects.toThrow(
        'Invalid two-factor authentication code'
      );
    });

    it('should allow login with valid 2FA token', async () => {
      // Given: User with 2FA enabled and valid token
      const mockUser = createMockUser({ twoFactorEnabled: true });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      // Note: Current implementation has hardcoded 2FA validation (TODO in codebase)
      const credentials = createValidLoginCredentials({ twoFactorToken: '123456' });

      // When: Login with correct 2FA token
      const result = await AuthService.login(credentials);

      // Then: Login succeeds
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
    });
  });

  // ==========================================================================
  // Credential Security
  // ==========================================================================

  describe('Secure Credential Handling', () => {
    it('should normalize email to lowercase on registration', async () => {
      // Given: Registration with uppercase email
      const registerData = createValidRegisterData({ email: 'Test@Example.COM' });
      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      const mockCreatedUser = createMockUser();
      MockedUser.create = vi.fn().mockResolvedValue(mockCreatedUser);

      const mockCrypto = crypto as vi.MockedObject<crypto>;
      (mockCrypto.randomBytes as unknown as vi.Mock) = vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue('token'),
      });

      // When: Registering
      await AuthService.register(registerData);

      // Then: Email is stored in lowercase
      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com', // Lowercased
        })
      );
    });

    it('should normalize email to lowercase on login', async () => {
      // Given: Login with uppercase email
      const mockUser = createMockUser({ email: 'test@example.com' });
      const findOneMock = vi.fn().mockResolvedValue(mockUser);
      MockedUser.scope = vi.fn().mockReturnValue({ findOne: findOneMock });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      const credentials = createValidLoginCredentials({ email: 'Test@Example.COM' });

      // When: Logging in
      await AuthService.login(credentials);

      // Then: Email is normalized to lowercase in query
      expect(findOneMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });

    it('should not expose password in sanitized user data', async () => {
      // Given: Successful login
      const mockUser = createMockUser({ password: 'hashed_password_secret' });
      mockUser.toJSON.mockReturnValue({
        userId: mockUserId,
        email: mockEmail,
        password: 'hashed_password_secret',
        twoFactorSecret: 'secret',
        backupCodes: ['code1', 'code2'],
      });

      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      const credentials = createValidLoginCredentials();

      // When: Login succeeds
      const result = await AuthService.login(credentials);

      // Then: Sensitive fields are not in response
      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('twoFactorSecret');
      expect(result.user).not.toHaveProperty('backupCodes');
      expect(result.user).not.toHaveProperty('resetToken');
      expect(result.user).not.toHaveProperty('verificationToken');
    });

    it('should prevent duplicate email registration', async () => {
      // Given: Existing user with email
      const existingUser = createMockUser();
      MockedUser.findOne = vi.fn().mockResolvedValue(existingUser);

      const registerData = createValidRegisterData();

      // When & Then: Registration fails
      await expect(AuthService.register(registerData)).rejects.toThrow(
        'User already exists with this email'
      );
    });
  });

  // ==========================================================================
  // Token Security
  // ==========================================================================

  describe('JWT Token Security', () => {
    it('should generate access and refresh tokens on login', async () => {
      // Given: Successful login
      const mockUser = createMockUser();
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      MockedJwt.sign = vi
        .fn()
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const credentials = createValidLoginCredentials();

      // When: Login succeeds
      const result = await AuthService.login(credentials);

      // Then: Both tokens are generated
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(MockedJwt.sign).toHaveBeenCalledTimes(2);
    });

    it('should include userId and email in token payload', async () => {
      // Given: Successful login
      const mockUser = createMockUser();
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      const credentials = createValidLoginCredentials();

      // When: Login succeeds
      await AuthService.login(credentials);

      // Then: Token payload includes user identifiers
      expect(MockedJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          email: mockEmail,
        }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should verify refresh token before generating new tokens', async () => {
      // Given: Valid refresh token
      const mockUser = createMockUser();
      MockedJwt.verify = vi.fn().mockReturnValue({ userId: mockUserId, tokenId: 'token-id' });
      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser);

      // When: Refreshing token
      const result = await AuthService.refreshToken('valid-refresh-token');

      // Then: Token is verified before issuing new tokens
      expect(MockedJwt.verify).toHaveBeenCalledWith('valid-refresh-token', mockRefreshSecret);
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      // Given: Invalid refresh token
      MockedJwt.verify = vi.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // When & Then: Refresh fails
      await expect(AuthService.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should reject refresh token for non-existent user', async () => {
      // Given: Token for deleted/non-existent user
      MockedJwt.verify = vi.fn().mockReturnValue({ userId: 'deleted-user', tokenId: 'token-id' });
      MockedUser.findByPk = vi.fn().mockResolvedValue(null);

      // When & Then: Refresh fails
      await expect(AuthService.refreshToken('token-for-deleted-user')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should reject refresh token if user cannot login', async () => {
      // Given: Token for suspended user
      const suspendedUser = createMockUser();
      suspendedUser.canLogin.mockReturnValue(false);

      MockedJwt.verify = vi.fn().mockReturnValue({ userId: mockUserId, tokenId: 'token-id' });
      MockedUser.findByPk = vi.fn().mockResolvedValue(suspendedUser);

      // When & Then: Refresh fails
      await expect(AuthService.refreshToken('suspended-user-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  // ==========================================================================
  // Password Reset Security
  // ==========================================================================

  describe('Password Reset Security', () => {
    it('should not reveal if email exists when requesting password reset', async () => {
      // Given: Non-existent email
      MockedUser.findOne = vi.fn().mockResolvedValue(null);

      const authService = new AuthService();

      // When: Requesting password reset
      const result = await authService.requestPasswordReset({ email: 'nonexistent@example.com' });

      // Then: Generic success message
      expect(result.message).toBe('If the email exists, a reset link has been sent');
    });

    it('should generate secure reset token for existing user', async () => {
      // Given: Existing user
      const mockUser = createMockUser();
      MockedUser.findOne = vi.fn().mockResolvedValue(mockUser);

      const mockCrypto = crypto as vi.MockedObject<crypto>;
      (mockCrypto.randomBytes as unknown as vi.Mock) = vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue('secure-reset-token'),
      });

      const authService = new AuthService();

      // When: Requesting password reset
      await authService.requestPasswordReset({ email: mockEmail });

      // Then: Secure token is generated and saved
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockUser.resetToken).toBe('secure-reset-token');
      expect(mockUser.resetTokenExpiration).toBeInstanceOf(Date);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should set reset token expiration to 1 hour', async () => {
      // Given: Existing user
      const mockUser = createMockUser();
      MockedUser.findOne = vi.fn().mockResolvedValue(mockUser);

      const mockCrypto = crypto as vi.MockedObject<crypto>;
      (mockCrypto.randomBytes as unknown as vi.Mock) = vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue('reset-token'),
      });

      const authService = new AuthService();
      const beforeRequest = Date.now();

      // When: Requesting password reset
      await authService.requestPasswordReset({ email: mockEmail });

      const afterRequest = Date.now();

      // Then: Token expires in approximately 1 hour
      expect(mockUser.resetTokenExpiration).toBeInstanceOf(Date);
      if (mockUser.resetTokenExpiration) {
        expect(mockUser.resetTokenExpiration.getTime()).toBeGreaterThanOrEqual(
          beforeRequest + 60 * 60 * 1000 - 1000 // 1 hour minus 1 second buffer
        );
        expect(mockUser.resetTokenExpiration.getTime()).toBeLessThanOrEqual(
          afterRequest + 60 * 60 * 1000 + 1000 // 1 hour plus 1 second buffer
        );
      }
    });

    it('should reject expired reset token', async () => {
      // Given: User with expired reset token
      const expiredDate = new Date(Date.now() - 1000); // Expired 1 second ago
      const mockUser = createMockUser({
        resetToken: 'expired-token',
        resetTokenExpiration: expiredDate,
      });

      MockedUser.findOne = vi.fn().mockResolvedValue(null); // Query filters expired tokens

      const authService = new AuthService();

      // When & Then: Reset fails with expired token
      await expect(
        authService.confirmPasswordReset({
          token: 'expired-token',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should accept valid reset token within expiration', async () => {
      // Given: User with valid reset token
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // Expires in 30 minutes
      const mockUser = createMockUser({
        resetToken: 'valid-token',
        resetTokenExpiration: futureDate,
      });

      MockedUser.findOne = vi.fn().mockResolvedValue(mockUser);

      const authService = new AuthService();

      // When: Confirming password reset with valid token
      const result = await authService.confirmPasswordReset({
        token: 'valid-token',
        newPassword: 'NewPassword123!',
      });

      // Then: Password is reset successfully
      expect(result.message).toBe('Password reset successfully');
      expect(mockUser.password).toBe('NewPassword123!');
      expect(mockUser.resetToken).toBeNull();
      expect(mockUser.resetTokenExpiration).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should clear reset token after successful reset', async () => {
      // Given: User with valid reset token
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      const mockUser = createMockUser({
        resetToken: 'valid-token',
        resetTokenExpiration: futureDate,
      });

      MockedUser.findOne = vi.fn().mockResolvedValue(mockUser);

      const authService = new AuthService();

      // When: Password reset completes
      await authService.confirmPasswordReset({
        token: 'valid-token',
        newPassword: 'NewPassword123!',
      });

      // Then: Reset token is cleared
      expect(mockUser.resetToken).toBeNull();
      expect(mockUser.resetTokenExpiration).toBeNull();
      expect(mockUser.resetTokenForceFlag).toBe(false);
    });
  });

  // ==========================================================================
  // Security Logging and Audit
  // ==========================================================================

  describe('Security Event Logging', () => {
    it('should update lastLoginAt on successful login', async () => {
      // Given: Successful login
      const mockUser = createMockUser({ lastLoginAt: null });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      });
      MockedBcrypt.compare = vi.fn().mockResolvedValue(true);

      const beforeLogin = Date.now();
      const credentials = createValidLoginCredentials();

      // When: Login succeeds
      await AuthService.login(credentials);

      const afterLogin = Date.now();

      // Then: lastLoginAt is updated
      expect(mockUser.lastLoginAt).toBeInstanceOf(Date);
      if (mockUser.lastLoginAt) {
        expect(mockUser.lastLoginAt.getTime()).toBeGreaterThanOrEqual(beforeLogin - 1000);
        expect(mockUser.lastLoginAt.getTime()).toBeLessThanOrEqual(afterLogin + 1000);
      }
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Business Invariants
  // ==========================================================================

  describe('Registration Business Invariants', () => {
    it('should set default user type to ADOPTER if not specified', async () => {
      // Given: Registration without userType
      const registerData: RegisterData = {
        firstName: 'John',
        lastName: 'Doe',
        email: mockEmail,
        password: validPassword,
        // userType not specified
      };

      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      const mockCreatedUser = createMockUser();
      MockedUser.create = vi.fn().mockResolvedValue(mockCreatedUser);

      const mockCrypto = crypto as vi.MockedObject<crypto>;
      (mockCrypto.randomBytes as unknown as vi.Mock) = vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue('token'),
      });

      // When: Registering
      await AuthService.register(registerData);

      // Then: User created with ADOPTER type
      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userType: UserType.ADOPTER,
        })
      );
    });

    it('should initialize login attempts to 0 on registration', async () => {
      // Given: New registration
      const registerData = createValidRegisterData();
      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      const mockCreatedUser = createMockUser();
      MockedUser.create = vi.fn().mockResolvedValue(mockCreatedUser);

      const mockCrypto = crypto as vi.MockedObject<crypto>;
      (mockCrypto.randomBytes as unknown as vi.Mock) = vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue('token'),
      });

      // When: Registering
      await AuthService.register(registerData);

      // Then: Login attempts initialized to 0
      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          loginAttempts: 0,
        })
      );
    });
  });
});
