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
  /**
   * ADS-755: populated when the initial fetch or a subsequent refresh()
   * rejects. Consumers can use this to render a recoverable error UI
   * instead of silently rendering with an empty permission set.
   */
  error: Error | null;
  refresh: () => Promise<void>;
};

export const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export type PermissionsProviderProps = {
  service: PermissionsService;
  children: ReactNode;
};

const toError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

export const PermissionsProvider = ({ service, children }: PermissionsProviderProps) => {
  const { user } = useAuth();
  const userId = user?.userId;
  const [permissions, setPermissions] = useState<readonly Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setPermissions([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    service
      .getUserPermissions(userId)
      .then((next) => {
        if (!cancelled) {
          setPermissions(next);
        }
      })
      .catch((cause) => {
        if (cancelled) {
          return;
        }
        // ADS-755: surface the failure on the context so consumers can show
        // a retry UI rather than silently rendering with `permissions = []`.
        const err = toError(cause);
        setError(err);
        // eslint-disable-next-line no-console
        console.error('PermissionsProvider: failed to load user permissions', err);
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
    setError(null);
    try {
      const next = await service.getUserPermissions(userId);
      setPermissions(next);
    } catch (cause) {
      const err = toError(cause);
      setError(err);
      // eslint-disable-next-line no-console
      console.error('PermissionsProvider: refresh failed', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [service, userId]);

  const value = useMemo(
    () => ({ permissions, isLoading, error, refresh }),
    [permissions, isLoading, error, refresh]
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
