import { AuthService } from '../src/services/auth-service';
import { apiService } from '@adopt-dont-shop/lib.api';
import { AuthResponse, LoginRequest, RegisterRequest, User, STORAGE_KEYS } from '../src/types';

// Mock lib.api
jest.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    fetchWithAuth: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn(),
    isAuthenticated: jest.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
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

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    token: 'mock-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    accessToken: 'mock-token',
  };

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    mockLocalStorage.clear.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      (apiService.post as jest.Mock).mockResolvedValue(mockAuthResponse);

      const result = await authService.login(credentials);

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/login', credentials);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN, 'mock-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        'mock-token'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
        'mock-refresh-token'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER,
        JSON.stringify(mockUser)
      );
      expect(apiService.setToken).toHaveBeenCalledWith('mock-token');
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle login failure', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const error = new Error('Invalid credentials');
      (apiService.post as jest.Mock).mockRejectedValue(error);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(apiService.setToken).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register successfully and store tokens', async () => {
      const userData: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      (apiService.post as jest.Mock).mockResolvedValue(mockAuthResponse);

      const result = await authService.register(userData);

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/register', userData);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN, 'mock-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        'mock-token'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
        'mock-refresh-token'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER,
        JSON.stringify(mockUser)
      );
      expect(apiService.setToken).toHaveBeenCalledWith('mock-token');
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear storage', async () => {
      (apiService.post as jest.Mock).mockResolvedValue({});

      await authService.logout();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/logout');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(apiService.clearToken).toHaveBeenCalled();
    });

    it('should clear storage even if API call fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (apiService.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(consoleSpy).toHaveBeenCalledWith('Logout API call failed:', expect.any(Error));
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(apiService.clearToken).toHaveBeenCalled();

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

    it('should return null if user data is invalid JSON', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const user = authService.getCurrentUser();

      expect(user).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error parsing user data:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if API service is authenticated and user exists', () => {
      (apiService.isAuthenticated as jest.Mock).mockReturnValue(true);
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should return false if API service is not authenticated', () => {
      (apiService.isAuthenticated as jest.Mock).mockReturnValue(false);
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });

    it('should return false if no user exists', () => {
      (apiService.isAuthenticated as jest.Mock).mockReturnValue(true);
      mockLocalStorage.getItem.mockReturnValue(null);

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshResponse = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };

      mockLocalStorage.getItem.mockReturnValue('mock-refresh-token');
      (apiService.post as jest.Mock).mockResolvedValue(refreshResponse);

      const newToken = await authService.refreshToken();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/refresh-token', {
        refreshToken: 'mock-refresh-token',
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN, 'new-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN, 'new-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
        'new-refresh-token'
      );
      expect(apiService.setToken).toHaveBeenCalledWith('new-token');
      expect(newToken).toBe('new-token');
    });

    it('should throw error if no refresh token available', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await expect(authService.refreshToken()).rejects.toThrow('No refresh token available');
    });
  });

  describe('getProfile', () => {
    it('should get user profile from API', async () => {
      (apiService.get as jest.Mock).mockResolvedValue(mockUser);

      const profile = await authService.getProfile();

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/auth/me');
      expect(profile).toEqual(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile and localStorage', async () => {
      const updatedUser = { ...mockUser, firstName: 'Jane' };
      const profileData = { firstName: 'Jane' };

      (apiService.put as jest.Mock).mockResolvedValue(updatedUser);

      const result = await authService.updateProfile(profileData);

      expect(apiService.put).toHaveBeenCalledWith('/api/v1/auth/me', profileData);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER,
        JSON.stringify(updatedUser)
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      (apiService.post as jest.Mock).mockResolvedValue({});

      await authService.forgotPassword('test@example.com');

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
        email: 'test@example.com',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password with token', async () => {
      (apiService.post as jest.Mock).mockResolvedValue({});

      await authService.resetPassword('reset-token', 'new-password');

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/reset-password', {
        token: 'reset-token',
        newPassword: 'new-password',
      });
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      const data = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };

      (apiService.post as jest.Mock).mockResolvedValue({});

      await authService.changePassword(data);

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/change-password', data);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with token', async () => {
      (apiService.get as jest.Mock).mockResolvedValue({});

      await authService.verifyEmail('verify-token');

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/auth/verify-email/verify-token');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));
      (apiService.post as jest.Mock).mockResolvedValue({});

      await authService.resendVerificationEmail();

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/resend-verification', {
        email: 'test@example.com',
      });
    });

    it('should throw error if no user email found', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await expect(authService.resendVerificationEmail()).rejects.toThrow('No user email found');
    });
  });

  describe('deleteAccount', () => {
    it('should delete account and clear storage', async () => {
      (apiService.fetchWithAuth as jest.Mock).mockResolvedValue({});

      await authService.deleteAccount('reason');

      expect(apiService.fetchWithAuth).toHaveBeenCalledWith('/api/v1/users/account', {
        method: 'DELETE',
        body: { reason: 'reason' },
      });
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(apiService.setToken).toHaveBeenCalledWith('');
    });

    it('should delete account without reason', async () => {
      (apiService.fetchWithAuth as jest.Mock).mockResolvedValue({});

      await authService.deleteAccount();

      expect(apiService.fetchWithAuth).toHaveBeenCalledWith('/api/v1/users/account', {
        method: 'DELETE',
        body: undefined,
      });
    });
  });

  describe('getToken', () => {
    it('should return auth token from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValueOnce('auth-token');

      const token = authService.getToken();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(token).toBe('auth-token');
    });

    it('should fallback to access token if auth token not found', () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null).mockReturnValueOnce('access-token');

      const token = authService.getToken();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(token).toBe('access-token');
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('refresh-token');

      const token = authService.getRefreshToken();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(token).toBe('refresh-token');
    });
  });

  describe('setToken', () => {
    it('should set token in localStorage and API service', () => {
      authService.setToken('new-token');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN, 'new-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN, 'new-token');
      expect(apiService.setToken).toHaveBeenCalledWith('new-token');
    });
  });

  describe('clearTokens', () => {
    it('should clear all tokens from localStorage and API service', () => {
      authService.clearTokens();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(apiService.clearToken).toHaveBeenCalled();
    });
  });
});
