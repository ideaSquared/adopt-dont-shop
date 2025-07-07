import { authService } from '@/services/authService';
import { LoginRequest, RegisterRequest, User } from '@/types';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug user state changes in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('AuthContext: User state changed:', {
        user: user?.email || 'null',
        isAuthenticated: !!user,
        isLoading,
        timestamp: new Date().toISOString(),
      });
    }
  }, [user, isLoading]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // In development mode, check for dev user first
        if (import.meta.env.DEV) {
          const devUser = localStorage.getItem('dev_user');
          // eslint-disable-next-line no-console
          console.log('AuthContext init - checking dev user:', devUser ? 'found' : 'not found');
          if (devUser) {
            const parsedUser = JSON.parse(devUser);

            // Ensure dev user has a mock token
            const existingToken = localStorage.getItem('accessToken');
            if (!existingToken || !existingToken.startsWith('dev-token-')) {
              const mockToken = `dev-token-${parsedUser.userId}-${Date.now()}`;
              localStorage.setItem('accessToken', mockToken);
              localStorage.setItem('authToken', mockToken);
              // eslint-disable-next-line no-console
              console.log('AuthContext init - generated mock token for dev user');
            }

            setUser(parsedUser);
            // eslint-disable-next-line no-console
            console.log('AuthContext init - dev user loaded:', parsedUser.email);
            setIsLoading(false);
            return;
          }
        }

        const currentUser = authService.getCurrentUser();
        if (currentUser && authService.isAuthenticated()) {
          // Verify token is still valid by fetching fresh user data
          const freshUser = await authService.getProfile();

          // Check if user type is allowed in the client app
          if (freshUser && freshUser.userType !== 'adopter') {
            // Clear auth data for non-adopter users
            await authService.logout();
            setUser(null);
            setIsLoading(false);
            return;
          }

          setUser(freshUser);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear invalid auth data only if we're not in dev mode with a dev user
        if (!import.meta.env.DEV || !localStorage.getItem('dev_user')) {
          await authService.logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    // eslint-disable-next-line no-console
    console.log('🔑 AuthContext: login() called with:', credentials.email);
    setIsLoading(true);
    try {
      // eslint-disable-next-line no-console
      console.log('🔑 AuthContext: calling authService.login()');
      const response = await authService.login(credentials);
      // eslint-disable-next-line no-console
      console.log('🔑 AuthContext: authService.login() response:', response.user?.email);

      // Check if user type is allowed in the client app
      if (response.user && response.user.userType !== 'adopter') {
        // Clear any stored auth data
        await authService.logout();
        setUser(null);

        // Provide helpful redirect information
        let redirectApp = '';
        switch (response.user.userType) {
          case 'rescue_staff':
            redirectApp = 'rescue app (port 3002)';
            break;
          case 'admin':
          case 'moderator':
            redirectApp = 'admin app (port 3001)';
            break;
          default:
            redirectApp = 'appropriate application';
        }

        throw new Error(
          `This app is for pet adopters only. As a ${response.user.userType}, please use the ${redirectApp}.`
        );
      }

      setUser(response.user);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('🔑 AuthContext: login error:', error);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.register(userData);
      setUser(response.user);
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      // Clear dev user data in development mode
      if (import.meta.env.DEV) {
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
      // Even if logout fails, clear local state
      setUser(null);
      if (import.meta.env.DEV) {
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
    if (import.meta.env.DEV) {
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
    if (import.meta.env.DEV && localStorage.getItem('dev_user')) {
      return;
    }

    if (!authService.isAuthenticated()) return;

    try {
      const freshUser = await authService.getProfile();
      setUser(freshUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, logout user (but not dev users)
      if (!import.meta.env.DEV || !localStorage.getItem('dev_user')) {
        await logout();
      }
    }
  };

  // Development only method to directly set user
  const setDevUser = (devUser: User) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('setDevUser called with:', devUser.email);
      setUser(devUser);
      // Store in localStorage for persistence during dev
      localStorage.setItem('dev_user', JSON.stringify(devUser));
      // eslint-disable-next-line no-console
      console.log('Dev user stored in localStorage');
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
    ...(import.meta.env.DEV && { setDevUser }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
