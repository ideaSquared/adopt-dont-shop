import { AuthResponse, LoginRequest, User, Role } from '@/types';
import { apiService } from './api';

class AuthService {
  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // eslint-disable-next-line no-console
    console.log('🔐 AuthService: Attempting login for:', credentials.email);
    // eslint-disable-next-line no-console
    console.log('🔐 AuthService: Making request to /api/v1/auth/login');

    const response = await apiService.post<AuthResponse>('/api/v1/auth/login', credentials);

    // Store tokens and user data (backend returns 'token', frontend expects 'accessToken')
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('accessToken', response.token); // Keep both for compatibility
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));

    // Set token in API service
    apiService.setToken(response.token);

    return {
      ...response,
      accessToken: response.token, // Map backend 'token' to frontend 'accessToken'
    };
  }

  // Register new user (if needed, add RegisterRequest interface to types)
  async register(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/api/v1/auth/register', userData);

    // Store tokens and user data (backend returns 'token', frontend expects 'accessToken')
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('accessToken', response.token); // Keep both for compatibility
    // Handle refresh token if present
    if ('refreshToken' in response) {
      localStorage.setItem(
        'refreshToken',
        (response as unknown as { refreshToken: string }).refreshToken
      );
    }
    localStorage.setItem('user', JSON.stringify(response.user));

    // Set token in API service
    apiService.setToken(response.token);

    return response;
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await apiService.post('/api/v1/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      // Clear token from API service
      apiService.clearToken();
    }
  }

  // Get current user from localStorage
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return apiService.isAuthenticated() && !!this.getCurrentUser();
  }

  // Refresh access token
  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<{ token: string; refreshToken: string }>(
      '/api/v1/auth/refresh-token',
      {
        refreshToken,
      }
    );

    // Update stored tokens
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('accessToken', response.token); // Keep both for compatibility
    localStorage.setItem('refreshToken', response.refreshToken);

    // Set token in API service
    apiService.setToken(response.token);

    return response.token;
  }

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiService.patch<User>('/api/v1/users/profile', userData);

    // Update stored user data
    localStorage.setItem('user', JSON.stringify(response));

    return response;
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiService.post('/api/v1/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    await apiService.post('/api/v1/auth/verify-email', { token });
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    await apiService.post('/api/v1/auth/request-password-reset', { email });
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiService.post('/api/v1/auth/reset-password', {
      token,
      newPassword,
    });
  }

  // Development helper
  async loginWithDevToken(
    userType: 'adopter' | 'rescue_staff' | 'admin' = 'adopter'
  ): Promise<void> {
    if (!import.meta.env.DEV) {
      throw new Error('Dev token login is only available in development mode');
    }

    const devToken = `dev-token-${userType}`;
    const mockUser: User = {
      user_id: `dev-user-${userType}`,
      email: `${userType}@dev.local`,
      first_name: 'Dev',
      last_name: 'User',
      role: userType === 'rescue_staff' ? Role.RESCUE_STAFF : Role.RESCUE_ADMIN,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Store dev tokens and user data
    localStorage.setItem('authToken', devToken);
    localStorage.setItem('accessToken', devToken);
    localStorage.setItem('refreshToken', `${devToken}-refresh`);
    localStorage.setItem('user', JSON.stringify(mockUser));

    // Set token in API service
    apiService.setToken(devToken);

    // eslint-disable-next-line no-console
    console.log(`🛠️ Logged in with dev token as ${userType}`);
  }

  // Clear dev tokens
  clearDevTokens(): void {
    if (import.meta.env.DEV) {
      this.logout();
    }
  }
}

export const authService = new AuthService();
