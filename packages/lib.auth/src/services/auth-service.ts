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
import { clearSessionCookie, hasSessionCookie } from './session-cookie';

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

// The login flow signals "password OK, but your email isn't verified yet" by
// throwing an Error whose message contains this string. LoginForm matches on
// it to swap to the "verify your email" prompt with a resend action.
export const EMAIL_VERIFICATION_REQUIRED_MESSAGE = 'Email verification required';

/**
 * AuthService - Authentication and user management service
 *
 * ADS-919: the access + refresh tokens live in HttpOnly cookies the gateway
 * sets on login/refresh and clears on logout (see
 * services/gateway/src/middleware/auth-cookies.ts) — this class never reads
 * or writes them, and lib.api attaches no `Authorization` header (no
 * `getAuthToken` is wired below). `credentials: 'include'` (already set by
 * lib.api) carries the cookies on every request automatically. The only
 * things persisted client-side are the non-sensitive user profile
 * (STORAGE_KEYS.USER) and a JS-readable `hasSession` marker cookie the
 * gateway sets alongside the HttpOnly ones — see isAuthenticated() below.
 */
export class AuthService {
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

    // Password was correct but the account's email isn't verified. The body
    // carries no user/tokens — surface the signal as an error the LoginForm
    // prompts on, WITHOUT persisting a partial session.
    if (response.emailVerificationRequired) {
      throw new Error(EMAIL_VERIFICATION_REQUIRED_MESSAGE);
    }

    // The gateway set the access + refresh token pair as HttpOnly cookies on
    // this response (never in the body) — only the user profile is
    // persisted client-side.
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
    // The refresh token rides along as an HttpOnly cookie — the gateway
    // reads it server-side to revoke the session (idempotent — an
    // already-revoked/expired token still returns OK) and clears all three
    // auth cookies on the response.
    try {
      await apiService.post(AUTH_ENDPOINTS.LOGOUT, {});
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
   * Check if a session is present. Both the stored user record and the
   * gateway's non-secret `hasSession` marker cookie must be present — the
   * user drives UI gating, while the cookie reflects whether the gateway
   * currently considers this browser logged in (set on login/refresh,
   * cleared on logout). Neither the real access nor refresh token is ever
   * JS-readable, so this is the closest synchronous equivalent.
   */
  isAuthenticated(): boolean {
    return !!this.getCurrentUser() && hasSessionCookie();
  }

  /**
   * Refresh the access token. The refresh token rides along as an HttpOnly
   * cookie — the gateway reads it server-side and rotates the cookie pair
   * on success. Nothing to persist client-side.
   */
  async refreshToken(): Promise<void> {
    await apiService.post<RefreshTokenResponse>(AUTH_ENDPOINTS.REFRESH, {});
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
    const response = await apiService.patch<{ user: User }>('/api/v1/users/account', profileData);

    // Update localStorage
    this.setUser(response.user);

    return response.user;
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
   * Resend the verification email for a given address. Used by the login
   * "verify your email" prompt, where there is no persisted session to read
   * the email from. The gateway always responds with success to avoid
   * leaking which addresses have accounts.
   */
  async resendVerification(email: string): Promise<void> {
    await apiService.post(AUTH_ENDPOINTS.RESEND_VERIFICATION, { email });
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
   * Clears the JS-visible session marker. Called on logout (after the
   * gateway revokes the refresh token) and when a session is found to be
   * invalid (401) — flips isAuthenticated() to false immediately without
   * waiting on a network round trip. The real HttpOnly access/refresh
   * cookies can only be cleared server-side (Set-Cookie on /auth/logout).
   */
  clearTokens(): void {
    clearSessionCookie();
  }

  // Private helper methods
  private setUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  private clearStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

// ADS-919 follow-up: one-time purge of the legacy plaintext token keys the
// pre-cookie AuthService wrote to localStorage (`__dev_authToken` /
// `__dev_accessToken` / `__dev_refreshToken`). After the httpOnly-cookie
// migration nothing reads them, but a token pair lingering in a user's
// localStorage is a residual exfiltration artifact, so we actively remove
// them on first load post-deploy rather than leaving them as dead weight.
// Idempotent and safe when the keys are absent or localStorage is unavailable
// (SSR / non-browser test envs).
const LEGACY_TOKEN_STORAGE_KEYS = [
  '__dev_authToken',
  '__dev_accessToken',
  '__dev_refreshToken',
] as const;

export const purgeLegacyTokenStorage = (): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  for (const key of LEGACY_TOKEN_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
};

purgeLegacyTokenStorage();

// Export singleton instance
export const authService = new AuthService();
