import { PermissionsService, Permission, UserRole } from '@adopt-dont-shop/lib.permissions';
import { createContext, useContext, ReactNode, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

interface PermissionsContextType {
  permissionsService: PermissionsService;
  userPermissions: Permission[];
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  isLoading: boolean;
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
  const { user } = useAuth();
  const [userPermissions] = useState<Permission[]>([]);
  const [isLoading] = useState(false);
  
  const permissionsService = useMemo(() => {
    return new PermissionsService({
      debug: import.meta.env.NODE_ENV === 'development'
    });
  }, []);

  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes(permission as Permission);
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const value = useMemo(() => ({
    permissionsService,
    userPermissions,
    hasPermission,
    hasRole,
    isLoading,
  }), [permissionsService, userPermissions, isLoading, user?.role]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};