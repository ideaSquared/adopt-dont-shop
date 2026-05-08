import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  UserType,
  ADMIN_USER_TYPES,
} from '@/types';
import { apiService } from './libraryServices';
import { safeStorage } from './safeStorage';

class AuthService {
  private clearUserData(): void {
    safeStorage.removeItem('user');
    safeStorage.removeItem('impersonating');
  }

  // Login admin user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/api/v1/auth/admin/login', credentials);

    // Store only non-sensitive user data; tokens are in HttpOnly cookies
    safeStorage.setItem('user', JSON.stringify(response.user));

    return response;
  }

  // Register new admin user (super admin only)
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/api/v1/auth/admin/register', userData);

    // Store only non-sensitive user data; tokens are in HttpOnly cookies
    safeStorage.setItem('user', JSON.stringify(response.user));

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
      this.clearUserData();
    }
  }

  // Get current admin user from localStorage
  getCurrentUser(): User | null {
    const userStr = safeStorage.getItem('user');
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

  // Check if admin is authenticated (user data present; token is in HttpOnly cookie)
  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  // Check if current user has specific admin role
  hasRole(role: UserType): boolean {
    const user = this.getCurrentUser();
    return user?.userType === role;
  }

  // Check if current user is super admin
  isSuperAdmin(): boolean {
    return this.hasRole('super_admin');
  }

  // Check if current user has any admin-level access (admin, moderator, or super_admin)
  isAdminStaff(): boolean {
    const user = this.getCurrentUser();
    return user !== null && (ADMIN_USER_TYPES as readonly string[]).includes(user.userType);
  }

  // Refresh access token (cookie-based — no body token needed)
  async refreshToken(): Promise<void> {
    await apiService.post('/api/v1/auth/admin/refresh-token', {});
  }

  // Update admin profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiService.patch<User>('/api/v1/admin/profile', userData);

    // Update stored user data
    safeStorage.setItem('user', JSON.stringify(response));

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

  // Impersonate user (super admin only)
  async impersonateUser(userId: string): Promise<void> {
    if (!this.isSuperAdmin()) {
      throw new Error('Only super admins can impersonate users');
    }

    const response = await apiService.post<{ user: User }>('/api/v1/admin/impersonate', {
      userId: userId,
    });

    // Track impersonation state; token is managed via HttpOnly cookie by the server
    safeStorage.setItem('impersonating', 'true');
    safeStorage.setItem('user', JSON.stringify(response.user));
  }

  // Stop impersonation
  async stopImpersonation(): Promise<void> {
    await apiService.post('/api/v1/admin/impersonate/stop', {});

    safeStorage.removeItem('impersonating');

    // Refresh user data from server
    const response = await apiService.get<User>('/api/v1/admin/profile');
    safeStorage.setItem('user', JSON.stringify(response));
  }

  // Check if currently impersonating
  isImpersonating(): boolean {
    return !!safeStorage.getItem('impersonating');
  }
}

export const authService = new AuthService();
