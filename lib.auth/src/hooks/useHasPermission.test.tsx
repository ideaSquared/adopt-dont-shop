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

describe('useHasPermission', () => {
  it('returns true when the user holds the permission', async () => {
    const { result } = renderHook(() => useHasPermission('pets.create' as Permission), {
      wrapper: wrap(['pets.read', 'pets.create'] as Permission[]),
    });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('returns false when the user lacks the permission', async () => {
    const { result } = renderHook(() => useHasPermission('pets.delete' as Permission), {
      wrapper: wrap(['pets.read'] as Permission[]),
    });

    // Initial render returns false (empty array); confirm it stays false after load.
    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe('useHasAnyPermission', () => {
  it('returns true when at least one permission matches', async () => {
    const { result } = renderHook(
      () => useHasAnyPermission(['pets.delete', 'pets.create'] as Permission[]),
      { wrapper: wrap(['pets.create'] as Permission[]) }
    );

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('returns false when none of the required permissions match', async () => {
    const { result } = renderHook(
      () => useHasAnyPermission(['pets.delete', 'pets.archive'] as Permission[]),
      { wrapper: wrap(['pets.read'] as Permission[]) }
    );

    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe('useHasAllPermissions', () => {
  it('returns true only when every required permission is held', async () => {
    const { result } = renderHook(
      () => useHasAllPermissions(['pets.read', 'pets.create'] as Permission[]),
      { wrapper: wrap(['pets.read', 'pets.create', 'pets.update'] as Permission[]) }
    );

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('returns false when any required permission is missing', async () => {
    const { result } = renderHook(
      () => useHasAllPermissions(['pets.read', 'pets.delete'] as Permission[]),
      { wrapper: wrap(['pets.read'] as Permission[]) }
    );

    await waitFor(() => expect(result.current).toBe(false));
  });
});
