import { vi } from 'vitest';
import { Response } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import AuthService from '../../services/auth.service';
import User from '../../models/User';
import { AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';

vi.mock('../../services/auth.service');
vi.mock('../../models/User');
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const MockedAuthService = AuthService as vi.Mocked<typeof AuthService>;
const MockedUser = User as vi.Mocked<typeof User>;

type MockUser = {
  userId: string;
  email: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  backupCodes: string[] | null;
  save: ReturnType<typeof vi.fn>;
};

const createMockDbUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  userId: 'user-123',
  email: 'test@example.com',
  twoFactorEnabled: false,
  twoFactorSecret: null,
  backupCodes: null,
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createAuthenticatedUser = (overrides: Partial<AuthenticatedRequest['user']> = {}) => ({
  userId: 'user-123',
  email: 'test@example.com',
  twoFactorEnabled: false,
  firstName: 'Test',
  lastName: 'User',
  ...overrides,
});

describe('AuthController - Two-Factor Authentication', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: createAuthenticatedUser() as AuthenticatedRequest['user'],
      body: {},
      params: {},
    };

    res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };

    controller = new AuthController();
  });

  // ==========================================================================
  // twoFactorSetup
  // ==========================================================================

  describe('twoFactorSetup', () => {
    it('should return secret and QR code data URL for a user without 2FA enabled', async () => {
      // Given: User without 2FA enabled
      req.user = createAuthenticatedUser({ twoFactorEnabled: false }) as AuthenticatedRequest['user'];
      MockedAuthService.generateTwoFactorSecret = vi.fn().mockReturnValue({
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/Adopt%20Don%27t%20Shop%20(test%40example.com)?secret=JBSWY3DPEHPK3PXP',
      });
      MockedAuthService.generateQrCodeDataUrl = vi.fn().mockResolvedValue('data:image/png;base64,abc123');

      // When: Calling twoFactorSetup
      await controller.twoFactorSetup(req as AuthenticatedRequest, res as Response);

      // Then: Returns secret and QR code
      expect(res.json).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeDataUrl: 'data:image/png;base64,abc123',
      });
      expect(MockedAuthService.generateTwoFactorSecret).toHaveBeenCalledWith('test@example.com');
    });

    it('should reject setup when 2FA is already enabled', async () => {
      // Given: User with 2FA already enabled
      req.user = createAuthenticatedUser({ twoFactorEnabled: true }) as AuthenticatedRequest['user'];

      // When: Calling twoFactorSetup
      await controller.twoFactorSetup(req as AuthenticatedRequest, res as Response);

      // Then: Returns 400 error
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Two-factor authentication is already enabled' });
      expect(MockedAuthService.generateTwoFactorSecret).not.toHaveBeenCalled();
    });

    it('should return 500 when QR code generation fails', async () => {
      // Given: QR code generation throws
      req.user = createAuthenticatedUser({ twoFactorEnabled: false }) as AuthenticatedRequest['user'];
      MockedAuthService.generateTwoFactorSecret = vi.fn().mockReturnValue({
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://...',
      });
      MockedAuthService.generateQrCodeDataUrl = vi.fn().mockRejectedValue(new Error('QR generation failed'));

      // When: Calling twoFactorSetup
      await controller.twoFactorSetup(req as AuthenticatedRequest, res as Response);

      // Then: Returns 500 error
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to set up two-factor authentication' });
    });
  });

  // ==========================================================================
  // twoFactorEnable
  // ==========================================================================

  describe('twoFactorEnable', () => {
    it('should enable 2FA and return backup codes when setup token is valid', async () => {
      // Given: Valid secret and token
      req.body = { secret: 'JBSWY3DPEHPK3PXP', token: '123456' };
      MockedAuthService.enableTwoFactor = vi.fn().mockResolvedValue({
        backupCodes: ['abc1', 'abc2', 'abc3', 'abc4', 'abc5', 'abc6', 'abc7', 'abc8', 'abc9', 'abc0'],
      });

      // When: Calling twoFactorEnable
      await controller.twoFactorEnable(req as AuthenticatedRequest, res as Response);

      // Then: Returns success with backup codes
      expect(MockedAuthService.enableTwoFactor).toHaveBeenCalledWith('user-123', 'JBSWY3DPEHPK3PXP', '123456');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        backupCodes: expect.arrayContaining(['abc1']),
      });
    });

    it('should return 400 when setup token is invalid', async () => {
      // Given: Invalid verification code
      req.body = { secret: 'JBSWY3DPEHPK3PXP', token: 'wrong' };
      MockedAuthService.enableTwoFactor = vi.fn().mockRejectedValue(
        new Error('Invalid verification code. Please try again.')
      );

      // When: Calling twoFactorEnable
      await controller.twoFactorEnable(req as AuthenticatedRequest, res as Response);

      // Then: Returns 400 with descriptive error
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid verification code. Please try again.' });
    });

    it('should return 500 on unexpected errors', async () => {
      // Given: Unexpected DB error
      req.body = { secret: 'JBSWY3DPEHPK3PXP', token: '123456' };
      MockedAuthService.enableTwoFactor = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      // When: Calling twoFactorEnable
      await controller.twoFactorEnable(req as AuthenticatedRequest, res as Response);

      // Then: Returns 500 with generic error
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to enable two-factor authentication' });
    });
  });

  // ==========================================================================
  // twoFactorDisable
  // ==========================================================================

  describe('twoFactorDisable', () => {
    it('should disable 2FA when valid TOTP token provided', async () => {
      // Given: User with 2FA enabled and valid token
      req.user = createAuthenticatedUser({ twoFactorEnabled: true }) as AuthenticatedRequest['user'];
      req.body = { token: '123456' };

      const userWithSecret = createMockDbUser({ twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP' });
      MockedUser.scope = vi.fn().mockReturnValue({ findByPk: vi.fn().mockResolvedValue(userWithSecret) });
      MockedAuthService.verifyTwoFactorSetupToken = vi.fn().mockReturnValue(true);
      MockedAuthService.disableTwoFactor = vi.fn().mockResolvedValue(undefined);

      // When: Calling twoFactorDisable
      await controller.twoFactorDisable(req as AuthenticatedRequest, res as Response);

      // Then: Disables 2FA and returns success
      expect(MockedAuthService.verifyTwoFactorSetupToken).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP', '123456');
      expect(MockedAuthService.disableTwoFactor).toHaveBeenCalledWith('user-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Two-factor authentication has been disabled',
      });
    });

    it('should return 400 when 2FA is not enabled', async () => {
      // Given: User without 2FA enabled
      req.user = createAuthenticatedUser({ twoFactorEnabled: false }) as AuthenticatedRequest['user'];
      req.body = { token: '123456' };

      // When: Calling twoFactorDisable
      await controller.twoFactorDisable(req as AuthenticatedRequest, res as Response);

      // Then: Returns 400 error
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Two-factor authentication is not enabled' });
      expect(MockedAuthService.disableTwoFactor).not.toHaveBeenCalled();
    });

    it('should return 400 when user secret is missing from database', async () => {
      // Given: User object says 2FA is enabled but secret is missing in DB
      req.user = createAuthenticatedUser({ twoFactorEnabled: true }) as AuthenticatedRequest['user'];
      req.body = { token: '123456' };

      MockedUser.scope = vi.fn().mockReturnValue({ findByPk: vi.fn().mockResolvedValue(null) });

      // When: Calling twoFactorDisable
      await controller.twoFactorDisable(req as AuthenticatedRequest, res as Response);

      // Then: Returns 400 error
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Two-factor authentication secret not found' });
    });

    it('should return 400 when TOTP token is invalid', async () => {
      // Given: Invalid TOTP token
      req.user = createAuthenticatedUser({ twoFactorEnabled: true }) as AuthenticatedRequest['user'];
      req.body = { token: 'wrong' };

      const userWithSecret = createMockDbUser({ twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP' });
      MockedUser.scope = vi.fn().mockReturnValue({ findByPk: vi.fn().mockResolvedValue(userWithSecret) });
      MockedAuthService.verifyTwoFactorSetupToken = vi.fn().mockReturnValue(false);

      // When: Calling twoFactorDisable
      await controller.twoFactorDisable(req as AuthenticatedRequest, res as Response);

      // Then: Returns 400 error
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid verification code' });
      expect(MockedAuthService.disableTwoFactor).not.toHaveBeenCalled();
    });

    it('should return 500 on unexpected errors', async () => {
      // Given: DB lookup throws
      req.user = createAuthenticatedUser({ twoFactorEnabled: true }) as AuthenticatedRequest['user'];
      req.body = { token: '123456' };

      MockedUser.scope = vi.fn().mockReturnValue({
        findByPk: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      // When: Calling twoFactorDisable
      await controller.twoFactorDisable(req as AuthenticatedRequest, res as Response);

      // Then: Returns 500 error
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to disable two-factor authentication' });
    });
  });

  // ==========================================================================
  // twoFactorRegenerateBackupCodes
  // ==========================================================================

  describe('twoFactorRegenerateBackupCodes', () => {
    it('should regenerate and return new backup codes when 2FA is enabled', async () => {
      // Given: User with 2FA enabled
      req.user = createAuthenticatedUser({ twoFactorEnabled: true }) as AuthenticatedRequest['user'];
      const newCodes = ['new1', 'new2', 'new3', 'new4', 'new5', 'new6', 'new7', 'new8', 'new9', 'new0'];
      MockedAuthService.generateBackupCodes = vi.fn().mockReturnValue(newCodes);

      const dbUser = createMockDbUser({ twoFactorEnabled: true });
      MockedUser.findByPk = vi.fn().mockResolvedValue(dbUser);

      // When: Calling twoFactorRegenerateBackupCodes
      await controller.twoFactorRegenerateBackupCodes(req as AuthenticatedRequest, res as Response);

      // Then: Saves new codes and returns them
      expect(MockedAuthService.generateBackupCodes).toHaveBeenCalled();
      expect(dbUser.backupCodes).toEqual(newCodes);
      expect(dbUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, backupCodes: newCodes });
    });

    it('should return 400 when 2FA is not enabled', async () => {
      // Given: User without 2FA enabled
      req.user = createAuthenticatedUser({ twoFactorEnabled: false }) as AuthenticatedRequest['user'];

      // When: Calling twoFactorRegenerateBackupCodes
      await controller.twoFactorRegenerateBackupCodes(req as AuthenticatedRequest, res as Response);

      // Then: Returns 400 error without generating codes
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Two-factor authentication is not enabled' });
      expect(MockedAuthService.generateBackupCodes).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found in database', async () => {
      // Given: User not found in DB
      req.user = createAuthenticatedUser({ twoFactorEnabled: true }) as AuthenticatedRequest['user'];
      MockedAuthService.generateBackupCodes = vi.fn().mockReturnValue(['code1']);
      MockedUser.findByPk = vi.fn().mockResolvedValue(null);

      // When: Calling twoFactorRegenerateBackupCodes
      await controller.twoFactorRegenerateBackupCodes(req as AuthenticatedRequest, res as Response);

      // Then: Returns 404 error
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 500 on unexpected errors', async () => {
      // Given: DB lookup throws
      req.user = createAuthenticatedUser({ twoFactorEnabled: true }) as AuthenticatedRequest['user'];
      MockedAuthService.generateBackupCodes = vi.fn().mockReturnValue(['code1']);
      MockedUser.findByPk = vi.fn().mockRejectedValue(new Error('Database error'));

      // When: Calling twoFactorRegenerateBackupCodes
      await controller.twoFactorRegenerateBackupCodes(req as AuthenticatedRequest, res as Response);

      // Then: Returns 500 error
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to regenerate backup codes' });
    });
  });
});
