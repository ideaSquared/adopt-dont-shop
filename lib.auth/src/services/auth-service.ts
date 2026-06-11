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
  StoredUserSchema,
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

export class AuthService {
  constructor() {
    // Wire the API service so Bearer tokens are sent on every authenticated request
    apiService.updateConfig({
      getAuthToken: () => this.getToken(),
    });
  }

  /**
   * Login user with credentials
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, credentials);

    this.setToken(response.tokens.accessToken);
    this.setUser(response.user);

    return response;
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
   * Get current user from localStorage.
   *
   * Validates the stored value against StoredUserSchema before returning it.
   * If the value is missing, unparseable, or fails schema validation the
   * corrupted entry is removed and null is returned so callers can't
   * accidentally treat an invalid PII blob as a live user.
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(userStr);
    } catch {
      localStorage.removeItem(STORAGE_KEYS.USER);
      return null;
    }

    const result = StoredUserSchema.safeParse(parsed);
    if (!result.success) {
      localStorage.removeItem(STORAGE_KEYS.USER);
      return null;
    }

    // The stored value passed schema validation; cast to the full User type
    // (additional optional fields are preserved by JSON.parse above).
    return parsed as User;
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
   * Refresh access token — stores the new access token and returns it.
   */
  async refreshToken(): Promise<string> {
    const response = await apiService.post<RefreshTokenResponse>(AUTH_ENDPOINTS.REFRESH, {});
    this.setToken(response.tokens.accessToken);
    return response.tokens.accessToken;
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
   * Returns the stored Bearer access token, or null if not authenticated.
   */
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Stores the Bearer access token in localStorage.
   */
  setToken(token: string | null | undefined): void {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    }
  }

  /**
   * Removes the stored access token.
   */
  clearTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
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
