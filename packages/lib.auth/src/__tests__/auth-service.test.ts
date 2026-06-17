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

  // Backend no longer returns refreshToken in body — it's set as httpOnly cookie
  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    token: 'mock-token',
    expiresIn: 3600,
    accessToken: 'mock-token',
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
    mockLocalStorage.getItem.mockClear();
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
    it('should login successfully, store user in localStorage, and not write tokens to JS storage', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthResponse);

      const result = await authService.login(credentials);

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/login', credentials);
      // User stored in localStorage (persists across sessions)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER,
        JSON.stringify(mockUser)
      );
      // Access token NOT stored anywhere JS-accessible — it's an httpOnly cookie
      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH_TOKEN,
        expect.any(String)
      );
      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        expect.any(String)
      );
      expect(result).toEqual({ ...mockAuthResponse, accessToken: 'mock-token' });
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
    it('should logout successfully and clear user from localStorage', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await authService.logout();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/logout');
      // User removed from localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      // Token cookies are cleared server-side — no JS-side removal needed
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
    });

    it('should clear storage even if API call fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(consoleSpy).toHaveBeenCalledWith('Logout API call failed:', expect.any(Error));
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);

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
    it('should return true when user data exists in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(mockUser));

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should return false when no user data in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return null — access token lives in httpOnly cookie, not JS storage', () => {
      const token = authService.getToken();

      expect(token).toBeNull();
    });
  });

  describe('setToken', () => {
    it('should be a no-op — token is managed as httpOnly cookie by the backend', () => {
      authService.setToken('some-token');

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('clearTokens', () => {
    it('should be a no-op — token cookies are cleared by the backend logout endpoint', () => {
      authService.clearTokens();

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token via cookie and return the new token value', async () => {
      const refreshResponse = {
        token: 'new-token',
        // refreshToken not returned — it's set as httpOnly cookie by backend
      };

      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(refreshResponse);

      const newToken = await authService.refreshToken();

      // Should NOT send refresh token in body — cookie is auto-sent by browser
      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/refresh-token', {});
      // No token stored in JS-accessible storage
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(newToken).toBe('new-token');
    });

    it('should propagate error if refresh API call fails', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unauthorized'));

      await expect(authService.refreshToken()).rejects.toThrow('Unauthorized');
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
    it('should fetch the current user profile from the API', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await authService.getProfile();

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/auth/me');
      expect(result).toEqual(mockUser);
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
