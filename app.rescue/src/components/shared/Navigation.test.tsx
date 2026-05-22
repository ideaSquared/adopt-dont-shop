import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import { RescueRole } from '@adopt-dont-shop/lib.auth';

// Mock auth/chat contexts so we can vary user role per test.
const mockedUseAuth = vi.fn();
vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => mockedUseAuth(),
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

type AuthOverrides = {
  role?: RescueRole;
  userType?: string;
};

const renderNav = ({ role, userType = 'rescue_staff' }: AuthOverrides = {}) => {
  mockedUseAuth.mockReturnValue({
    user: {
      userId: 'u1',
      firstName: 'Test',
      lastName: 'User',
      userType,
      role,
    },
    logout: vi.fn(),
    isLoading: false,
  });

  return render(
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>
  );
};

describe('rescue Navigation [ADS-645]', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
  });

  it('renders Operations, Communication and Admin groups', () => {
    renderNav({ role: RescueRole.RESCUE_ADMIN });

    expect(screen.getByRole('group', { name: 'Operations' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Communication' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Admin' })).toBeInTheDocument();
  });

  it('places Dashboard, Pets, Applications, Foster and Events under Operations', () => {
    renderNav({ role: RescueRole.RESCUE_ADMIN });

    const ops = screen.getByRole('group', { name: 'Operations' });
    expect(within(ops).getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    expect(within(ops).getByRole('link', { name: /Pets/ })).toBeInTheDocument();
    expect(within(ops).getByRole('link', { name: /Applications/ })).toBeInTheDocument();
    expect(within(ops).getByRole('link', { name: /Foster/ })).toBeInTheDocument();
    expect(within(ops).getByRole('link', { name: /Events/ })).toBeInTheDocument();
  });

  it('places Messages under Communication', () => {
    renderNav({ role: RescueRole.RESCUE_ADMIN });

    const comms = screen.getByRole('group', { name: 'Communication' });
    expect(within(comms).getByRole('link', { name: /Messages/ })).toBeInTheDocument();
  });

  it('places Staff, Analytics, Reports and Settings under Admin', () => {
    renderNav({ role: RescueRole.RESCUE_ADMIN });

    const admin = screen.getByRole('group', { name: 'Admin' });
    expect(within(admin).getByRole('link', { name: /Staff/ })).toBeInTheDocument();
    expect(within(admin).getByRole('link', { name: /Analytics/ })).toBeInTheDocument();
    expect(within(admin).getByRole('link', { name: /Reports/ })).toBeInTheDocument();
    expect(within(admin).getByRole('link', { name: /Settings/ })).toBeInTheDocument();
  });

  it('hides Analytics from rescue volunteers', () => {
    renderNav({ role: RescueRole.RESCUE_VOLUNTEER });

    expect(screen.queryByRole('link', { name: /Analytics/ })).not.toBeInTheDocument();
  });

  it('still shows Pets and Applications to rescue volunteers', () => {
    renderNav({ role: RescueRole.RESCUE_VOLUNTEER });

    expect(screen.getByRole('link', { name: /Pets/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Applications/ })).toBeInTheDocument();
  });

  it('shows Analytics to rescue admins', () => {
    renderNav({ role: RescueRole.RESCUE_ADMIN });

    expect(screen.getByRole('link', { name: /Analytics/ })).toBeInTheDocument();
  });

  it('shows Analytics to rescue staff', () => {
    renderNav({ role: RescueRole.RESCUE_STAFF });

    expect(screen.getByRole('link', { name: /Analytics/ })).toBeInTheDocument();
  });
});
