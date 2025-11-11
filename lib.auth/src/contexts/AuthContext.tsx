import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { authService } from '../services/auth-service';
import { LoginRequest, RegisterRequest, User } from '../types';

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
  allowedUserTypes: ('adopter' | 'rescue_staff' | 'admin' | 'moderator')[];
  /**
   * App identifier for error messages and redirects
   */
  appType: 'client' | 'rescue' | 'admin';
  /**
   * Optional analytics/logging callback
   */
  onAuthEvent?: (event: string, data?: Record<string, unknown>) => void;
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
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

          // TODO: Initialize notifications for existing authenticated user
          // Notifications should be initialized by the consuming app if needed
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
        let redirectPort = '';
        switch (response.user.userType) {
          case 'adopter':
            redirectApp = 'Client App';
            redirectPort = 'port 3000';
            break;
          case 'rescue_staff':
            redirectApp = 'Rescue App';
            redirectPort = 'port 3002';
            break;
          case 'admin':
          case 'moderator':
            redirectApp = 'Admin App';
            redirectPort = 'port 3001';
            break;
          default:
            redirectApp = 'appropriate application';
            redirectPort = '';
        }

        throw new Error(
          `This app is for ${allowedUserTypes.join(' and ')} users only. As a ${response.user.userType}, please use the ${redirectApp}${redirectPort ? ` (${redirectPort})` : ''}.`
        );
      }

      setUser(response.user);

      onAuthEvent?.('auth_login_successful', {
        user_id: response.user.userId,
        user_type: response.user.userType,
        email: response.user.email,
      });
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

      const response = await authService.register(registerData);
      setUser(response.user);

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
      setIsLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    if (!user) throw new Error('No user logged in');

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

    if (!authService.isAuthenticated()) return;

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
