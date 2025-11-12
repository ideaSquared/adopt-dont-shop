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
import { Op } from 'sequelize';
import User, { UserStatus, UserType } from '../../models/User';
import { AuthService } from '../../services/auth.service';
import { AuditLogService } from '../../services/auditLog.service';
import {
  LoginCredentials,
  RegisterData,
  PasswordResetRequest,
  PasswordResetConfirm,
  AuthResponse,
} from '../../types';

// Mock dependencies
vi.mock('../../models/User');
vi.mock('../../models/AuditLog');
vi.mock('../../services/auditLog.service');
vi.mock('../../utils/logger');
vi.mock('jsonwebtoken');
vi.mock('bcryptjs');
vi.mock('crypto');

// Mock email service
vi.mock('../../services/email.service', () => ({
  default: {
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

const MockedUser = User as vi.MockedObject<User>;
const MockedAuditLogService = AuditLogService as vi.MockedObject<AuditLogService>;
const mockedJwt = jwt as vi.MockedObject<jwt>;
const mockedBcrypt = bcrypt as vi.MockedObject<bcrypt>;
const mockedCrypto = crypto as vi.MockedObject<crypto>;

describe('Authentication Flow Integration Tests', () => {
  const validPassword = 'SecurePass123!';
  const hashedPassword = 'hashed_SecurePass123!';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default bcrypt mocks
    mockedBcrypt.hash = vi.fn().mockResolvedValue(hashedPassword as never);
    mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);
    mockedBcrypt.genSalt = vi.fn().mockResolvedValue('salt' as never);

    // Setup default crypto mocks
    (mockedCrypto.randomBytes as unknown as vi.Mock) = vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('mock-token-12345678901234567890'),
    });

    // Setup default JWT mocks
    mockedJwt.sign = vi.fn().mockReturnValue('mock-jwt-token' as never);
    mockedJwt.verify = vi.fn().mockReturnValue({
      userId: 'user-123',
      email: 'test@example.com',
      userType: UserType.ADOPTER,
    } as never);

    // Setup default AuditLog mocks
    MockedAuditLogService.log = vi.fn().mockResolvedValue(undefined as never);
  });

  describe('User Registration and Email Verification', () => {
    const registerData: RegisterData = {
      email: 'newuser@example.com',
      password: validPassword,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
      userType: UserType.ADOPTER,
    };

    describe('when registering a new user', () => {
      it('should successfully register user with valid data', async () => {
        const mockUser = createMockUser({
          userId: 'user-new-123',
          email: registerData.email.toLowerCase(),
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(mockUser as never);

        const result = await AuthService.register(registerData);

        expect(MockedUser.findOne).toHaveBeenCalledWith({
          where: { email: registerData.email.toLowerCase() },
        });
        expect(MockedUser.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: registerData.email.toLowerCase(),
            firstName: registerData.firstName,
            lastName: registerData.lastName,
            phoneNumber: registerData.phoneNumber,
            userType: UserType.ADOPTER,
            status: UserStatus.PENDING_VERIFICATION,
            emailVerified: false,
          })
        );
        expect(result.user).toBeDefined();
        expect(result.token).toBeDefined();
        expect(result.refreshToken).toBeDefined();
      });

      it('should create user with verification token and expiration', async () => {
        const mockUser = createMockUser({
          userId: 'user-new-123',
          email: registerData.email.toLowerCase(),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(mockUser as never);

        await AuthService.register(registerData);

        expect(MockedUser.create).toHaveBeenCalledWith(
          expect.objectContaining({
            verificationToken: expect.any(String),
            verificationTokenExpiresAt: expect.any(Date),
          })
        );
      });

      it('should create user with default privacy and notification settings', async () => {
        const mockUser = createMockUser({
          userId: 'user-new-123',
          email: registerData.email.toLowerCase(),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(mockUser as never);

        await AuthService.register(registerData);

        expect(MockedUser.create).toHaveBeenCalledWith(
          expect.objectContaining({
            privacySettings: expect.objectContaining({
              profileVisibility: 'public',
              showLocation: false,
              allowMessages: true,
            }),
            notificationPreferences: expect.objectContaining({
              emailNotifications: true,
              pushNotifications: true,
            }),
          })
        );
      });

      it('should log user registration in audit log', async () => {
        const mockUser = createMockUser({
          userId: 'user-new-123',
          email: registerData.email.toLowerCase(),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(mockUser as never);

        await AuthService.register(registerData);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUser.userId,
            action: 'USER_CREATED',
            entity: 'User',
            entityId: mockUser.userId,
          })
        );
      });

      it('should generate JWT tokens for new user', async () => {
        const mockUser = createMockUser({
          userId: 'user-new-123',
          email: registerData.email.toLowerCase(),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(mockUser as never);

        const result = await AuthService.register(registerData);

        expect(result.token).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.expiresIn).toBeDefined();
      });

      it('should reject registration with existing email', async () => {
        const existingUser = createMockUser({
          userId: 'existing-user-123',
          email: registerData.email.toLowerCase(),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(existingUser as never);

        await expect(AuthService.register(registerData)).rejects.toThrow(
          'User already exists with this email'
        );
        expect(MockedUser.create).not.toHaveBeenCalled();
      });

      it('should reject registration with email in different case', async () => {
        const existingUser = createMockUser({
          userId: 'existing-user-123',
          email: registerData.email.toLowerCase(),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(existingUser as never);

        const upperCaseData = { ...registerData, email: registerData.email.toUpperCase() };

        await expect(AuthService.register(upperCaseData)).rejects.toThrow(
          'User already exists with this email'
        );
      });
    });

    describe('when validating passwords during registration', () => {
      it('should reject password shorter than 8 characters', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const invalidData = { ...registerData, password: 'Short1!' };

        await expect(AuthService.register(invalidData)).rejects.toThrow(
          'Password must be at least 8 characters long'
        );
      });

      it('should reject password without lowercase letter', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const invalidData = { ...registerData, password: 'PASSWORD123!' };

        await expect(AuthService.register(invalidData)).rejects.toThrow(
          'Password must contain at least one lowercase letter'
        );
      });

      it('should reject password without uppercase letter', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const invalidData = { ...registerData, password: 'password123!' };

        await expect(AuthService.register(invalidData)).rejects.toThrow(
          'Password must contain at least one uppercase letter'
        );
      });

      it('should reject password without number', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const invalidData = { ...registerData, password: 'PasswordOnly!' };

        await expect(AuthService.register(invalidData)).rejects.toThrow(
          'Password must contain at least one number'
        );
      });

      it('should reject password without special character', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const invalidData = { ...registerData, password: 'Password123' };

        await expect(AuthService.register(invalidData)).rejects.toThrow(
          'Password must contain at least one special character'
        );
      });
    });

    describe('when verifying email with token', () => {
      const verificationToken = 'valid-verification-token';

      it('should successfully verify email with valid token', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: 'test@example.com',
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
          verificationToken,
          verificationTokenExpiresAt: new Date(Date.now() + 3600000),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        const result = await authService.verifyEmail(verificationToken);

        expect(MockedUser.findOne).toHaveBeenCalledWith({
          where: {
            verificationToken,
            verificationTokenExpiresAt: {
              [Op.gt]: expect.any(Date),
            },
          },
        });
        expect(mockUser.emailVerified).toBe(true);
        expect(mockUser.verificationToken).toBe(null);
        expect(mockUser.verificationTokenExpiresAt).toBe(null);
        expect(mockUser.status).toBe(UserStatus.ACTIVE);
        expect(mockUser.save).toHaveBeenCalled();
        expect(result.message).toBe('Email verified successfully');
      });

      it('should reject verification with invalid token', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();

        await expect(authService.verifyEmail('invalid-token')).rejects.toThrow(
          'Invalid or expired verification token'
        );
      });

      it('should reject verification with expired token', async () => {
        const expiredDate = new Date(Date.now() - 3600000);

        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();

        await expect(authService.verifyEmail(verificationToken)).rejects.toThrow(
          'Invalid or expired verification token'
        );
      });

      it('should log email verification in audit log', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: 'test@example.com',
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
          verificationToken,
          verificationTokenExpiresAt: new Date(Date.now() + 3600000),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        await authService.verifyEmail(verificationToken);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'EMAIL_VERIFICATION',
            entity: 'User',
            entityId: mockUser.userId,
          })
        );
      });

      it('should update user status to ACTIVE after verification', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: 'test@example.com',
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
          verificationToken,
          verificationTokenExpiresAt: new Date(Date.now() + 3600000),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        await authService.verifyEmail(verificationToken);

        expect(mockUser.status).toBe(UserStatus.ACTIVE);
      });
    });

    describe('when resending verification email', () => {
      const email = 'unverified@example.com';

      it('should generate new verification token for unverified user', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: email.toLowerCase(),
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        await authService.resendVerificationEmail(email);

        expect(mockUser.verificationToken).toBeDefined();
        expect(mockUser.verificationTokenExpiresAt).toBeInstanceOf(Date);
        expect(mockUser.save).toHaveBeenCalled();
      });

      it('should not reveal if email does not exist', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();
        const result = await authService.resendVerificationEmail('nonexistent@example.com');

        expect(result.message).toBe(
          'If the email exists and is unverified, a new verification link has been sent'
        );
      });

      it('should not reveal if email is already verified', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: email.toLowerCase(),
          emailVerified: true,
          status: UserStatus.ACTIVE,
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        const result = await authService.resendVerificationEmail(email);

        expect(result.message).toBe(
          'If the email exists and is unverified, a new verification link has been sent'
        );
        expect(mockUser.save).not.toHaveBeenCalled();
      });

      it('should log verification email resend in audit log', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: email.toLowerCase(),
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        await authService.resendVerificationEmail(email);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'VERIFICATION_EMAIL_RESEND',
            entity: 'User',
            entityId: mockUser.userId,
          })
        );
      });
    });
  });

  describe('Login and JWT Token Issuance', () => {
    const loginCredentials: LoginCredentials = {
      email: 'verified@example.com',
      password: validPassword,
    };

    describe('when logging in with valid credentials', () => {
      it('should successfully login verified user', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          loginAttempts: 0,
          lockedUntil: null,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        const result = await AuthService.login(loginCredentials);

        expect(result.user).toBeDefined();
        expect(result.token).toBeDefined();
        expect(result.refreshToken).toBeDefined();
      });

      it('should reset login attempts on successful login', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          loginAttempts: 3,
          lockedUntil: null,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        await AuthService.login(loginCredentials);

        expect(mockUser.loginAttempts).toBe(0);
        expect(mockUser.lockedUntil).toBe(null);
        expect(mockUser.save).toHaveBeenCalled();
      });

      it('should update last login timestamp', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: null,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        await AuthService.login(loginCredentials);

        expect(mockUser.lastLoginAt).toBeInstanceOf(Date);
      });

      it('should log successful login in audit log', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        await AuthService.login(loginCredentials);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'LOGIN',
            entity: 'User',
            entityId: mockUser.userId,
          })
        );
      });

      it('should include user roles and permissions in response', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          Roles: [
            {
              roleId: 'role-1',
              name: 'adopter',
              description: 'Adopter role',
              Permissions: [
                {
                  permissionId: 'perm-1',
                  name: 'view_pets',
                  resource: 'pets',
                  action: 'read',
                },
              ],
            },
          ],
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        const result = await AuthService.login(loginCredentials);

        expect(MockedUser.scope).toHaveBeenCalledWith('withSecrets');
        expect(result.user).toBeDefined();
      });
    });

    describe('when login fails due to invalid credentials', () => {
      it('should reject login with non-existent email', async () => {
        MockedUser.scope = vi.fn().mockReturnValue({
          findOne: vi.fn().mockResolvedValue(null),
        } as never);

        await expect(AuthService.login(loginCredentials)).rejects.toThrow('Invalid credentials');
      });

      it('should reject login with incorrect password', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          loginAttempts: 0,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(false as never);

        await expect(AuthService.login(loginCredentials)).rejects.toThrow('Invalid credentials');
      });

      it('should increment login attempts on failed password', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          loginAttempts: 2,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(false as never);

        await expect(AuthService.login(loginCredentials)).rejects.toThrow('Invalid credentials');

        expect(mockUser.loginAttempts).toBe(3);
        expect(mockUser.save).toHaveBeenCalled();
      });

      it('should lock account after 5 failed attempts', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          loginAttempts: 4,
          lockedUntil: null,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(false as never);

        await expect(AuthService.login(loginCredentials)).rejects.toThrow('Invalid credentials');

        expect(mockUser.loginAttempts).toBe(5);
        expect(mockUser.lockedUntil).toBeInstanceOf(Date);
        expect(mockUser.save).toHaveBeenCalled();
      });

      it('should reject login for locked account', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          loginAttempts: 5,
          lockedUntil: new Date(Date.now() + 1800000), // 30 minutes from now
        });

        mockUser.isAccountLocked = vi.fn().mockReturnValue(true);

        setupLoginMocks(mockUser);

        await expect(AuthService.login(loginCredentials)).rejects.toThrow(
          'Account is temporarily locked. Please try again later.'
        );
      });

      it('should reject login for unverified email', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        await expect(AuthService.login(loginCredentials)).rejects.toThrow(
          'Please verify your email before logging in'
        );
      });
    });

    describe('when two-factor authentication is enabled', () => {
      it('should require 2FA token when enabled', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          twoFactorEnabled: true,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        await expect(AuthService.login(loginCredentials)).rejects.toThrow(
          'Two-factor authentication code required'
        );
      });

      it('should reject invalid 2FA token', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          twoFactorEnabled: true,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        const credentialsWithInvalid2FA = {
          ...loginCredentials,
          twoFactorToken: 'invalid',
        };

        await expect(AuthService.login(credentialsWithInvalid2FA)).rejects.toThrow(
          'Invalid two-factor authentication code'
        );
      });

      it('should accept valid 2FA token', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: loginCredentials.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          twoFactorEnabled: true,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        const credentialsWithValid2FA = {
          ...loginCredentials,
          twoFactorToken: '123456',
        };

        const result = await AuthService.login(credentialsWithValid2FA);

        expect(result.user).toBeDefined();
        expect(result.token).toBeDefined();
      });
    });
  });

  describe('Token Refresh Workflow', () => {
    const validRefreshToken = 'valid.refresh.token';

    describe('when refreshing access token', () => {
      it('should successfully refresh token with valid refresh token', async () => {
        const mockPayload = {
          userId: 'user-123',
          tokenId: 'token-123',
          email: 'test@example.com',
          userType: UserType.ADOPTER,
        };

        const mockUser = createMockUser({
          userId: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
          status: UserStatus.ACTIVE,
        });

        mockUser.canLogin = vi.fn().mockReturnValue(true);

        mockedJwt.verify = vi.fn().mockReturnValue(mockPayload as never);
        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);

        const result = await AuthService.refreshToken(validRefreshToken);

        expect(result.user).toBeDefined();
        expect(result.token).toBeDefined();
        expect(result.refreshToken).toBeDefined();
      });

      it('should verify refresh token with correct secret', async () => {
        const mockPayload = {
          userId: 'user-123',
          tokenId: 'token-123',
        };

        const mockUser = createMockUser({
          userId: 'user-123',
          emailVerified: true,
          status: UserStatus.ACTIVE,
        });

        mockUser.canLogin = vi.fn().mockReturnValue(true);

        mockedJwt.verify = vi.fn().mockReturnValue(mockPayload as never);
        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);

        await AuthService.refreshToken(validRefreshToken);

        expect(mockedJwt.verify).toHaveBeenCalledWith(
          validRefreshToken,
          'test-refresh-secret-min-32-characters-long-12345'
        );
      });

      it('should include user roles in refreshed token', async () => {
        const mockPayload = {
          userId: 'user-123',
          tokenId: 'token-123',
        };

        const mockUser = createMockUser({
          userId: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
          status: UserStatus.ACTIVE,
          Roles: [
            {
              roleId: 'role-1',
              name: 'adopter',
              description: 'Adopter role',
              Permissions: [],
            },
          ],
        });

        mockUser.canLogin = vi.fn().mockReturnValue(true);

        mockedJwt.verify = vi.fn().mockReturnValue(mockPayload as never);
        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);

        const result = await AuthService.refreshToken(validRefreshToken);

        expect(MockedUser.findByPk).toHaveBeenCalledWith('user-123', expect.any(Object));
        expect(result.user).toBeDefined();
      });

      it('should reject refresh with invalid token', async () => {
        mockedJwt.verify = vi.fn().mockImplementation(() => {
          throw new Error('Invalid token');
        });

        await expect(AuthService.refreshToken('invalid.token')).rejects.toThrow(
          'Invalid refresh token'
        );
      });

      it('should reject refresh with expired token', async () => {
        mockedJwt.verify = vi.fn().mockImplementation(() => {
          const error = new Error('Token expired');
          error.name = 'TokenExpiredError';
          throw error;
        });

        await expect(AuthService.refreshToken('expired.token')).rejects.toThrow(
          'Invalid refresh token'
        );
      });

      it('should reject refresh for non-existent user', async () => {
        const mockPayload = {
          userId: 'non-existent-user',
          tokenId: 'token-123',
        };

        mockedJwt.verify = vi.fn().mockReturnValue(mockPayload as never);
        MockedUser.findByPk = vi.fn().mockResolvedValue(null);

        await expect(AuthService.refreshToken(validRefreshToken)).rejects.toThrow(
          'Invalid refresh token'
        );
      });

      it('should reject refresh for user who cannot login', async () => {
        const mockPayload = {
          userId: 'user-123',
          tokenId: 'token-123',
        };

        const mockUser = createMockUser({
          userId: 'user-123',
          status: UserStatus.SUSPENDED,
        });

        mockUser.canLogin = vi.fn().mockReturnValue(false);

        mockedJwt.verify = vi.fn().mockReturnValue(mockPayload as never);
        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);

        await expect(AuthService.refreshToken(validRefreshToken)).rejects.toThrow(
          'Invalid refresh token'
        );
      });

      it('should generate new token pair with same user data', async () => {
        const mockPayload = {
          userId: 'user-123',
          tokenId: 'token-123',
        };

        const mockUser = createMockUser({
          userId: 'user-123',
          email: 'test@example.com',
          userType: UserType.ADOPTER,
          status: UserStatus.ACTIVE,
        });

        mockUser.canLogin = vi.fn().mockReturnValue(true);

        mockedJwt.verify = vi.fn().mockReturnValue(mockPayload as never);
        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);

        const result = await AuthService.refreshToken(validRefreshToken);

        expect(result.token).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.expiresIn).toBeDefined();
      });
    });
  });

  describe('Password Reset Flow', () => {
    const resetEmail = 'reset@example.com';

    describe('when requesting password reset', () => {
      it('should create password reset token for existing user', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: resetEmail.toLowerCase(),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        const resetRequest: PasswordResetRequest = { email: resetEmail };

        await authService.requestPasswordReset(resetRequest);

        expect(mockUser.resetToken).toBeDefined();
        expect(mockUser.resetTokenExpiration).toBeInstanceOf(Date);
        expect(mockUser.save).toHaveBeenCalled();
      });

      it('should set reset token expiration to 1 hour', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: resetEmail.toLowerCase(),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        const resetRequest: PasswordResetRequest = { email: resetEmail };

        const beforeTime = Date.now();
        await authService.requestPasswordReset(resetRequest);
        const afterTime = Date.now();

        const expectedExpiration = beforeTime + 60 * 60 * 1000;
        const actualExpiration = mockUser.resetTokenExpiration?.getTime() ?? 0;

        expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration);
        expect(actualExpiration).toBeLessThanOrEqual(afterTime + 60 * 60 * 1000);
      });

      it('should not reveal if email does not exist', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();
        const resetRequest: PasswordResetRequest = { email: 'nonexistent@example.com' };

        const result = await authService.requestPasswordReset(resetRequest);

        expect(result.message).toBe('If the email exists, a reset link has been sent');
      });

      it('should log password reset request in audit log', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: resetEmail.toLowerCase(),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        const resetRequest: PasswordResetRequest = { email: resetEmail };

        await authService.requestPasswordReset(resetRequest);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'PASSWORD_RESET_REQUEST',
            entity: 'User',
            entityId: mockUser.userId,
          })
        );
      });

      it('should handle email case insensitively', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: resetEmail.toLowerCase(),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        const resetRequest: PasswordResetRequest = { email: resetEmail.toUpperCase() };

        await authService.requestPasswordReset(resetRequest);

        expect(MockedUser.findOne).toHaveBeenCalledWith({
          where: { email: resetEmail.toLowerCase() },
        });
      });
    });

    describe('when confirming password reset', () => {
      const resetToken = 'valid-reset-token';
      const newPassword = 'NewSecurePass456!';

      it('should successfully reset password with valid token', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: resetEmail.toLowerCase(),
          resetToken,
          resetTokenExpiration: new Date(Date.now() + 3600000),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        const confirmData: PasswordResetConfirm = { token: resetToken, newPassword };

        const result = await authService.confirmPasswordReset(confirmData);

        expect(mockUser.password).toBe(newPassword);
        expect(mockUser.resetToken).toBe(null);
        expect(mockUser.resetTokenExpiration).toBe(null);
        expect(mockUser.resetTokenForceFlag).toBe(false);
        expect(mockUser.save).toHaveBeenCalled();
        expect(result.message).toBe('Password reset successfully');
      });

      it('should reject reset with invalid token', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();
        const confirmData: PasswordResetConfirm = { token: 'invalid-token', newPassword };

        await expect(authService.confirmPasswordReset(confirmData)).rejects.toThrow(
          'Invalid or expired reset token'
        );
      });

      it('should reject reset with expired token', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();
        const confirmData: PasswordResetConfirm = { token: resetToken, newPassword };

        await expect(authService.confirmPasswordReset(confirmData)).rejects.toThrow(
          'Invalid or expired reset token'
        );
      });

      it('should log password reset in audit log', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: resetEmail.toLowerCase(),
          resetToken,
          resetTokenExpiration: new Date(Date.now() + 3600000),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        const confirmData: PasswordResetConfirm = { token: resetToken, newPassword };

        await authService.confirmPasswordReset(confirmData);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'PASSWORD_RESET',
            entity: 'User',
            entityId: mockUser.userId,
          })
        );
      });

      it('should clear reset token force flag', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: resetEmail.toLowerCase(),
          resetToken,
          resetTokenExpiration: new Date(Date.now() + 3600000),
          resetTokenForceFlag: true,
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        const confirmData: PasswordResetConfirm = { token: resetToken, newPassword };

        await authService.confirmPasswordReset(confirmData);

        expect(mockUser.resetTokenForceFlag).toBe(false);
      });

      it('should find user by token and expiration correctly', async () => {
        const mockUser = createMockUser({
          userId: 'user-123',
          email: resetEmail.toLowerCase(),
          resetToken,
          resetTokenExpiration: new Date(Date.now() + 3600000),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as never);

        const authService = new AuthService();
        const confirmData: PasswordResetConfirm = { token: resetToken, newPassword };

        await authService.confirmPasswordReset(confirmData);

        expect(MockedUser.findOne).toHaveBeenCalledWith({
          where: {
            resetToken,
            resetTokenExpiration: {
              [Op.gt]: expect.any(Date),
            },
          },
        });
      });
    });
  });

  describe('Logout and Token Invalidation', () => {
    describe('when logging out', () => {
      it('should handle logout without refresh token', async () => {
        await expect(AuthService.logout()).resolves.not.toThrow();
      });

      it('should handle logout with refresh token', async () => {
        const refreshToken = 'valid.refresh.token';

        await expect(AuthService.logout(refreshToken)).resolves.not.toThrow();
      });

      it('should log logout event when refresh token provided', async () => {
        const refreshToken = 'valid.refresh.token.with.sufficient.length';
        const { logger } = await import('../../utils/logger');
        const loggerSpy = vi.spyOn(logger, 'info');

        await AuthService.logout(refreshToken);

        expect(loggerSpy).toHaveBeenCalledWith(
          'User logout requested',
          expect.objectContaining({
            refreshToken: expect.stringContaining('...'),
          })
        );

        loggerSpy.mockRestore();
      });

      it('should handle logout with empty refresh token', async () => {
        await expect(AuthService.logout('')).resolves.not.toThrow();
      });

      it('should handle logout with undefined refresh token', async () => {
        await expect(AuthService.logout(undefined)).resolves.not.toThrow();
      });
    });
  });

  describe('Complete Authentication Workflows', () => {
    describe('full user journey from registration to login', () => {
      it('should complete registration, verification, and login flow', async () => {
        const registerData: RegisterData = {
          email: 'journey@example.com',
          password: validPassword,
          firstName: 'Journey',
          lastName: 'User',
          userType: UserType.ADOPTER,
        };

        // Step 1: Register
        const mockUserAfterRegister = createMockUser({
          userId: 'journey-user-123',
          email: registerData.email.toLowerCase(),
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
          verificationToken: 'verification-token-123',
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(mockUserAfterRegister as never);

        const registerResult = await AuthService.register(registerData);

        expect(registerResult.user).toBeDefined();
        expect(registerResult.token).toBeDefined();

        // Step 2: Verify Email
        const mockUserAfterVerification = createMockUser({
          ...mockUserAfterRegister,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          verificationToken: null,
          verificationTokenExpiresAt: null,
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUserAfterVerification as never);

        const authService = new AuthService();
        await authService.verifyEmail('verification-token-123');

        expect(mockUserAfterVerification.emailVerified).toBe(true);
        expect(mockUserAfterVerification.status).toBe(UserStatus.ACTIVE);

        // Step 3: Login
        const mockUserForLogin = createMockUser({
          ...mockUserAfterVerification,
          password: hashedPassword,
        });

        setupLoginMocks(mockUserForLogin);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        const loginCredentials: LoginCredentials = {
          email: registerData.email,
          password: registerData.password,
        };

        const loginResult = await AuthService.login(loginCredentials);

        expect(loginResult.user).toBeDefined();
        expect(loginResult.token).toBeDefined();
        expect(loginResult.refreshToken).toBeDefined();
      });
    });

    describe('password reset and subsequent login', () => {
      it('should complete password reset and login with new password', async () => {
        const email = 'resetflow@example.com';
        const oldPassword = validPassword;
        const newPassword = 'NewSecurePass789!';

        // Step 1: Request password reset
        const mockUserBeforeReset = createMockUser({
          userId: 'reset-user-123',
          email: email.toLowerCase(),
          password: hashedPassword,
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUserBeforeReset as never);

        const authService = new AuthService();
        await authService.requestPasswordReset({ email });

        expect(mockUserBeforeReset.resetToken).toBeDefined();

        // Step 2: Confirm password reset
        const resetToken = mockUserBeforeReset.resetToken ?? 'mock-reset-token';
        const mockUserWithResetToken = createMockUser({
          ...mockUserBeforeReset,
          resetToken,
          resetTokenExpiration: new Date(Date.now() + 3600000),
        });

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUserWithResetToken as never);

        await authService.confirmPasswordReset({ token: resetToken, newPassword });

        expect(mockUserWithResetToken.password).toBe(newPassword);
        expect(mockUserWithResetToken.resetToken).toBe(null);

        // Step 3: Login with new password
        const mockUserForLogin = createMockUser({
          ...mockUserWithResetToken,
          password: `hashed_${newPassword}`,
          emailVerified: true,
          status: UserStatus.ACTIVE,
        });

        setupLoginMocks(mockUserForLogin);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        const loginResult = await AuthService.login({ email, password: newPassword });

        expect(loginResult.user).toBeDefined();
        expect(loginResult.token).toBeDefined();
      });
    });

    describe('token refresh and continued session', () => {
      it('should maintain session through token refresh', async () => {
        const email = 'session@example.com';

        // Step 1: Initial login
        const mockUser = createMockUser({
          userId: 'session-user-123',
          email: email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          status: UserStatus.ACTIVE,
        });

        setupLoginMocks(mockUser);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        const loginResult = await AuthService.login({ email, password: validPassword });

        expect(loginResult.token).toBeDefined();
        expect(loginResult.refreshToken).toBeDefined();

        // Step 2: Refresh token
        const refreshToken = loginResult.refreshToken;
        const mockPayload = {
          userId: mockUser.userId,
          tokenId: 'token-123',
        };

        mockUser.canLogin = vi.fn().mockReturnValue(true);

        mockedJwt.verify = vi.fn().mockReturnValue(mockPayload as never);
        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);

        const refreshResult = await AuthService.refreshToken(refreshToken);

        expect(refreshResult.token).toBeDefined();
        expect(refreshResult.refreshToken).toBeDefined();
        expect(refreshResult.user).toBeDefined();

        // Step 3: Logout
        await expect(AuthService.logout(refreshResult.refreshToken)).resolves.not.toThrow();
      });
    });
  });
});

