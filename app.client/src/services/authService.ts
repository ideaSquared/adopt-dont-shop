import { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types';
import { apiService } from './api';

class AuthService {
  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/api/v1/auth/login', credentials);

    // Store tokens and user data
    localStorage.setItem('authToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));

    // Set token in API service
    apiService.setToken(response.accessToken);

    return response;
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/api/v1/auth/register', userData);

    // Store tokens and user data
    localStorage.setItem('authToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));

    // Set token in API service
    apiService.setToken(response.accessToken);

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

    const response = await apiService.post<{ accessToken: string; refreshToken: string }>(
      '/api/v1/auth/refresh',
      {
        refreshToken,
      }
    );

    // Update stored tokens
    localStorage.setItem('authToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);

    // Set new token in API service
    apiService.setToken(response.accessToken);

    return response.accessToken;
  }

  // Get user profile
  async getProfile(): Promise<User> {
    return await apiService.get<User>('/api/v1/auth/profile');
  }

  // Update user profile
  async updateProfile(profileData: Partial<User>): Promise<User> {
    const updatedUser = await apiService.put<User>('/api/v1/auth/profile', profileData);

    // Update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));

    return updatedUser;
  }

  // Send password reset email
  async requestPasswordReset(email: string): Promise<void> {
    await apiService.post('/api/v1/auth/forgot-password', { email });
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiService.post('/api/v1/auth/reset-password', { token, password: newPassword });
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    await apiService.post('/api/v1/auth/verify-email', { token });
  }

  // Resend verification email
  async resendVerificationEmail(): Promise<void> {
    await apiService.post('/api/v1/auth/resend-verification');
  }

  // Change password (when logged in)
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiService.post('/api/v1/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }
}

export const authService = new AuthService();
