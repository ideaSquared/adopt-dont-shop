import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import { authService } from '@/services';
import type { User, Rescue, LoginCredentials } from '@/types';

interface AuthContextType {
  // State
  user: User | null;
  rescue: Rescue | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rescue, setRescue] = useState<Rescue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!user && authService.isAuthenticated();

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setRescue(null);
      setIsLoading(false);
    }
  }, []);

  // Initialize auth state on app startup
  const initializeAuth = useCallback(async () => {
    try {
      if (authService.isAuthenticated()) {
        const userData = await authService.getCurrentUser();
        if (userData) {
          setUser(userData);
          // If user has a rescue, we could fetch rescue details here
          if (userData.rescueId) {
            // TODO: Fetch rescue details when rescue service is implemented
          }
        }
      } else if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_TOOLS) {
        // 🚀 DEVELOPMENT: Auto-login with rescue admin for testing
        console.log('🚀 DEV MODE: Auto-logging in with rescue admin user');
        try {
          setIsLoading(true);
          const response = await authService.login({
            email: 'rescue.manager@pawsrescue.dev',
            password: 'DevPassword123!',
          });
          setUser(response.user);
          console.log('✅ DEV LOGIN: Successfully logged in rescue admin');
        } catch (error) {
          console.warn('⚠️ DEV LOGIN: Failed to auto-login rescue admin:', error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      // Clear invalid tokens
      await logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      // Note: rescue data may need to be fetched separately in the library architecture
      // if (response.rescue) {
      //   setRescue(response.rescue);
      // }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!isAuthenticated) return;

    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, logout user
      await logout();
    }
  };

  const contextValue: AuthContextType = {
    // State
    user,
    rescue,
    isLoading,
    isAuthenticated,

    // Actions
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
