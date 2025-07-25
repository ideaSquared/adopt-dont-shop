import { BaseApiService } from './baseService';
import type {
  LoginRequest,
  LoginResponse,
  User,
  RefreshTokenRequest,
  ChangePasswordRequest,
} from '@/types';

/**
 * Authentication service for handling user authentication and session management
 * Uses fetch API for consistency with app.client
 */
export class AuthService extends BaseApiService {
  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.fetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: credentials,
    });

    // Store authentication data
    if (response.token) {
      this.setAuthToken(response.token);
      if (response.user) {
        localStorage.setItem('rescue_user', JSON.stringify(response.user));
      }
    }

    return response;
  }

  /**
   * Log out the current user
   */
  async logout(): Promise<void> {
    try {
      // Attempt to notify the server about logout
      await this.fetchWithAuth('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Even if server request fails, clear local authentication data
      console.warn('Logout request failed, clearing local data:', error);
    } finally {
      // Always clear local authentication data
      this.clearAuthToken();
    }
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const request: RefreshTokenRequest = { refreshToken };

    const response = await this.fetch<LoginResponse>('/api/auth/refresh', {
      method: 'POST',
      body: request,
    });

    // Update stored authentication data
    if (response.token) {
      this.setAuthToken(response.token);
      if (response.user) {
        localStorage.setItem('rescue_user', JSON.stringify(response.user));
      }
    }

    return response;
  }

  /**
   * Get the current user profile
   */
  async getCurrentUser(): Promise<User> {
    return this.get<User>('/api/auth/me');
  }

  /**
   * Update the current user's profile
   */
  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await this.put<User>('/api/auth/profile', userData);

    // Update stored user data
    localStorage.setItem('rescue_user', JSON.stringify(response));

    return response;
  }

  /**
   * Change the current user's password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    await this.put('/api/auth/password', passwordData);
  }

  /**
   * Request a password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    await this.fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }

  /**
   * Reset password using a reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password: newPassword },
    });
  }

  /**
   * Verify email address using a verification token
   */
  async verifyEmail(token: string): Promise<void> {
    await this.fetch('/api/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<void> {
    await this.fetchWithAuth('/api/auth/resend-verification', {
      method: 'POST',
    });
  }

  /**
   * Check if the current session is valid
   */
  async validateSession(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      this.clearAuthToken();
      return false;
    }
  }

  /**
   * Get stored user data from localStorage
   */
  getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem('rescue_user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

// Export singleton instance
export const authService = new AuthService();
