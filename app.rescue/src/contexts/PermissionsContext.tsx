import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { Permission, UserRole } from '@adopt-dont-shop/lib-permissions';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import { permissionsService } from '../services/libraryServices';

interface PermissionsContextType {
  permissionsService: typeof permissionsService;
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
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserPermissions = async () => {
      if (!user?.userId) {
        setUserPermissions([]);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch actual user permissions from the backend using pre-configured service
        const permissions = await permissionsService.getUserPermissions(user.userId);
        setUserPermissions(permissions);
      } catch (error) {
        console.error('Failed to load user permissions:', error);
        // Fallback: if API call fails, derive permissions from user role
        const rolePermissions = getRolePermissions(user.role);
        setUserPermissions(rolePermissions);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserPermissions();
  }, [permissionsService, user?.userId]);

  // Fallback function to get permissions based on role
  const getRolePermissions = (role?: string): Permission[] => {
    const permissionMappings: Record<string, Permission[]> = {
      'rescue_admin': [
        'staff.create', 'staff.read', 'staff.update', 'staff.delete', 'staff.list',
        'pets.create', 'pets.read', 'pets.update', 'pets.delete', 'pets.list',
        'applications.read', 'applications.update', 'applications.approve', 'applications.reject',
        'rescues.read', 'rescues.update'
      ] as Permission[],
      'rescue_staff': [
        'staff.read', 'staff.list',
        'pets.create', 'pets.read', 'pets.update', 'pets.list',
        'applications.read', 'applications.update'
      ] as Permission[],
      'rescue_volunteer': [
        'staff.read', 'pets.read', 'pets.list', 'applications.read'
      ] as Permission[]
    };
    
    return permissionMappings[role || ''] || [];
  };

  const hasPermission = (permission: string): boolean => {
    // Check if permission string is in the array
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
