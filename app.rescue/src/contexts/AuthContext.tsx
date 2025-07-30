import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import { authService } from '@/services';
import type { User, Rescue, LoginCredentials, Permission, Role } from '@/types';
import { rolePermissions } from '@/types/auth';

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

  // Permissions
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasRole: (role: Role) => boolean;
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

  // Permission checking functions
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user || !user.role) return false;

      const userRole = user.role as Role;
      const userPermissions = rolePermissions[userRole] || [];
      return userPermissions.includes(permission);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.some(permission => hasPermission(permission));
    },
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.every(permission => hasPermission(permission));
    },
    [hasPermission]
  );

  const hasRole = useCallback(
    (role: Role): boolean => {
      return user?.role === role;
    },
    [user]
  );

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

    // Permissions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
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

// Hook specifically for permission checking
export const usePermissions = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = useAuth();

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  };
};
