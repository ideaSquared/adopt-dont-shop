import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { authService } from '../services';
import { LoginRequest, RegisterRequest, User } from '../types/auth';
import { isDevelopment } from '../utils/env';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
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

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (currentUser && authService.isAuthenticated()) {
          // Verify token is still valid by fetching fresh user data
          try {
            const freshUser = await authService.getProfile();

            // Check if user type is allowed in the rescue app
            if (freshUser && !isRescueStaff(freshUser.userType)) {
              // Clear auth data for non-rescue staff users
              await authService.logout();
              setUser(null);
              setIsLoading(false);
              return;
            }

            setUser(freshUser);
          } catch (error) {
            console.error('Failed to refresh user data:', error);
            await authService.logout();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        await authService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);

      // Check if user type is allowed in the rescue app
      if (response.user && !isRescueStaff(response.user.userType)) {
        // Clear any stored auth data
        await authService.logout();
        setUser(null);

        // Provide helpful redirect information
        let redirectApp = '';
        switch (response.user.userType) {
          case 'adopter':
            redirectApp = 'client app (port 3000)';
            break;
          case 'admin':
          case 'moderator':
            redirectApp = 'admin app (port 3001)';
            break;
          default:
            redirectApp = 'appropriate application';
        }

        throw new Error(
          `This app is for rescue staff only. As a ${response.user.userType}, please use the ${redirectApp}.`
        );
      }

      setUser(response.user);
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    setIsLoading(true);
    try {
      // Force userType to rescue_staff for rescue app registration
      const rescueUserData = {
        ...userData,
        userType: 'rescue_staff' as const,
      };

      const response = await authService.register(rescueUserData);
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
      if (isDevelopment()) {
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
      if (isDevelopment()) {
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
    if (isDevelopment()) {
      const token = localStorage.getItem('accessToken');
      if (token?.startsWith('dev-token-')) {
        const updatedUser = { ...user, ...profileData };
        setUser(updatedUser);
        localStorage.setItem('dev_user', JSON.stringify(updatedUser));
        return;
      }
    }

    try {
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authService.getProfile();
      if (freshUser && isRescueStaff(freshUser.userType)) {
        setUser(freshUser);
      } else {
        await logout();
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      await logout();
    }
  };

  const value = {
    user,
    isAuthenticated: !!user && authService.isAuthenticated(),
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Helper function to check if user type is allowed in rescue app
function isRescueStaff(userType?: string): boolean {
  const allowedTypes = [
    'rescue_staff',  // Only rescue_staff is supported by lib.auth
  ];
  return allowedTypes.includes(userType || '');
}
