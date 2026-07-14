import { AuthService } from '../services/auth-service';
import { apiService } from '@adopt-dont-shop/lib.api';
import { AuthResponse, LoginRequest, RegisterRequest, User, STORAGE_KEYS } from '../types';

// Mock lib.api
vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    fetchWithAuth: vi.fn(),
    updateConfig: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AuthService', () => {
  let authService: AuthService;
  const mockUser: User = {
    userId: '123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    emailVerified: true,
    userType: 'adopter',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  // ADS-919: the gateway sets the access + refresh token pair as HttpOnly
  // cookies — the JSON body no longer carries them.
  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    permissions: ['pets.read'],
  };

  // Clears the `hasSession` cookie between tests so isAuthenticated() tests
  // aren't polluted by a previous test's cookie write.
  const clearSessionCookie = () => {
    document.cookie = 'hasSession=; Max-Age=0; path=/';
  };

  beforeEach(() => {
    authService = new AuthService();
    // resetAllMocks (not just clearAllMocks) so any mock implementation or
    // queued `...Once` value set by a test is fully drained before the next,
    // keeping the shared apiService mock's behaviour isolated per test.
    vi.resetAllMocks();
    mockLocalStorage.clear.mockClear();
    mockLocalStorage.getItem.mockReset();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    clearSessionCookie();
  });

  afterEach(() => {
    clearSessionCookie();
  });

  describe('login', () => {
    it('should log in, store only the user profile, and never touch a token storage key', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthResponse);

      const result = await authService.login(credentials);

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/login', credentials);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER,
        JSON.stringify(mockUser)
      );
      // Only ever ONE localStorage write (the user profile) — the token
      // pair rides home as HttpOnly cookies, never written here.
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle login failure', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const error = new Error('Invalid credentials');
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('returns user + message and stores no auth tokens (ADS-538)', async () => {
      const userData: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const registerResponse = {
        user: mockUser,
        message: 'Registration successful. Please check your email to verify your account.',
      };
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(registerResponse);

      const result = await authService.register(userData);

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/register', userData);
      // No tokens — user must verify email + log in to get a session.
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(result).toEqual(registerResponse);
    });
  });

  describe('logout', () => {
    it('posts an empty body (the refresh token rides in its HttpOnly cookie) and clears the session', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue({});
      document.cookie = 'hasSession=1';

      await authService.logout();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/logout', {});
      // User profile removed from localStorage; the session marker cookie
      // cleared client-side (the real cookies are cleared server-side).
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(document.cookie).not.toContain('hasSession=1');
    });

    it('should clear storage even if API call fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      document.cookie = 'hasSession=1';

      await authService.logout();

      expect(consoleSpy).toHaveBeenCalledWith('Logout API call failed:', expect.any(Error));
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(document.cookie).not.toContain('hasSession=1');

      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      const user = authService.getCurrentUser();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(user).toEqual(mockUser);
    });

    it('should return null if no user in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const user = authService.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null and remove the key when stored value is not valid JSON', () => {
      mockLocalStorage.getItem.mockReturnValue('not-json{{{');

      const user = authService.getCurrentUser();

      expect(user).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
    });

    it('should return null and remove the key when stored value is missing required fields', () => {
      // Missing email, firstName, etc.
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ userId: '123' }));

      const user = authService.getCurrentUser();

      expect(user).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
    });

    it('should return null and remove the key when stored value has wrong field types', () => {
      // emailVerified should be boolean, not string
      const corrupt = { ...mockUser, emailVerified: 'yes' };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(corrupt));

      const user = authService.getCurrentUser();

      expect(user).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when both a stored user and the hasSession marker cookie are present', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));
      document.cookie = 'hasSession=1';

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('returns false when the session cookie is present but no user is stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      document.cookie = 'hasSession=1';

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('returns false when a user is stored but the session cookie is absent', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('returns false once the session cookie has been cleared, even with a stale stored user', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));
      document.cookie = 'hasSession=1';
      expect(authService.isAuthenticated()).toBe(true);

      authService.clearTokens();

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('posts an empty body (the refresh token rides in its HttpOnly cookie) and resolves on success', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      await expect(authService.refreshToken()).resolves.toBeUndefined();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/refresh-token', {});
      // Nothing to persist — the rotated pair rides home as cookies.
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should propagate error if refresh API call fails', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unauthorized'));

      await expect(authService.refreshToken()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getProfile', () => {
    it('should request the /me endpoint and resolve to the unwrapped user', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
        roles: ['adopter'],
        permissions: ['pets.read'],
      });

      const result = await authService.getProfile();

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should propagate an API failure', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unauthorized'));

      await expect(authService.getProfile()).rejects.toThrow('Unauthorized');
    });
  });

  describe('twoFactorSetup', () => {
    it('should call the 2FA setup endpoint', async () => {
      const mockResponse = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeDataUrl: 'data:image/png;base64,abc',
      };
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await authService.twoFactorSetup();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/2fa/setup');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('twoFactorEnable', () => {
    it('should enable 2FA and update local user state', async () => {
      const mockResponse = {
        success: true,
        backupCodes: ['code1', 'code2', 'code3'],
      };
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = await authService.twoFactorEnable('JBSWY3DPEHPK3PXP', '123456');

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/2fa/enable', {
        secret: 'JBSWY3DPEHPK3PXP',
        token: '123456',
      });
      expect(result).toEqual(mockResponse);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER,
        expect.stringContaining('"twoFactorEnabled":true')
      );
    });
  });

  describe('twoFactorDisable', () => {
    it('should disable 2FA and update local user state', async () => {
      const mockResponse = {
        success: true,
        message: 'Two-factor authentication has been disabled',
      };
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ ...mockUser, twoFactorEnabled: true })
      );

      const result = await authService.twoFactorDisable('123456');

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/2fa/disable', {
        token: '123456',
      });
      expect(result).toEqual(mockResponse);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER,
        expect.stringContaining('"twoFactorEnabled":false')
      );
    });
  });

  describe('twoFactorRegenerateBackupCodes', () => {
    it('should regenerate backup codes', async () => {
      const mockResponse = {
        success: true,
        backupCodes: ['new1', 'new2', 'new3'],
      };
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await authService.twoFactorRegenerateBackupCodes();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/2fa/backup-codes');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateProfile', () => {
    it('should update the profile via PATCH /users/account and persist the returned user to localStorage', async () => {
      const updatedUser = { ...mockUser, firstName: 'Jane' };
      (apiService.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ user: updatedUser });

      const result = await authService.updateProfile({ firstName: 'Jane' });

      expect(apiService.patch).toHaveBeenCalledWith('/api/v1/users/account', { firstName: 'Jane' });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER,
        JSON.stringify(updatedUser)
      );
      expect(result).toEqual(updatedUser);
    });

    it('should not write to localStorage when the update fails', async () => {
      (apiService.patch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Validation error')
      );

      await expect(authService.updateProfile({ firstName: '' })).rejects.toThrow(
        'Validation error'
      );
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should request a password reset email for the given address', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await authService.forgotPassword('test@example.com');

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
        email: 'test@example.com',
      });
    });

    it('should propagate an API failure', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Rate limited'));

      await expect(authService.forgotPassword('test@example.com')).rejects.toThrow('Rate limited');
    });
  });

  describe('resetPassword', () => {
    it('should reset the password using the supplied token', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await authService.resetPassword('reset-token', 'newPassword123');

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/reset-password', {
        token: 'reset-token',
        newPassword: 'newPassword123',
      });
    });

    it('should propagate an error when the token is invalid or expired', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid or expired token')
      );

      await expect(authService.resetPassword('bad-token', 'newPassword123')).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('changePassword', () => {
    it('should send the current and new password to the change-password endpoint', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await authService.changePassword({
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      });

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/change-password', {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      });
    });

    it('should propagate an error when the current password is wrong', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Current password is incorrect')
      );

      await expect(
        authService.changePassword({
          currentPassword: 'wrong',
          newPassword: 'newPassword123',
        })
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('verifyEmail', () => {
    it('should verify the email using the supplied token', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await authService.verifyEmail('verify-token');

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/verify-email', {
        token: 'verify-token',
      });
    });

    it('should propagate an error when the verification token is invalid', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid verification token')
      );

      await expect(authService.verifyEmail('bad-token')).rejects.toThrow(
        'Invalid verification token'
      );
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification to the current user email', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await authService.resendVerificationEmail();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/resend-verification', {
        email: mockUser.email,
      });
    });

    it('should throw and not call the API when no user is stored', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await expect(authService.resendVerificationEmail()).rejects.toThrow('No user email found');
      expect(apiService.post).not.toHaveBeenCalled();
    });
  });

  describe('twoFactorEnable without a stored user', () => {
    it('should still return the API response when no user is in localStorage', async () => {
      const mockResponse = { success: true, backupCodes: ['a', 'b'] };
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await authService.twoFactorEnable('SECRET', '123456');

      expect(result).toEqual(mockResponse);
      // No user to update, so nothing is written back to storage
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('twoFactorDisable without a stored user', () => {
    it('should still return the API response when no user is in localStorage', async () => {
      const mockResponse = { success: true, message: 'disabled' };
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await authService.twoFactorDisable('123456');

      expect(result).toEqual(mockResponse);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('should send only the password when no options are supplied and clear stored user', async () => {
      (apiService.fetchWithAuth as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await authService.deleteAccount('myPassword');

      expect(apiService.fetchWithAuth).toHaveBeenCalledWith('/api/v1/users/account', {
        method: 'DELETE',
        body: { password: 'myPassword' },
      });
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
    });

    it('should include the 2FA token and reason when provided', async () => {
      (apiService.fetchWithAuth as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await authService.deleteAccount('myPassword', {
        twoFactorToken: '654321',
        reason: 'No longer needed',
      });

      expect(apiService.fetchWithAuth).toHaveBeenCalledWith('/api/v1/users/account', {
        method: 'DELETE',
        body: {
          password: 'myPassword',
          twoFactorToken: '654321',
          reason: 'No longer needed',
        },
      });
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
    });

    it('should not clear stored user when the deletion request fails', async () => {
      (apiService.fetchWithAuth as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Incorrect password')
      );

      await expect(authService.deleteAccount('wrong')).rejects.toThrow('Incorrect password');
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
    });
  });
});
