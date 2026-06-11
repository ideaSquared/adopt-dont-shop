import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Permission, PermissionsService } from '@adopt-dont-shop/lib.permissions';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext';
import { PermissionsProvider } from '../contexts/PermissionsContext';
import { PermissionGate } from './PermissionGate';

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

const renderWithPermissions = (permissions: Permission[], ui: ReactNode) => {
  const service = {
    getUserPermissions: vi.fn().mockResolvedValue(permissions),
    clearCache: vi.fn(),
  } as unknown as PermissionsService;
  return render(
    <AuthContext.Provider value={auth}>
      <PermissionsProvider service={service}>{ui}</PermissionsProvider>
    </AuthContext.Provider>
  );
};

describe('PermissionGate', () => {
  it('renders children when the user holds the required permission', async () => {
    renderWithPermissions(
      ['pets.create'] as Permission[],
      <PermissionGate permission={'pets.create' as Permission}>
        <button>Add pet</button>
      </PermissionGate>
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add pet' })).toBeInTheDocument()
    );
  });

  it('renders the fallback when the user lacks the required permission', async () => {
    renderWithPermissions(
      ['pets.read'] as Permission[],
      <PermissionGate permission={'pets.create' as Permission} fallback={<span>read-only</span>}>
        <button>Add pet</button>
      </PermissionGate>
    );

    await waitFor(() => expect(screen.getByText('read-only')).toBeInTheDocument());
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing when no permission and no fallback are provided', async () => {
    renderWithPermissions(
      [] as Permission[],
      <PermissionGate permission={'pets.create' as Permission}>
        <button>Add pet</button>
      </PermissionGate>
    );

    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
  });

  it('renders children with anyOf when one of the listed permissions is held', async () => {
    renderWithPermissions(
      ['pets.update'] as Permission[],
      <PermissionGate anyOf={['pets.create', 'pets.update'] as Permission[]}>
        <span>can edit</span>
      </PermissionGate>
    );

    await waitFor(() => expect(screen.getByText('can edit')).toBeInTheDocument());
  });

  it('renders fallback with anyOf when none of the listed permissions are held', async () => {
    renderWithPermissions(
      ['pets.read'] as Permission[],
      <PermissionGate
        anyOf={['pets.create', 'pets.update'] as Permission[]}
        fallback={<span>no edit</span>}
      >
        <span>can edit</span>
      </PermissionGate>
    );

    await waitFor(() => expect(screen.getByText('no edit')).toBeInTheDocument());
  });

  it('renders children with allOf only when every listed permission is held', async () => {
    renderWithPermissions(
      ['pets.create', 'pets.update'] as Permission[],
      <PermissionGate allOf={['pets.create', 'pets.update'] as Permission[]}>
        <span>full edit</span>
      </PermissionGate>
    );

    await waitFor(() => expect(screen.getByText('full edit')).toBeInTheDocument());
  });

  it('renders fallback with allOf when one of the required permissions is missing', async () => {
    renderWithPermissions(
      ['pets.create'] as Permission[],
      <PermissionGate
        allOf={['pets.create', 'pets.update'] as Permission[]}
        fallback={<span>partial</span>}
      >
        <span>full edit</span>
      </PermissionGate>
    );

    await waitFor(() => expect(screen.getByText('partial')).toBeInTheDocument());
  });
});
