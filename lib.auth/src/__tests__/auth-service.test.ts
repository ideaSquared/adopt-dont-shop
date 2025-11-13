import { AuthService } from '../services/auth-service';
import { apiService } from '@adopt-dont-shop/lib.api';
import { AuthResponse, LoginRequest, RegisterRequest, User, STORAGE_KEYS } from '../types';

// Mock lib.api
jest.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    fetchWithAuth: jest.fn(),
    updateConfig: jest.fn(),
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

  describe('initialization', () => {
    it('should configure API service with getAuthToken callback on construction', () => {
      // Clear previous mock calls and create new instance
      jest.clearAllMocks();

      new AuthService();

      expect(apiService.updateConfig).toHaveBeenCalledWith({
        getAuthToken: expect.any(Function),
      });
    });
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
    it('should return true if token and user exist', () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('mock-token') // getToken call
        .mockReturnValueOnce(JSON.stringify(mockUser)); // getCurrentUser call

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should return false if no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
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

  describe('setToken', () => {
    it('should set token in localStorage', () => {
      authService.setToken('new-token');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN, 'new-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN, 'new-token');
    });
  });

  describe('clearTokens', () => {
    it('should clear all tokens from localStorage', () => {
      authService.clearTokens();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
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
      expect(newToken).toBe('new-token');
    });

    it('should throw error if no refresh token available', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await expect(authService.refreshToken()).rejects.toThrow('No refresh token available');
    });
  });
});
