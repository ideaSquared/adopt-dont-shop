import { PermissionsService, Permission, UserWithPermissions } from '@adopt-dont-shop/lib-permissions';
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { permissionsService } from '@/services';

interface PermissionsContextType {
  permissionsService: PermissionsService;
  userPermissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  userWithPermissions: UserWithPermissions | null;
  isLoading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};

interface PermissionsProviderProps {
  children: ReactNode;
}

export const PermissionsProvider = ({ children }: PermissionsProviderProps) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [userWithPermissions, setUserWithPermissions] = useState<UserWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserPermissions = async () => {
    if (!isAuthenticated || !user?.userId || authLoading) {
      setUserPermissions([]);
      setUserWithPermissions(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Get user permissions
      const permissions = await permissionsService.getUserPermissions(user.userId);
      const userWithPerms = await permissionsService.getUserWithPermissions(user.userId);
      
      setUserPermissions(permissions || []);
      setUserWithPermissions(userWithPerms);
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      setUserPermissions([]);
      setUserWithPermissions(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserPermissions();
  }, [user?.userId, isAuthenticated, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPermission = (permission: Permission): boolean => {
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => userPermissions.includes(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => userPermissions.includes(permission));
  };

  const refreshPermissions = async (): Promise<void> => {
    setIsLoading(true);
    await loadUserPermissions();
  };

  const value = useMemo(() => ({
    permissionsService,
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userWithPermissions,
    isLoading,
    refreshPermissions,
  }), [userPermissions, userWithPermissions, isLoading]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};
