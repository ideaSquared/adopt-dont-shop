import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import type { Permission } from '@adopt-dont-shop/lib.permissions';

// Mock auth/permissions/chat contexts so we can vary user perms per test.
const mockedUseAuth = vi.fn();
const mockedUsePermissions = vi.fn();
vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => mockedUseAuth(),
    usePermissions: () => mockedUsePermissions(),
  };
});

vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => ({ unreadMessageCount: 0 }),
}));

// Logo component pulls in vanilla-extract theme assets; a simple stub is enough.
vi.mock('@adopt-dont-shop/lib.components', () => ({
  Logo: () => <div data-testid="logo" />,
}));

import Navigation from './Navigation';

// Realistic permission slices per the seeded backend role assignments.
const RESCUE_ADMIN_PERMS = [
  'pets.read',
  'pets.create',
  'pets.update',
  'applications.read',
  'reports.read.rescue',
  'reports.create',
] as Permission[];

const RESCUE_STAFF_PERMS = [
  'pets.read',
  'pets.create',
  'applications.read',
  'reports.read.rescue',
] as Permission[];

const RESCUE_VOLUNTEER_PERMS = ['pets.read', 'applications.read'] as Permission[];

const renderNav = ({ permissions }: { permissions: Permission[] }) => {
  mockedUseAuth.mockReturnValue({
    user: { userId: 'u1', firstName: 'Test', lastName: 'User', userType: 'rescue_staff' },
    logout: vi.fn(),
    isLoading: false,
  });
  mockedUsePermissions.mockReturnValue({ permissions, isLoading: false, refresh: vi.fn() });

  return render(
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>
  );
};

describe('rescue Navigation [ADS-645]', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
    mockedUsePermissions.mockReset();
  });

  it('renders Operations, Communication and Admin groups', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS });

    expect(screen.getByRole('group', { name: 'Operations' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Communication' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Admin' })).toBeInTheDocument();
  });

  it('places Dashboard, Pets, Applications, Foster and Events under Operations', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS });

    const ops = screen.getByRole('group', { name: 'Operations' });
    expect(within(ops).getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    expect(within(ops).getByRole('link', { name: /Pets/ })).toBeInTheDocument();
    expect(within(ops).getByRole('link', { name: /Applications/ })).toBeInTheDocument();
    expect(within(ops).getByRole('link', { name: /Foster/ })).toBeInTheDocument();
    expect(within(ops).getByRole('link', { name: /Events/ })).toBeInTheDocument();
  });

  it('places Messages under Communication', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS });

    const comms = screen.getByRole('group', { name: 'Communication' });
    expect(within(comms).getByRole('link', { name: /Messages/ })).toBeInTheDocument();
  });

  it('places Staff, Analytics, Reports and Settings under Admin', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS });

    const admin = screen.getByRole('group', { name: 'Admin' });
    expect(within(admin).getByRole('link', { name: /Staff/ })).toBeInTheDocument();
    expect(within(admin).getByRole('link', { name: /Analytics/ })).toBeInTheDocument();
    expect(within(admin).getByRole('link', { name: /Reports/ })).toBeInTheDocument();
    expect(within(admin).getByRole('link', { name: /Settings/ })).toBeInTheDocument();
  });

  it('hides Analytics from users without reports.read.rescue (e.g. volunteers)', () => {
    renderNav({ permissions: RESCUE_VOLUNTEER_PERMS });

    expect(screen.queryByRole('link', { name: /Analytics/ })).not.toBeInTheDocument();
  });

  it('still shows Pets and Applications to volunteers', () => {
    renderNav({ permissions: RESCUE_VOLUNTEER_PERMS });

    expect(screen.getByRole('link', { name: /Pets/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Applications/ })).toBeInTheDocument();
  });

  it('shows Analytics to rescue admins', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS });

    expect(screen.getByRole('link', { name: /Analytics/ })).toBeInTheDocument();
  });

  it('shows Analytics to rescue staff', () => {
    renderNav({ permissions: RESCUE_STAFF_PERMS });

    expect(screen.getByRole('link', { name: /Analytics/ })).toBeInTheDocument();
  });
});
