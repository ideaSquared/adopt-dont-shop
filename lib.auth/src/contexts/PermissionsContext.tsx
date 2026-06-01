import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Permission, PermissionsService } from '@adopt-dont-shop/lib.permissions';
import { useAuth } from '../hooks/useAuth';

export type PermissionsContextValue = {
  permissions: readonly Permission[];
  isLoading: boolean;
  refresh: () => Promise<void>;
};

export const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export type PermissionsProviderProps = {
  service: PermissionsService;
  children: ReactNode;
};

export const PermissionsProvider = ({ service, children }: PermissionsProviderProps) => {
  const { user } = useAuth();
  const userId = user?.userId;
  const [permissions, setPermissions] = useState<readonly Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    service
      .getUserPermissions(userId)
      .then((next) => {
        if (!cancelled) {
          setPermissions(next);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [service, userId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }
    service.clearCache(userId);
    setIsLoading(true);
    try {
      const next = await service.getUserPermissions(userId);
      setPermissions(next);
    } finally {
      setIsLoading(false);
    }
  }, [service, userId]);

  const value = useMemo(
    () => ({ permissions, isLoading, refresh }),
    [permissions, isLoading, refresh]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export const usePermissions = (): PermissionsContextValue => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return ctx;
};
