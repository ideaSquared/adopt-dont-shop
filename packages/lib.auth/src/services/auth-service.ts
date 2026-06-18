import { apiService } from '@adopt-dont-shop/lib.api';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  ChangePasswordRequest,
  RefreshTokenResponse,
  TokenPair,
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

// The login flow signals "password OK, now I need your TOTP code" by
// throwing an Error whose message contains this string. LoginForm matches
// on it to swap to the 2FA code prompt and re-submit with twoFactorToken.
export const TWO_FACTOR_REQUIRED_MESSAGE = 'Two-factor authentication code required';

/**
 * AuthService - Authentication and user management service
 *
 * Phase 11 follow-up: the Fastify gateway replaced the deleted monolith's
 * httpOnly-cookie + CSRF model with Bearer tokens. Login / refresh return
 * `{ user, tokens: { accessToken, refreshToken } }` in the JSON body; the
 * access token is stored here and attached to every authenticated request
 * as `Authorization: Bearer <token>` via lib.api's `getAuthToken` hook
 * (wired in the constructor). The refresh token is replayed to
 * `/auth/refresh-token` to rotate the pair.
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

    // Password was correct but the account has 2FA on and no (valid) code
    // was supplied. The body carries no user/tokens — surface the signal
    // as an error the LoginForm prompts on, WITHOUT persisting a partial
    // session.
    if (response.twoFactorRequired) {
      throw new Error(TWO_FACTOR_REQUIRED_MESSAGE);
    }

    // Persist the user + the Bearer token pair the gateway returned in the
    // body. getToken() then feeds the access token to lib.api so subsequent
    // requests are authenticated.
    this.setUser(response.user);
    this.setTokens(response.tokens);

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
    // The gateway revokes the supplied refresh token (idempotent — an
    // already-revoked/expired token still returns OK).
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    try {
      await apiService.post(AUTH_ENDPOINTS.LOGOUT, refreshToken ? { refreshToken } : {});
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
   * Check if user is authenticated. Both the stored user record and the
   * access token must be present — the user drives UI gating while the
   * token is what actually authenticates API calls.
   */
  isAuthenticated(): boolean {
    return !!this.getCurrentUser() && !!this.getToken();
  }

  /**
   * Refresh the access token. Sends the stored refresh token to the gateway,
   * persists the rotated pair, and returns the new access token.
   */
  async refreshToken(): Promise<string> {
    const stored = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const response = await apiService.post<RefreshTokenResponse>(
      AUTH_ENDPOINTS.REFRESH,
      stored ? { refreshToken: stored } : {}
    );
    this.setTokens(response.tokens);
    return response.tokens.accessToken;
  }

  /**
   * Get user profile from API.
   *
   * The gateway's `GET /auth/me` returns a `{ user, roles, permissions,
   * rescueId }` envelope; the caller wants the bare user record, so unwrap.
   */
  async getProfile(): Promise<User> {
    const response = await apiService.get<{ user: User }>(AUTH_ENDPOINTS.ME);
    return response.user;
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
   * Returns the stored access token (or null). lib.api calls this via the
   * `getAuthToken` hook to attach `Authorization: Bearer <token>`; the
   * Socket.IO clients read it the same way.
   */
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Store (or clear) the access token. Passing a falsy value removes it.
   */
  setToken(token: string | null | undefined): void {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      return;
    }
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Clears the stored Bearer token pair. Called on logout (after the gateway
   * revokes the refresh token) and when a session is found to be invalid.
   */
  clearTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  // Private helper methods
  private setUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  private setTokens(tokens: TokenPair): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    }
  }

  private clearStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

// Export singleton instance
export const authService = new AuthService();
