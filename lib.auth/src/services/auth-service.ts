import { apiService } from '@adopt-dont-shop/lib.api';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  ChangePasswordRequest,
  RefreshTokenResponse,
  TwoFactorSetupResponse,
  TwoFactorEnableResponse,
  TwoFactorDisableResponse,
  TwoFactorBackupCodesResponse,
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
  VERIFY_EMAIL: '/api/v1/auth/verify-email',
  RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
  TWO_FACTOR_SETUP: '/api/v1/auth/2fa/setup',
  TWO_FACTOR_ENABLE: '/api/v1/auth/2fa/enable',
  TWO_FACTOR_DISABLE: '/api/v1/auth/2fa/disable',
  TWO_FACTOR_BACKUP_CODES: '/api/v1/auth/2fa/backup-codes',
} as const;

/**
 * AuthService - Authentication and user management service
 *
 * Access tokens are stored in httpOnly cookies (managed by the backend,
 * not accessible to JavaScript — XSS-safe). Refresh tokens use a separate
 * httpOnly cookie. All authenticated requests rely on the browser sending
 * these cookies automatically via `credentials: 'include'`.
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

    // Access token is set as httpOnly cookie by the backend; refresh token likewise.
    this.setUser(response.user);

    return {
      ...response,
      accessToken: response.token, // Map backend 'token' to frontend 'accessToken'
    };
  }

  /**
   * Register a new user.
   *
   * ADS-538: the backend no longer issues tokens on `/register`. The user
   * must verify their email and log in normally before they have a
   * session. This method therefore returns just the user record and a
   * server-supplied message — clients should route to a
   * "check your email" screen rather than treating the response as a
   * successful login.
   */
  async register(userData: RegisterRequest): Promise<{ user: User; message: string }> {
    return apiService.post<{ user: User; message: string }>(AUTH_ENDPOINTS.REGISTER, userData);
  }

  /**
   * Logout user and clear all stored data
   */
  async logout(): Promise<void> {
    try {
      await apiService.post(AUTH_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout API call failed:', error);
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
    if (!userStr) {
      return null;
    }

    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated (user data present in localStorage).
   * The access token lives in an httpOnly cookie so cannot be read from JS;
   * user presence is the local indicator of an active session.
   */
  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  /**
   * Refresh access token — refresh token and new access token are both set
   * as httpOnly cookies by the backend; no JS-side storage needed.
   */
  async refreshToken(): Promise<string> {
    const response = await apiService.post<RefreshTokenResponse>(AUTH_ENDPOINTS.REFRESH, {});
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
    await apiService.post(AUTH_ENDPOINTS.VERIFY_EMAIL, { token });
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
   * Start 2FA setup - get secret and QR code
   */
  async twoFactorSetup(): Promise<TwoFactorSetupResponse> {
    return apiService.post<TwoFactorSetupResponse>(AUTH_ENDPOINTS.TWO_FACTOR_SETUP);
  }

  /**
   * Enable 2FA after verifying setup token
   */
  async twoFactorEnable(secret: string, token: string): Promise<TwoFactorEnableResponse> {
    const response = await apiService.post<TwoFactorEnableResponse>(
      AUTH_ENDPOINTS.TWO_FACTOR_ENABLE,
      { secret, token }
    );

    // Update local user state
    const user = this.getCurrentUser();
    if (user) {
      this.setUser({ ...user, twoFactorEnabled: true });
    }

    return response;
  }

  /**
   * Disable 2FA
   */
  async twoFactorDisable(token: string): Promise<TwoFactorDisableResponse> {
    const response = await apiService.post<TwoFactorDisableResponse>(
      AUTH_ENDPOINTS.TWO_FACTOR_DISABLE,
      { token }
    );

    // Update local user state
    const user = this.getCurrentUser();
    if (user) {
      this.setUser({ ...user, twoFactorEnabled: false });
    }

    return response;
  }

  /**
   * Regenerate backup codes
   */
  async twoFactorRegenerateBackupCodes(): Promise<TwoFactorBackupCodesResponse> {
    return apiService.post<TwoFactorBackupCodesResponse>(AUTH_ENDPOINTS.TWO_FACTOR_BACKUP_CODES);
  }

  /**
   * Delete user account.
   *
   * ADS-592: backend requires step-up auth — caller must supply current
   * password (and TOTP code if 2FA is enabled).
   */
  async deleteAccount(
    password: string,
    options?: { twoFactorToken?: string; reason?: string }
  ): Promise<void> {
    await apiService.fetchWithAuth('/api/v1/users/account', {
      method: 'DELETE',
      body: {
        password,
        ...(options?.twoFactorToken ? { twoFactorToken: options.twoFactorToken } : {}),
        ...(options?.reason ? { reason: options.reason } : {}),
      },
    });

    this.clearStorage();
  }

  /**
   * Returns null — the access token lives in an httpOnly cookie managed by
   * the backend and is not readable from JavaScript. HTTP requests send it
   * automatically via `credentials: 'include'`; Socket.IO connections use the
   * same cookie on the WebSocket upgrade request.
   */
  getToken(): null {
    return null;
  }

  /**
   * No-op — the access token is set as an httpOnly cookie by the backend
   * login/refresh response and is never written to JS-accessible storage.
   */
  setToken(_token: string | null | undefined): void {
    // intentional no-op
  }

  /**
   * Clears local user state. The access/refresh token cookies are cleared
   * by the backend logout endpoint.
   */
  clearTokens(): void {
    // Token cookies are cleared server-side on logout; nothing to do here.
  }

  // Private helper methods
  private setUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  private clearStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

// Export singleton instance
export const authService = new AuthService();
