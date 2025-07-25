import { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types';
import { apiService } from './api';

class AuthService {
  // Login admin user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // eslint-disable-next-line no-console
    console.log('🔐 AuthService: Attempting admin login for:', credentials.email);

    const response = await apiService.post<AuthResponse>('/api/v1/auth/admin/login', credentials);

    // Store tokens and user data
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('accessToken', response.token); // Keep both for compatibility
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(response.user));

    // Set token in API service
    apiService.setToken(response.token);

    return response;
  }

  // Register new admin user (super admin only)
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/api/v1/auth/admin/register', userData);

    // Store tokens and user data
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('accessToken', response.token); // Keep both for compatibility
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(response.user));

    // Set token in API service
    apiService.setToken(response.token);

    return response;
  }

  // Logout admin user
  async logout(): Promise<void> {
    try {
      await apiService.post('/api/v1/auth/admin/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      // Clear token from API service
      apiService.clearToken();
    }
  }

  // Get current admin user from localStorage
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

  // Check if admin is authenticated
  isAuthenticated(): boolean {
    return apiService.isAuthenticated() && !!this.getCurrentUser();
  }

  // Check if current user has specific admin role
  hasRole(role: 'admin' | 'moderator' | 'super_admin'): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // Check if current user is super admin
  isSuperAdmin(): boolean {
    return this.hasRole('super_admin');
  }

  // Refresh access token
  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<{ token: string; refreshToken: string }>(
      '/api/v1/auth/admin/refresh-token',
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

  // Update admin profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiService.patch<User>('/api/v1/admin/profile', userData);

    // Update stored user data
    localStorage.setItem('user', JSON.stringify(response));

    return response;
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiService.post('/api/v1/auth/admin/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // Get admin permissions
  async getPermissions(): Promise<string[]> {
    try {
      const response = await apiService.get<{ permissions: string[] }>('/api/v1/admin/permissions');
      return response.permissions;
    } catch (error) {
      console.error('❌ AuthService: Failed to fetch permissions:', error);
      return [];
    }
  }

  // Verify admin session
  async verifySession(): Promise<boolean> {
    try {
      await apiService.get('/api/v1/auth/admin/verify');
      return true;
    } catch (error) {
      console.error('❌ AuthService: Session verification failed:', error);
      return false;
    }
  }

  // Development helper for admin
  async loginWithDevToken(
    userType: 'admin' | 'moderator' | 'super_admin' = 'admin'
  ): Promise<void> {
    if (!import.meta.env.DEV) {
      throw new Error('Dev token login is only available in development mode');
    }

    const devToken = `dev-token-${userType}`;
    const mockUser: User = {
      user_id: `dev-admin-${userType}`,
      email: `${userType}@admin.dev.local`,
      first_name: 'Dev',
      last_name: 'Admin',
      role: userType,
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
    console.log(`🛠️ Admin logged in with dev token as ${userType}`);
  }

  // Clear dev tokens
  clearDevTokens(): void {
    if (import.meta.env.DEV) {
      this.logout();
    }
  }

  // Impersonate user (super admin only)
  async impersonateUser(userId: string): Promise<{ originalToken: string }> {
    if (!this.isSuperAdmin()) {
      throw new Error('Only super admins can impersonate users');
    }

    const originalToken = localStorage.getItem('authToken') || '';

    const response = await apiService.post<{ token: string; user: User }>(
      '/api/v1/admin/impersonate',
      { user_id: userId }
    );

    // Store impersonation token
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('accessToken', response.token);
    localStorage.setItem('impersonation_original_token', originalToken);
    localStorage.setItem('user', JSON.stringify(response.user));

    // Set token in API service
    apiService.setToken(response.token);

    return { originalToken };
  }

  // Stop impersonation
  async stopImpersonation(): Promise<void> {
    const originalToken = localStorage.getItem('impersonation_original_token');
    if (!originalToken) {
      throw new Error('No impersonation session found');
    }

    // Restore original token
    localStorage.setItem('authToken', originalToken);
    localStorage.setItem('accessToken', originalToken);
    localStorage.removeItem('impersonation_original_token');

    // Get original user data
    const response = await apiService.get<User>('/api/v1/admin/profile');
    localStorage.setItem('user', JSON.stringify(response));

    // Set token in API service
    apiService.setToken(originalToken);
  }

  // Check if currently impersonating
  isImpersonating(): boolean {
    return !!localStorage.getItem('impersonation_original_token');
  }
}

export const authService = new AuthService();
