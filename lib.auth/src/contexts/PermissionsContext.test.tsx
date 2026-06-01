import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Permission, PermissionsService } from '@adopt-dont-shop/lib.permissions';
import { AuthContext, type AuthContextType } from './AuthContext';
import { PermissionsProvider, usePermissions } from './PermissionsContext';

const buildAuth = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: { userId: 'user-1', userType: 'admin' } as AuthContextType['user'],
  isAuthenticated: true,
  isLoading: false,
  isInitializing: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  refreshUser: vi.fn(),
  ...overrides,
});

const buildService = (
  permissions: Permission[] = []
): PermissionsService & { getUserPermissions: ReturnType<typeof vi.fn> } => {
  const getUserPermissions = vi.fn().mockResolvedValue(permissions);
  return {
    getUserPermissions,
    clearCache: vi.fn(),
  } as unknown as PermissionsService & {
    getUserPermissions: ReturnType<typeof vi.fn>;
  };
};

const wrap =
  (auth: AuthContextType, service: PermissionsService) =>
  ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={auth}>
      <PermissionsProvider service={service}>{children}</PermissionsProvider>
    </AuthContext.Provider>
  );

describe('PermissionsProvider', () => {
  it('loads the signed-in user permissions from the service', async () => {
    const service = buildService(['pets.read' as Permission, 'pets.create' as Permission]);
    const { result } = renderHook(() => usePermissions(), { wrapper: wrap(buildAuth(), service) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(service.getUserPermissions).toHaveBeenCalledWith('user-1');
    expect(result.current.permissions).toEqual(['pets.read', 'pets.create']);
  });

  it('returns an empty permission set when no user is signed in', async () => {
    const service = buildService(['pets.read' as Permission]);
    const auth = buildAuth({ user: null, isAuthenticated: false });

    const { result } = renderHook(() => usePermissions(), { wrapper: wrap(auth, service) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(service.getUserPermissions).not.toHaveBeenCalled();
    expect(result.current.permissions).toEqual([]);
  });

  it('refresh() clears the cache and re-fetches permissions', async () => {
    const service = buildService(['pets.read' as Permission]);
    const { result } = renderHook(() => usePermissions(), { wrapper: wrap(buildAuth(), service) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    service.getUserPermissions.mockResolvedValueOnce(['pets.read', 'pets.update'] as Permission[]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(service.clearCache).toHaveBeenCalledWith('user-1');
    expect(result.current.permissions).toEqual(['pets.read', 'pets.update']);
  });

  it('throws when usePermissions is used outside the provider', () => {
    const Consumer = () => {
      usePermissions();
      return null;
    };

    expect(() => render(<Consumer />)).toThrow(/PermissionsProvider/);
  });

  it('keeps loading state stable while permissions are in flight', async () => {
    let resolvePermissions: (value: Permission[]) => void = () => {};
    const pending = new Promise<Permission[]>((resolve) => {
      resolvePermissions = resolve;
    });
    const service = {
      getUserPermissions: vi.fn().mockReturnValue(pending),
      clearCache: vi.fn(),
    } as unknown as PermissionsService;

    const { result } = renderHook(() => usePermissions(), { wrapper: wrap(buildAuth(), service) });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePermissions(['pets.read' as Permission]);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.permissions).toEqual(['pets.read']);
  });

  it('renders children once the provider is mounted', () => {
    render(
      <AuthContext.Provider value={buildAuth()}>
        <PermissionsProvider service={buildService()}>
          <span>visible</span>
        </PermissionsProvider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('visible')).toBeInTheDocument();
  });
});
