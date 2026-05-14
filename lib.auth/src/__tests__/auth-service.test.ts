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

// Mock sessionStorage (access tokens are stored here)
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
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
    vi.clearAllMocks();
    mockLocalStorage.clear.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockSessionStorage.clear.mockClear();
    mockSessionStorage.getItem.mockClear();
    mockSessionStorage.setItem.mockClear();
    mockSessionStorage.removeItem.mockClear();
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
    it('should login successfully and store access token in sessionStorage', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthResponse);

      const result = await authService.login(credentials);

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/login', credentials);
      // Access token stored in sessionStorage (not localStorage)
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH_TOKEN,
        'mock-token'
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        'mock-token'
      );
      // User stored in localStorage (persists across sessions)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER,
        JSON.stringify(mockUser)
      );
      // Refresh token NOT stored in localStorage (it's an httpOnly cookie)
      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith('refreshToken', expect.any(String));
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
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
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
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(result).toEqual(registerResponse);
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear sessionStorage tokens', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await authService.logout();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/logout');
      // Access tokens removed from sessionStorage
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      // User removed from localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
    });

    it('should clear storage even if API call fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(consoleSpy).toHaveBeenCalledWith('Logout API call failed:', expect.any(Error));
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
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
  });

  describe('isAuthenticated', () => {
    it('should return true if access token and user exist', () => {
      mockSessionStorage.getItem.mockReturnValueOnce('mock-token'); // getToken call
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(mockUser)); // getCurrentUser call

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should return false if no access token exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return auth token from sessionStorage', () => {
      mockSessionStorage.getItem.mockReturnValueOnce('auth-token');

      const token = authService.getToken();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(token).toBe('auth-token');
    });

    it('should fallback to access token key if auth token not found', () => {
      mockSessionStorage.getItem.mockReturnValueOnce(null).mockReturnValueOnce('access-token');

      const token = authService.getToken();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(token).toBe('access-token');
    });
  });

  describe('setToken', () => {
    it('should set token in sessionStorage', () => {
      authService.setToken('new-token');

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN, 'new-token');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        'new-token'
      );
    });
  });

  describe('clearTokens', () => {
    it('should clear access tokens from sessionStorage', () => {
      authService.clearTokens();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      // Refresh token is NOT in localStorage/sessionStorage — it's an httpOnly cookie
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token via cookie (no body token needed)', async () => {
      const refreshResponse = {
        token: 'new-token',
        // refreshToken not returned — it's set as httpOnly cookie by backend
      };

      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue(refreshResponse);

      const newToken = await authService.refreshToken();

      // Should NOT send refresh token in body — cookie is auto-sent by browser
      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/refresh-token', {});
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN, 'new-token');
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
});
