import React, { createContext, ReactNode, useEffect, useRef, useState } from 'react';
import { apiService } from '@adopt-dont-shop/lib.api';
import { toast } from '@adopt-dont-shop/lib.components';
import { authService } from '../services/auth-service';
import { LoginRequest, RegisterRequest, User, STORAGE_KEYS } from '../types';

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  // Development only method
  setDevUser?: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  /**
   * Allowed user types for this app instance
   * - 'adopter' for client app
   * - 'rescue_staff' for rescue app
   * - ['admin', 'moderator'] for admin app
   */
  allowedUserTypes: User['userType'][];
  /**
   * App identifier for error messages and redirects
   */
  appType: 'client' | 'rescue' | 'admin';
  /**
   * Optional analytics/logging callback
   */
  onAuthEvent?: (event: string, data?: Record<string, unknown>) => void;
  /**
   * Called as part of logout cleanup. Apps wire this up to clear their
   * React Query cache (`queryClient.clear()`) so a User A → User B login
   * on the same browser cannot serve stale cached data from User A's
   * session. The handler runs after tokens are cleared and before
   * isLoading flips back to false; fired regardless of whether the
   * backend logout call succeeded.
   */
  onLogout?: () => void;
}

/**
 * Shared AuthProvider for all apps
 * Handles authentication state, user management, and app-specific access control
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  allowedUserTypes,
  appType,
  onAuthEvent,
  onLogout,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // C2-5: keep the latest user reference accessible inside the stable
  // onUnauthorized callback registered with apiService. We only want
  // to surface the session-expired toast for users who were actually
  // signed in — a 401 returned to the login form is "bad credentials",
  // not session expiry, and that flow shows its own error.
  const sessionUserRef = useRef<User | null>(null);
  useEffect(() => {
    sessionUserRef.current = user;
  }, [user]);

  // Fire a single post-authentication signal so consuming apps can run
  // session-scoped setup (e.g. initialize notifications) for both fresh
  // logins and rehydrated sessions through one hook.
  const initializeForAuthenticatedUser = (authenticatedUser: User) => {
    onAuthEvent?.('auth_session_authenticated', {
      user_id: authenticatedUser.userId,
      user_type: authenticatedUser.userType,
      email: authenticatedUser.email,
    });
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // In development mode, check for dev user first
        if (import.meta.env?.DEV) {
          const devUser = localStorage.getItem('dev_user');

          if (devUser) {
            const parsedUser = JSON.parse(devUser);

            // Ensure dev user has a mock token
            const existingToken = localStorage.getItem('accessToken');
            if (!existingToken || !existingToken.startsWith('dev-token-')) {
              const mockToken = `dev-token-${parsedUser.userId}-${Date.now()}`;
              localStorage.setItem('accessToken', mockToken);
              localStorage.setItem('authToken', mockToken);
            }

            setUser(parsedUser);
            initializeForAuthenticatedUser(parsedUser);
            setIsLoading(false);
            return;
          }
        }

        const currentUser = authService.getCurrentUser();
        if (currentUser && authService.isAuthenticated()) {
          // Verify token is still valid by fetching fresh user data
          const freshUser = await authService.getProfile();

          // Check if user type is allowed in this app
          if (freshUser && !allowedUserTypes.includes(freshUser.userType)) {
            // Clear auth data for unauthorized user types
            await authService.logout();
            setUser(null);
            setIsLoading(false);
            return;
          }

          setUser(freshUser);
          if (freshUser) {
            initializeForAuthenticatedUser(freshUser);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear invalid auth data only if we're not in dev mode with a dev user
        if (!import.meta.env?.DEV || !localStorage.getItem('dev_user')) {
          await authService.logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [allowedUserTypes]);

  // Register a 401 handler so any API call that gets Unauthorized automatically
  // clears local auth state without making an additional logout API call
  // (which would itself get a 401 and recurse).
  //
  // Also register a token-refresh handler so the api layer can recover
  // from short-lived access-token expiry mid-session without dropping
  // the user. Refresh tokens live in an httpOnly cookie so the call
  // works even when the in-memory token is gone. If the refresh itself
  // fails, the api layer falls through to onUnauthorized.
  useEffect(() => {
    apiService.updateConfig({
      onUnauthorized: () => {
        // C2-5: only surface the toast when the user was actually
        // signed in (using the ref so the latest value is read inside
        // this stable callback). Showing the toast on the unauthed
        // login screen would be confusing — the cause there is bad
        // credentials, not session expiry.
        if (sessionUserRef.current) {
          toast.error(SESSION_EXPIRED_MESSAGE);
        }
        authService.clearTokens();
        setUser(null);
      },
    });
    apiService.setRefreshHandler(() => authService.refreshToken());
    return () => {
      apiService.updateConfig({ onUnauthorized: undefined });
      apiService.setRefreshHandler(null);
    };
  }, []);

  // Cross-tab logout sync: when another tab removes the persisted user
  // record (logout, account deletion), drop local auth state here too
  // so this tab doesn't keep rendering the authenticated UI until its
  // next API call fails with 401. Only react to the user/token keys —
  // unrelated storage writes (theme, feature flags, etc.) must not
  // trigger a logout. We don't navigate from here; route-level guards
  // pick up the user === null transition.
  useEffect(() => {
    const onStorageEvent = (e: StorageEvent) => {
      const isUserKey = e.key === STORAGE_KEYS.USER;
      const isTokenKey = e.key === STORAGE_KEYS.AUTH_TOKEN || e.key === STORAGE_KEYS.ACCESS_TOKEN;
      if (!isUserKey && !isTokenKey) {
        return;
      }
      if (e.newValue !== null) {
        return;
      }
      authService.clearTokens();
      apiService.clearCsrfToken();
      setUser(null);
    };
    window.addEventListener('storage', onStorageEvent);
    return () => window.removeEventListener('storage', onStorageEvent);
  }, []);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      onAuthEvent?.('auth_login_attempted', { email: credentials.email });

      const response = await authService.login(credentials);

      // Check if user type is allowed in this app
      if (response.user && !allowedUserTypes.includes(response.user.userType)) {
        // Clear any stored auth data
        await authService.logout();
        setUser(null);

        onAuthEvent?.('auth_wrong_app_access', {
          user_type: response.user.userType,
          expected_app: appType,
          email: response.user.email,
        });

        // Provide helpful redirect information
        let redirectApp = '';
        switch (response.user.userType) {
          case 'adopter':
            redirectApp = 'Client App';
            break;
          case 'rescue_staff':
            redirectApp = 'Rescue App';
            break;
          case 'admin':
          case 'moderator':
            redirectApp = 'Admin App';
            break;
          default:
            redirectApp = 'appropriate application';
        }

        throw new Error(
          `This app is for ${allowedUserTypes.join(' and ')} users only. As a ${response.user.userType}, please use the ${redirectApp}.`
        );
      }

      setUser(response.user);

      onAuthEvent?.('auth_login_successful', {
        user_id: response.user.userId,
        user_type: response.user.userType,
        email: response.user.email,
      });

      initializeForAuthenticatedUser(response.user);
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);

      onAuthEvent?.('auth_login_failed', {
        email: credentials.email,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    setIsLoading(true);
    try {
      onAuthEvent?.('auth_registration_attempted', {
        email: userData.email,
        user_type: userData.userType || allowedUserTypes[0],
      });

      // Set userType based on app if not provided
      const registerData: RegisterRequest = {
        ...userData,
        userType: userData.userType || allowedUserTypes[0],
      };

      // ADS-538: register no longer returns auth tokens — the user must
      // verify their email and log in normally before the session
      // becomes valid. Deliberately do NOT call setUser() here.
      const response = await authService.register(registerData);

      onAuthEvent?.('auth_registration_successful', {
        user_id: response.user.userId,
        email: response.user.email,
        user_type: response.user.userType,
      });
    } catch (error) {
      setUser(null);

      onAuthEvent?.('auth_registration_failed', {
        email: userData.email,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const currentUserId = user?.userId;
    const currentEmail = user?.email;

    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);

      if (currentUserId) {
        onAuthEvent?.('auth_logout_successful', {
          user_id: currentUserId,
          email: currentEmail || 'unknown',
        });
      }

      // Clear dev user data in development mode
      if (import.meta.env?.DEV) {
        localStorage.removeItem('dev_user');
        // Clear mock tokens for dev users
        const token = localStorage.getItem('accessToken');
        if (token?.startsWith('dev-token-')) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('authToken');
        }
      }
    } catch (error) {
      console.error('Logout error:', error);

      if (currentUserId) {
        onAuthEvent?.('auth_logout_failed', {
          user_id: currentUserId,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Even if logout fails, clear local state
      setUser(null);
      if (import.meta.env?.DEV) {
        localStorage.removeItem('dev_user');
        // Clear mock tokens for dev users
        const token = localStorage.getItem('accessToken');
        if (token?.startsWith('dev-token-')) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('authToken');
        }
      }
    } finally {
      // Clear the per-session CSRF token cache so the next signed-in
      // user fetches a fresh one bound to their session cookie rather
      // than reusing the previous user's token.
      apiService.clearCsrfToken();

      // Fire onLogout regardless of API success so the host app's
      // React Query cache (which lives outside this provider) is
      // always wiped before the next user can sign in on this tab.
      try {
        onLogout?.();
      } catch (cleanupError) {
        console.error('onLogout handler threw:', cleanupError);
      }
      setIsLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    // In development mode, handle dev users differently
    if (import.meta.env?.DEV) {
      const token = localStorage.getItem('accessToken');
      if (token?.startsWith('dev-token-')) {
        const updatedUser = { ...user, ...profileData };
        setUser(updatedUser);
        localStorage.setItem('dev_user', JSON.stringify(updatedUser));
        return;
      }
    }

    const updatedUser = await authService.updateProfile(profileData);
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    // Don't refresh dev users
    if (import.meta.env?.DEV && localStorage.getItem('dev_user')) {
      return;
    }

    if (!authService.isAuthenticated()) {
      return;
    }

    try {
      const freshUser = await authService.getProfile();

      // Verify user type still allowed
      if (freshUser && allowedUserTypes.includes(freshUser.userType)) {
        setUser(freshUser);
      } else {
        await logout();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, logout user (but not dev users)
      if (!import.meta.env?.DEV || !localStorage.getItem('dev_user')) {
        await logout();
      }
    }
  };

  // Development only method to directly set user
  const setDevUser = (devUser: User) => {
    if (import.meta.env?.DEV) {
      setUser(devUser);
      // Store dev user in localStorage for persistence across refreshes
      localStorage.setItem('dev_user', JSON.stringify(devUser));
      const mockToken = `dev-token-${devUser.userId}-${Date.now()}`;
      localStorage.setItem('accessToken', mockToken);
      localStorage.setItem('authToken', mockToken);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    ...(import.meta.env?.DEV && { setDevUser }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
