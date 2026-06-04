import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Permission, PermissionsService } from '@adopt-dont-shop/lib.permissions';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext';
import { PermissionsProvider } from '../contexts/PermissionsContext';
import { useHasAllPermissions, useHasAnyPermission, useHasPermission } from './useHasPermission';

const auth: AuthContextType = {
  user: { userId: 'user-1', userType: 'admin' } as AuthContextType['user'],
  isAuthenticated: true,
  isLoading: false,
  isInitializing: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  refreshUser: vi.fn(),
};

const wrap =
  (permissions: Permission[]) =>
  ({ children }: { children: ReactNode }) => {
    const service = {
      getUserPermissions: vi.fn().mockResolvedValue(permissions),
      clearCache: vi.fn(),
    } as unknown as PermissionsService;
    return (
      <AuthContext.Provider value={auth}>
        <PermissionsProvider service={service}>{children}</PermissionsProvider>
      </AuthContext.Provider>
    );
  };

const wrapWithService =
  (service: PermissionsService) =>
  ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={auth}>
      <PermissionsProvider service={service}>{children}</PermissionsProvider>
    </AuthContext.Provider>
  );

describe('useHasPermission', () => {
  it('returns allowed=true when the user holds the permission', async () => {
    const { result } = renderHook(() => useHasPermission('pets.create' as Permission), {
      wrapper: wrap(['pets.read', 'pets.create'] as Permission[]),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns allowed=false when the user lacks the permission', async () => {
    const { result } = renderHook(() => useHasPermission('pets.delete' as Permission), {
      wrapper: wrap(['pets.read'] as Permission[]),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reports isLoading=true during the initial fetch so callers can distinguish "loading" from "denied"', async () => {
    let resolveFetch: (perms: Permission[]) => void = () => {};
    const pending = new Promise<Permission[]>((resolve) => {
      resolveFetch = resolve;
    });
    const service = {
      getUserPermissions: vi.fn().mockReturnValue(pending),
      clearCache: vi.fn(),
    } as unknown as PermissionsService;

    const { result } = renderHook(() => useHasPermission('pets.create' as Permission), {
      wrapper: wrapWithService(service),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.allowed).toBe(false);
    expect(result.current.error).toBeNull();

    resolveFetch(['pets.create'] as Permission[]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });

  it('surfaces the error when the permissions fetch fails', async () => {
    const failure = new Error('boom');
    const service = {
      getUserPermissions: vi.fn().mockRejectedValue(failure),
      clearCache: vi.fn(),
    } as unknown as PermissionsService;

    const { result } = renderHook(() => useHasPermission('pets.create' as Permission), {
      wrapper: wrapWithService(service),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(failure);
    expect(result.current.allowed).toBe(false);
  });
});

describe('useHasAnyPermission', () => {
  it('returns allowed=true when at least one permission matches', async () => {
    const { result } = renderHook(
      () => useHasAnyPermission(['pets.delete', 'pets.create'] as Permission[]),
      { wrapper: wrap(['pets.create'] as Permission[]) }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });

  it('returns allowed=false when none of the required permissions match', async () => {
    const { result } = renderHook(
      () => useHasAnyPermission(['pets.delete', 'pets.archive'] as Permission[]),
      { wrapper: wrap(['pets.read'] as Permission[]) }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(false);
  });

  it('reports isLoading=true during the initial fetch', async () => {
    let resolveFetch: (perms: Permission[]) => void = () => {};
    const pending = new Promise<Permission[]>((resolve) => {
      resolveFetch = resolve;
    });
    const service = {
      getUserPermissions: vi.fn().mockReturnValue(pending),
      clearCache: vi.fn(),
    } as unknown as PermissionsService;

    const { result } = renderHook(() => useHasAnyPermission(['pets.create'] as Permission[]), {
      wrapper: wrapWithService(service),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.allowed).toBe(false);

    resolveFetch(['pets.create'] as Permission[]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });
});

describe('useHasAllPermissions', () => {
  it('returns allowed=true only when every required permission is held', async () => {
    const { result } = renderHook(
      () => useHasAllPermissions(['pets.read', 'pets.create'] as Permission[]),
      { wrapper: wrap(['pets.read', 'pets.create', 'pets.update'] as Permission[]) }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });

  it('returns allowed=false when any required permission is missing', async () => {
    const { result } = renderHook(
      () => useHasAllPermissions(['pets.read', 'pets.delete'] as Permission[]),
      { wrapper: wrap(['pets.read'] as Permission[]) }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(false);
  });

  it('reports isLoading=true during the initial fetch', async () => {
    let resolveFetch: (perms: Permission[]) => void = () => {};
    const pending = new Promise<Permission[]>((resolve) => {
      resolveFetch = resolve;
    });
    const service = {
      getUserPermissions: vi.fn().mockReturnValue(pending),
      clearCache: vi.fn(),
    } as unknown as PermissionsService;

    const { result } = renderHook(() => useHasAllPermissions(['pets.read'] as Permission[]), {
      wrapper: wrapWithService(service),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.allowed).toBe(false);

    resolveFetch(['pets.read'] as Permission[]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });
});