// Helper function to create mock user
function createMockUser(overrides: Partial<User> = {}): vi.Mocked<User> {
  const defaultUser = {
    userId: 'mock-user-123',
    email: 'mock@example.com',
    firstName: 'Mock',
    lastName: 'User',
    password: 'hashed_password',
    emailVerified: true,
    verificationToken: null,
    verificationTokenExpiresAt: null,
    resetToken: null,
    resetTokenExpiration: null,
    resetTokenForceFlag: false,
    phoneNumber: null,
    phoneVerified: false,
    dateOfBirth: null,
    profileImageUrl: null,
    bio: null,
    status: UserStatus.ACTIVE,
    userType: UserType.ADOPTER,
    lastLoginAt: null,
    loginAttempts: 0,
    lockedUntil: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    backupCodes: null,
    timezone: 'UTC',
    language: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    country: 'US',
    city: 'Test City',
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    location: { type: 'Point', coordinates: [0, 0] },
    rescueId: null,
    privacySettings: {},
    notificationPreferences: {},
    termsAcceptedAt: null,
    privacyPolicyAcceptedAt: null,
    applicationDefaults: null,
    applicationPreferences: {},
    profileCompletionStatus: {},
    applicationTemplateVersion: 1,
    Roles: [],
    isAccountLocked: vi.fn().mockReturnValue(false),
    getFullName: vi.fn().mockReturnValue('Mock User'),
    isEmailVerified: vi.fn().mockReturnValue(true),
    comparePassword: vi.fn().mockResolvedValue(true),
    canLogin: vi.fn().mockReturnValue(true),
    toJSON: vi.fn().mockReturnValue({
      userId: overrides.userId ?? 'mock-user-123',
      email: overrides.email ?? 'mock@example.com',
      firstName: overrides.firstName ?? 'Mock',
      lastName: overrides.lastName ?? 'User',
      userType: overrides.userType ?? UserType.ADOPTER,
      status: overrides.status ?? UserStatus.ACTIVE,
      emailVerified: overrides.emailVerified ?? true,
    }),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultUser as vi.Mocked<User>;
}

// Helper function to setup login mocks
function setupLoginMocks(mockUser: vi.Mocked<User>): void {
  MockedUser.scope = vi.fn().mockReturnValue({
    findOne: vi.fn().mockResolvedValue(mockUser),
  } as never);
}
