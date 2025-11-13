import { apiService } from '@adopt-dont-shop/lib.api';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  ChangePasswordRequest,
  RefreshTokenResponse,
  STORAGE_KEYS,
} from '../types';

// ✅ INDUSTRY STANDARD: Centralized API path constants
const AUTH_ENDPOINTS = {
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH: '/api/v1/auth/refresh-token',
  ME: '/api/v1/auth/me',
  CHANGE_PASSWORD: '/api/v1/auth/change-password',
  FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
  RESET_PASSWORD: '/api/v1/auth/reset-password',
  VERIFY_EMAIL: (token: string) => `/api/v1/auth/verify-email/${token}`,
  RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
} as const;

/**
 * AuthService - Authentication and user management service
 *
 * This service handles user authentication, registration, profile management,
 * and token management using lib.api as the HTTP transport layer.
 */
export class AuthService {
  constructor() {
    // Configure the API service to get auth tokens from this service
    apiService.updateConfig({
      getAuthToken: () => this.getToken(),
    });
  }

  /**
   * Login user with credentials
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, credentials);

    // Store tokens and user data (backend returns 'token', frontend expects 'accessToken')
    this.setTokens(response.token, response.refreshToken);
    this.setUser(response.user);

    return {
      ...response,
      accessToken: response.token, // Map backend 'token' to frontend 'accessToken'
    };
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(AUTH_ENDPOINTS.REGISTER, userData);

    // Store tokens and user data (backend returns 'token', frontend expects 'accessToken')
    this.setTokens(response.token, response.refreshToken);
    this.setUser(response.user);

    return {
      ...response,
      accessToken: response.token, // Map backend 'token' to frontend 'accessToken'
    };
  }

  /**
   * Logout user and clear all stored data
   */
  async logout(): Promise<void> {
    try {
      await apiService.post(AUTH_ENDPOINTS.LOGOUT);
    } catch (error) {
      // Continue with logout even if server request fails
      console.warn('Logout request failed, clearing local data anyway:', error);
    } finally {
      this.clearTokens();
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<RefreshTokenResponse>(AUTH_ENDPOINTS.REFRESH, {
      refreshToken,
    });

    // Update stored tokens
    this.setTokens(response.token, response.refreshToken);

    return response.token;
  }

  /**
   * Get user profile from API
   */
  async getProfile(): Promise<User> {
    return await apiService.get<User>(AUTH_ENDPOINTS.ME);
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: Partial<User>): Promise<User> {
    const updatedUser = await apiService.put<User>(AUTH_ENDPOINTS.ME, profileData);

    // Update localStorage
    this.setUser(updatedUser);

    return updatedUser;
  }

  /**
   * Send password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    await apiService.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiService.post(AUTH_ENDPOINTS.RESET_PASSWORD, { token, newPassword });
  }

  /**
   * Change password (when logged in)
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiService.post(AUTH_ENDPOINTS.CHANGE_PASSWORD, data);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    await apiService.get(AUTH_ENDPOINTS.VERIFY_EMAIL(token));
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(): Promise<void> {
    const user = this.getCurrentUser();
    if (!user?.email) {
      throw new Error('No user email found');
    }
    await apiService.post(AUTH_ENDPOINTS.RESEND_VERIFICATION, { email: user.email });
  }

  /**
   * Delete user account
   */
  async deleteAccount(reason?: string): Promise<void> {
    const body = reason ? { reason } : undefined;
    await apiService.fetchWithAuth('/api/v1/users/account', {
      method: 'DELETE',
      body,
    });

    this.clearStorage();
  }

  /**
   * Get stored auth token
   */
  getToken(): string | null {
    return (
      localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
      localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    );
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Set auth token in storage
   */
  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token); // For backward compatibility
  }

  /**
   * Clear all stored authentication data
   */
  clearTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  // Private helper methods
  private setTokens(token: string, refreshToken: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token); // For backward compatibility
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  private setUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  private clearStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

// Export singleton instance
export const authService = new AuthService();
