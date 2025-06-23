import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuditLog } from '../../models/AuditLog';
import User, { UserStatus, UserType } from '../../models/User';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials, RegisterData } from '../../types';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../models/AuditLog');
jest.mock('../../utils/logger');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

// Mock User model
const MockedUser = User as jest.Mocked<typeof User>;
const MockedAuditLog = AuditLog as jest.Mocked<typeof AuditLog>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock environment variables
const originalEnv = process.env;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variables for tests
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
    };

    // Mock the generateTokens method to avoid JWT secret issues
    jest.spyOn(AuthService as any, 'generateTokens').mockResolvedValue({
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
      const hashedPassword = 'hashedpassword123';
      const mockUser = {
        userId: 'user-123',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        userType: userData.userType,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        toJSON: jest.fn().mockReturnValue({
          userId: 'user-123',
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          userType: userData.userType,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
        }),
        save: jest.fn(),
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(null);
      mockedBcrypt.hash = jest.fn().mockResolvedValue(hashedPassword as never);
      MockedUser.create = jest.fn().mockResolvedValue(mockUser as any);
      mockedJwt.sign = jest.fn().mockReturnValue('access-token' as any);
      MockedAuditLog.create = jest.fn().mockResolvedValue({} as any);

      const result = await AuthService.register(userData);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: userData.email.toLowerCase() },
      });
      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phoneNumber: userData.phoneNumber,
          userType: userData.userType || UserType.ADOPTER,
          status: UserStatus.PENDING_VERIFICATION,
          verificationToken: expect.any(String),
          verificationTokenExpiresAt: expect.any(Date),
          emailVerified: false,
        })
      );
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mocked-access-token');
    });

    it('should throw error if user already exists', async () => {
      const existingUser = { userId: 'existing-user' };
      MockedUser.findOne = jest.fn().mockResolvedValue(existingUser as any);

      await expect(AuthService.register(userData)).rejects.toThrow(
        'User already exists with this email'
      );
    });

    it('should throw error for invalid password', async () => {
      const invalidUserData = { ...userData, password: 'weak' };
      MockedUser.findOne = jest.fn().mockResolvedValue(null);

      await expect(AuthService.register(invalidUserData)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });
  });

  describe('login', () => {
    const credentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      const mockUser = {
        userId: 'user-123',
        email: credentials.email,
        password: 'hashedpassword',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        twoFactorEnabled: false,
        userType: UserType.ADOPTER,
        isAccountLocked: jest.fn().mockReturnValue(false),
        isEmailVerified: jest.fn().mockReturnValue(true),
        toJSON: jest.fn().mockReturnValue({
          userId: 'user-123',
          email: credentials.email,
          userType: UserType.ADOPTER,
        }),
        save: jest.fn(),
      };

      MockedUser.scope = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(true as never);
      mockedJwt.sign = jest.fn().mockReturnValue('access-token' as any);
      MockedAuditLog.create = jest.fn().mockResolvedValue({} as any);

      const result = await AuthService.login(credentials);

      expect(MockedUser.scope).toHaveBeenCalledWith('withSecrets');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(credentials.password, mockUser.password);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mocked-access-token');
    });

    it('should throw error for invalid credentials', async () => {
      MockedUser.scope = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for wrong password', async () => {
      const mockUser = {
        userId: 'user-123',
        email: credentials.email,
        password: 'hashedpassword',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 0,
        lockedUntil: null,
        isAccountLocked: jest.fn().mockReturnValue(false),
        save: jest.fn(),
      };

      MockedUser.scope = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(false as never);

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should handle account locking after failed attempts', async () => {
      const mockUser = {
        userId: 'user-123',
        email: credentials.email,
        password: 'hashedpassword',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 4,
        lockedUntil: null,
        isAccountLocked: jest.fn().mockReturnValue(false),
        save: jest.fn(),
      };

      MockedUser.scope = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(false as never);
      MockedAuditLog.create = jest.fn().mockResolvedValue({} as any);

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');

      expect(mockUser.loginAttempts).toBe(5);
      expect(mockUser.lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        userId: 'user-123',
        tokenId: 'token-123',
      };

      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: UserType.ADOPTER,
        canLogin: jest.fn().mockReturnValue(true),
        toJSON: jest.fn().mockReturnValue({
          userId: 'user-123',
          email: 'test@example.com',
          userType: UserType.ADOPTER,
        }),
      };

      mockedJwt.verify = jest.fn().mockReturnValue(mockPayload);
      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await AuthService.refreshToken(refreshToken);

      expect(mockedJwt.verify).toHaveBeenCalledWith(refreshToken, 'test-jwt-refresh-secret');
      expect(MockedUser.findByPk).toHaveBeenCalledWith(mockPayload.userId, expect.any(Object));
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mocked-access-token');
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      mockedJwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.refreshToken(invalidToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('requestPasswordReset', () => {
    it('should create password reset request', async () => {
      const email = 'test@example.com';
      const mockUser = {
        userId: 'user-123',
        email,
        save: jest.fn(),
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(mockUser as any);

      const authService = new AuthService();
      await authService.requestPasswordReset({ email });

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should not throw error for non-existent email', async () => {
      const email = 'nonexistent@example.com';
      MockedUser.findOne = jest.fn().mockResolvedValue(null);

      const authService = new AuthService();
      await expect(authService.requestPasswordReset({ email })).resolves.not.toThrow();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'valid-verification-token';
      const mockUser = {
        userId: 'user-123',
        emailVerified: false,
        status: UserStatus.PENDING_VERIFICATION,
        verificationToken: token,
        verificationTokenExpiresAt: new Date(Date.now() + 3600000),
        save: jest.fn(),
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(mockUser as any);
      MockedAuditLog.create = jest.fn().mockResolvedValue({} as any);

      const authService = new AuthService();
      await authService.verifyEmail(token);

      expect(mockUser.emailVerified).toBe(true);
      expect(mockUser.verificationToken).toBe(null);
      expect(mockUser.status).toBe(UserStatus.ACTIVE);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';
      MockedUser.findOne = jest.fn().mockResolvedValue(null);

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
      const loggerSpy = jest.spyOn(logger, 'info');

      await AuthService.logout(refreshToken);

      expect(loggerSpy).toHaveBeenCalledWith('User logout requested', {
        refreshToken: 'some.refre...',
      });

      loggerSpy.mockRestore();
    });
  });
});
