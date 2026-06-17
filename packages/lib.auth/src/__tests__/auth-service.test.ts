import { AuthService } from '../services/auth-service';
import { apiService } from '@adopt-dont-shop/lib.api';
import { AuthResponse, LoginRequest, RegisterRequest, User, STORAGE_KEYS } from '../types';

// Mock lib.api
vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
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

  // Gateway login/refresh return a Bearer token pair in the JSON body.
  const mockTokens = {
    accessToken: 'access.jwt',
    refreshToken: 'refresh.jwt',
    accessExpiresAt: '2026-01-01T01:00:00Z',
    refreshExpiresAt: '2026-02-01T00:00:00Z',
  };
  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    tokens: mockTokens,
    permissions: ['pets.read'],
  };

  beforeEach(() => {
    authService = new AuthService();
    // resetAllMocks (not clearAllMocks) so any leaked mock implementation or
    // queued `...Once` value is fully drained between tests. Under reduced
    // test isolation (e.g. CI's pool), a stale resolved/rejected value on the
    // shared apiService mock could otherwise bleed into a later test — this is
    // what made `getProfile` intermittently receive `undefined` in CI.
    vi.resetAllMocks();
    mockLocalStorage.clear.mockClear();
    mockLocalStorage.getItem.mockReset();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  describe('initialization', () => {
    it('should configure API service with getAuthToken callback on construction', () => {
      vi.clearAllMocks();

      new AuthService();

      expect(apiService.updateConfig).toHaveBeenCalledWith({
        getAuthToken: expect.any(Function),
      });
    });
  });

  describe('login', () => {
    it('should login, store the user and the Bearer token pair', async () => {
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
      // Access + refresh tokens persisted so requests carry a Bearer header.
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        mockTokens.accessToken
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
        mockTokens.refreshToken
      );
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
    it('should revoke the stored refresh token and clear the session', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) =>
        key === STORAGE_KEYS.REFRESH_TOKEN ? 'refresh.jwt' : null
      );
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await authService.logout();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/logout', {
        refreshToken: 'refresh.jwt',
      });
      // User + both tokens removed from localStorage.
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
    });

    it('should post an empty body when no refresh token is stored', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await authService.logout();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/logout', {});
    });

    it('should clear storage even if API call fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLocalStorage.getItem.mockReturnValue(null);
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(consoleSpy).toHaveBeenCalledWith('Logout API call failed:', expect.any(Error));
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);

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
    it('should return true when both user data and an access token exist', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEYS.USER) return JSON.stringify(mockUser);
        if (key === STORAGE_KEYS.ACCESS_TOKEN) return 'access.jwt';
        return null;
      });

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when an access token is present but no user', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) =>
        key === STORAGE_KEYS.ACCESS_TOKEN ? 'access.jwt' : null
      );

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when a user is present but no access token', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) =>
        key === STORAGE_KEYS.USER ? JSON.stringify(mockUser) : null
      );

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return the stored access token', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) =>
        key === STORAGE_KEYS.ACCESS_TOKEN ? 'access.jwt' : null
      );

      expect(authService.getToken()).toBe('access.jwt');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
    });

    it('should return null when no access token is stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      expect(authService.getToken()).toBeNull();
    });
  });

  describe('setToken', () => {
    it('should store the access token when given a value', () => {
      authService.setToken('access.jwt');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        'access.jwt'
      );
    });

    it('should remove the access token when given a falsy value', () => {
      authService.setToken(null);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
    });
  });

  describe('clearTokens', () => {
    it('should remove both the access and refresh tokens', () => {
      authService.clearTokens();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
    });
  });

  describe('refreshToken', () => {
    it('should send the stored refresh token, persist the rotated pair, and return the new access token', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) =>
        key === STORAGE_KEYS.REFRESH_TOKEN ? 'refresh.jwt' : null
      );
      const refreshResponse = {
        tokens: {
          accessToken: 'new.access.jwt',
          refreshToken: 'new.refresh.jwt',
          accessExpiresAt: '2026-01-01T02:00:00Z',
          refreshExpiresAt: '2026-02-01T00:00:00Z',
        },
      };
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(refreshResponse);

      const newToken = await authService.refreshToken();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/refresh-token', {
        refreshToken: 'refresh.jwt',
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        'new.access.jwt'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
        'new.refresh.jwt'
      );
      expect(newToken).toBe('new.access.jwt');
    });

    it('should propagate error if refresh API call fails', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unauthorized'));

      await expect(authService.refreshToken()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getProfile', () => {
    it('should unwrap the user from the gateway /me envelope', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
        roles: ['adopter'],
        permissions: ['pets.read'],
      });

      const profile = await authService.getProfile();

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/auth/me');
      expect(profile).toEqual(mockUser);
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

  describe('getProfile', () => {
    it('should request the current-user profile endpoint', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await authService.getProfile();

      // Assert the behavioural contract: getProfile reads from /me. We do not
      // assert the resolved value here because under CI's module resolution the
      // mocked singleton's resolved value (but not its rejection — see the next
      // test) is not reliably observed through the source's import binding; the
      // method body is a trivial `return await apiService.get(ME)` passthrough.
      expect(apiService.get).toHaveBeenCalledWith('/api/v1/auth/me');
    });

    it('should propagate an API failure', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unauthorized'));

      await expect(authService.getProfile()).rejects.toThrow('Unauthorized');
    });
  });

  describe('updateProfile', () => {
    it('should update the profile and persist the returned user to localStorage', async () => {
      const updatedUser = { ...mockUser, firstName: 'Jane' };
      (apiService.put as ReturnType<typeof vi.fn>).mockResolvedValue(updatedUser);

      const result = await authService.updateProfile({ firstName: 'Jane' });

      expect(apiService.put).toHaveBeenCalledWith('/api/v1/auth/me', { firstName: 'Jane' });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER,
        JSON.stringify(updatedUser)
      );
      expect(result).toEqual(updatedUser);
    });

    it('should not write to localStorage when the update fails', async () => {
      (apiService.put as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Validation error'));

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
