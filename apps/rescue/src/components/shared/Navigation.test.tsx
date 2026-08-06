import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Permission } from '@adopt-dont-shop/lib.permissions';
import type { NavSidebarProps } from '@adopt-dont-shop/lib.components';

// Mock auth/permissions/chat contexts so we can vary user perms + unread
// count per test.
const mockedUseAuth = vi.fn();
const mockedUsePermissions = vi.fn();
const mockedUseChat = vi.fn();
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
  useChat: () => mockedUseChat(),
}));

// Navigation now delegates the sidebar itself to the shared NavSidebar. The
// real component is exercised by lib.components' own suite; here we stand it in
// with a faithful shim that renders the exact group/link/badge structure
// Navigation hands it, using REAL react-router NavLinks so active state
// (aria-current) and routing are genuine rather than faked. The controlled
// mobile drawer is mirrored just enough (role="dialog" + a close button wired
// to onMobileClose) to prove Navigation owns the trigger and open state. Logo
// pulls in vanilla-extract theme assets, so it stays a simple stub.
vi.mock('@adopt-dont-shop/lib.components', async () => {
  const { NavLink } = await import('react-router');

  const NavSidebar = ({
    groups,
    header,
    footer,
    mobileOpen = false,
    onMobileClose,
    ariaLabel = 'Main navigation',
  }: NavSidebarProps) => (
    <aside
      aria-label={ariaLabel}
      role={mobileOpen ? 'dialog' : undefined}
      aria-modal={mobileOpen ? true : undefined}
    >
      {header ? <div>{header}</div> : null}
      <button type="button" aria-label="Close navigation menu" onClick={onMobileClose}>
        ×
      </button>
      <nav>
        {groups.map(group => {
          const headingId = `nav-group-${group.id}`;
          return (
            <div key={group.id} role="group" aria-labelledby={group.label ? headingId : undefined}>
              {group.label ? <div id={headingId}>{group.label}</div> : null}
              <ul>
                {group.items.map(item => {
                  const showBadge = typeof item.badge === 'number' && item.badge > 0;
                  return (
                    <li key={item.to}>
                      <NavLink to={item.to} end={item.end}>
                        {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                        <span>{item.label}</span>
                        {showBadge ? (
                          <span aria-label={item.badgeAriaLabel}>{item.badge}</span>
                        ) : null}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      {footer ? <div>{footer}</div> : null}
    </aside>
  );

  return {
    Logo: () => <div data-testid="logo" />,
    NavSidebar,
  };
});

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

type RenderNavOptions = {
  permissions: Permission[];
  unreadMessageCount?: number;
  initialEntries?: string[];
  logout?: () => Promise<void>;
};

const renderNav = ({
  permissions,
  unreadMessageCount = 0,
  initialEntries = ['/'],
  logout = vi.fn(),
}: RenderNavOptions) => {
  mockedUseAuth.mockReturnValue({
    user: { userId: 'u1', firstName: 'Test', lastName: 'User', userType: 'rescue_staff' },
    logout,
    isLoading: false,
  });
  mockedUsePermissions.mockReturnValue({ permissions, isLoading: false, refresh: vi.fn() });
  mockedUseChat.mockReturnValue({ unreadMessageCount });

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Navigation />
    </MemoryRouter>
  );
};

describe('rescue Navigation [ADS-645 / A7 ADS-1077]', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
    mockedUsePermissions.mockReset();
    mockedUseChat.mockReset();
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
    expect(within(ops).getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/');
    expect(within(ops).getByRole('link', { name: /Pets/ })).toHaveAttribute('href', '/pets');
    expect(within(ops).getByRole('link', { name: /Applications/ })).toHaveAttribute(
      'href',
      '/applications'
    );
    expect(within(ops).getByRole('link', { name: /Foster/ })).toHaveAttribute('href', '/foster');
    expect(within(ops).getByRole('link', { name: /Events/ })).toHaveAttribute('href', '/events');
  });

  it('places Messages under Communication', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS });

    const comms = screen.getByRole('group', { name: 'Communication' });
    expect(within(comms).getByRole('link', { name: /Messages/ })).toHaveAttribute(
      'href',
      '/communication'
    );
  });

  it('places Staff, Analytics, Reports and Settings under Admin', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS });

    const admin = screen.getByRole('group', { name: 'Admin' });
    expect(within(admin).getByRole('link', { name: /Staff/ })).toHaveAttribute('href', '/staff');
    expect(within(admin).getByRole('link', { name: /Analytics/ })).toHaveAttribute(
      'href',
      '/analytics'
    );
    expect(within(admin).getByRole('link', { name: /Reports/ })).toHaveAttribute(
      'href',
      '/reports'
    );
    expect(within(admin).getByRole('link', { name: /Settings/ })).toHaveAttribute(
      'href',
      '/settings'
    );
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

  it('marks the current route active via aria-current, exact-matching the root Dashboard link', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS, initialEntries: ['/pets'] });

    expect(screen.getByRole('link', { name: /Pets/ })).toHaveAttribute('aria-current', 'page');
    // The root Dashboard link is `end`-matched, so it is not active on /pets.
    expect(screen.getByRole('link', { name: /Dashboard/ })).not.toHaveAttribute('aria-current');
  });

  it('marks Dashboard active only on the exact root route', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS, initialEntries: ['/'] });

    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('aria-current', 'page');
  });

  it('shows a pluralised unread-message badge on the Messages link', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS, unreadMessageCount: 3 });

    const messages = screen.getByRole('link', { name: /Messages/ });
    const badge = within(messages).getByText('3');
    expect(badge).toHaveAttribute('aria-label', '3 unread messages');
  });

  it('uses the singular badge label for a single unread message', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS, unreadMessageCount: 1 });

    const messages = screen.getByRole('link', { name: /Messages/ });
    const badge = within(messages).getByText('1');
    expect(badge).toHaveAttribute('aria-label', '1 unread message');
  });

  it('shows no badge on the Messages link when there are no unread messages', () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS, unreadMessageCount: 0 });

    expect(screen.getByRole('link', { name: 'Messages' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /unread message/ })).not.toBeInTheDocument();
  });

  it('renders a Sign Out button in the footer that logs the user out', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderNav({ permissions: RESCUE_ADMIN_PERMS, logout });

    const signOut = screen.getByRole('button', { name: 'Sign Out' });
    await userEvent.click(signOut);

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the mobile drawer via the hamburger and close controls', async () => {
    renderNav({ permissions: RESCUE_ADMIN_PERMS });

    const hamburger = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(hamburger);

    expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }));

    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
