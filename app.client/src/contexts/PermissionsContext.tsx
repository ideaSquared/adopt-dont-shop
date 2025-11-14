import {
  PermissionsService,
  Permission,
  UserWithPermissions,
} from '@adopt-dont-shop/lib.permissions';
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';

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
  userId?: string;
}

export const PermissionsProvider = ({ children, userId }: PermissionsProviderProps) => {
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [userWithPermissions, setUserWithPermissions] = useState<UserWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const permissionsService = useMemo(() => {
    return new PermissionsService({
      debug: import.meta.env.NODE_ENV === 'development',
    });
  }, []);

  const loadUserPermissions = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      // Get user permissions
      const permissions = await permissionsService.getUserPermissions(userId);
      const userWithPerms = await permissionsService.getUserWithPermissions(userId);

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
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const value = useMemo(
    () => ({
      permissionsService,
      userPermissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      userWithPermissions,
      isLoading,
      refreshPermissions,
    }),
    [permissionsService, userPermissions, userWithPermissions, isLoading]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};
