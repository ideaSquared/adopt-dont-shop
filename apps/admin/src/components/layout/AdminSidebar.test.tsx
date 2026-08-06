import { describe, expect, it, vi } from 'vitest';
import React, { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// AdminSidebar now renders the shared NavSidebar (ADS-1077). We exercise the
// REAL NavSidebar so these tests assert on its actual output — grouped links,
// active state, badges, collapse control, and mobile dialog semantics — rather
// than a hand-rolled stub. Only Logo/ThemeProvider are stubbed: importing the
// full @adopt-dont-shop/lib.components barrel pulls recharts-backed components
// into the test bundle (see the note in setup-tests.ts), so we pull NavSidebar
// straight from its source module and provide lightweight stubs for the rest.
vi.mock('@adopt-dont-shop/lib.components', async () => {
  const { NavSidebar } =
    await import('../../../../../packages/lib.components/src/components/navigation/NavSidebar/NavSidebar');
  return {
    NavSidebar,
    Logo: () => null,
    ThemeProvider: ({ children }: { children: ReactNode }) => children,
  };
});

const mockCount = vi.fn<[], number>();

vi.mock('../../hooks/useMyInboxCount', () => ({
  useMyInboxCount: () => ({ count: mockCount() }),
}));

import { AdminSidebar } from './AdminSidebar';

type RenderOptions = {
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  route?: string;
};

const renderSidebar = ({
  collapsed = false,
  onToggle = () => undefined,
  mobileOpen,
  onMobileClose,
  route = '/',
}: RenderOptions = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AdminSidebar
        collapsed={collapsed}
        onToggle={onToggle}
        mobileOpen={mobileOpen}
        onMobileClose={onMobileClose}
      />
    </MemoryRouter>
  );

/**
 * ADS-652: The "System" sidebar section is ordered by frequency-of-use (the
 * items admins reach for most often appear first) and must not point to any
 * known-stub page.
 */
describe('AdminSidebar System section [ADS-652]', () => {
  const expectedSystemOrder = [
    { label: 'Audit Logs', href: '/audit' },
    { label: 'Security Center', href: '/security' },
    { label: 'Privacy Tools', href: '/privacy-tools' },
    { label: 'Configuration', href: '/configuration' },
    { label: 'Field Permissions', href: '/field-permissions' },
    { label: 'Reports', href: '/reports' },
  ];

  it('lists System items ordered by frequency-of-use', () => {
    mockCount.mockReturnValue(0);
    renderSidebar();

    const systemGroup = screen.getByRole('group', { name: 'System' });
    const links = within(systemGroup).getAllByRole('link');
    const visibleOrder = links.map(link => ({
      label: link.textContent?.trim() ?? '',
      href: link.getAttribute('href') ?? '',
    }));

    expect(visibleOrder).toEqual(expectedSystemOrder);
  });

  it('does not link to any known-stub pages', () => {
    mockCount.mockReturnValue(0);
    renderSidebar();

    // Sentinel list: if a future page is added but is a stub, add its path
    // here and the test will fail until it is removed from the sidebar or
    // completed. Reports (ADS-105) is fully implemented and NOT in this list.
    const knownStubRoutes: string[] = [];

    const hrefs = screen.getAllByRole('link').map(link => link.getAttribute('href') ?? '');

    for (const stub of knownStubRoutes) {
      expect(hrefs).not.toContain(stub);
    }
  });
});

/**
 * The migration must preserve every nav item, path, section label, and order.
 */
describe('AdminSidebar navigation structure [ADS-1077]', () => {
  it('renders every section heading in order', () => {
    mockCount.mockReturnValue(0);
    renderSidebar();

    // NavSidebar names each group via aria-labelledby → the heading element.
    const groups = screen.getAllByRole('group');
    const labels = groups.map(group => {
      const labelledBy = group.getAttribute('aria-labelledby');
      return labelledBy ? (document.getElementById(labelledBy)?.textContent ?? '') : '';
    });
    expect(labels).toEqual([
      'Main',
      'Management',
      'Safety & Support',
      'Content',
      'System',
      'Account',
    ]);
  });

  it('renders every nav link with its exact path in order', () => {
    mockCount.mockReturnValue(0);
    renderSidebar();

    const entries = screen
      .getAllByRole('link')
      .map(link => ({ label: link.textContent?.trim() ?? '', href: link.getAttribute('href') }));

    expect(entries).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Analytics', href: '/analytics' },
      { label: 'Users', href: '/users' },
      { label: 'Rescues', href: '/rescues' },
      { label: 'Pets', href: '/pets' },
      { label: 'Applications', href: '/applications' },
      { label: 'Inbox', href: '/inbox' },
      { label: 'Moderation', href: '/moderation' },
      { label: 'Support Tickets', href: '/support' },
      { label: 'Messages', href: '/messages' },
      { label: 'Broadcast', href: '/notifications/broadcast' },
      { label: 'Content Management', href: '/content-management' },
      { label: 'Audit Logs', href: '/audit' },
      { label: 'Security Center', href: '/security' },
      { label: 'Privacy Tools', href: '/privacy-tools' },
      { label: 'Configuration', href: '/configuration' },
      { label: 'Field Permissions', href: '/field-permissions' },
      { label: 'Reports', href: '/reports' },
      { label: 'Account Settings', href: '/account' },
    ]);
  });

  it('marks only the active route with aria-current', () => {
    mockCount.mockReturnValue(0);
    renderSidebar({ route: '/users' });

    const usersLink = screen.getByRole('link', { name: 'Users' });
    expect(usersLink).toHaveAttribute('aria-current', 'page');

    // Dashboard uses `end`, so it is not active on a non-root route.
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).not.toHaveAttribute('aria-current');
  });

  it('activates Dashboard only on the exact root path (end)', () => {
    mockCount.mockReturnValue(0);
    renderSidebar({ route: '/' });

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders the footer version text', () => {
    mockCount.mockReturnValue(0);
    renderSidebar();

    expect(screen.getByText('Admin Panel v1.0.0')).toBeInTheDocument();
    expect(screen.getByText("Adopt Don't Shop")).toBeInTheDocument();
  });
});

describe('AdminSidebar Inbox assigned-to-me badge', () => {
  it('renders the count badge next to the Inbox link when there are assigned items', () => {
    mockCount.mockReturnValue(7);
    renderSidebar();

    const inboxLink = screen.getByRole('link', { name: /Inbox/ });
    const badge = within(inboxLink).getByLabelText('7 items assigned to you');
    expect(badge).toHaveTextContent('7');
  });

  it('does not render a badge when the count is zero', () => {
    mockCount.mockReturnValue(0);
    renderSidebar();

    expect(screen.queryByLabelText(/items assigned to you/)).not.toBeInTheDocument();
  });
});

describe('AdminSidebar desktop collapse control', () => {
  it('calls onToggle when the collapse button is clicked', async () => {
    mockCount.mockReturnValue(0);
    const onToggle = vi.fn();
    renderSidebar({ onToggle });

    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('exposes an expand control when collapsed', () => {
    mockCount.mockReturnValue(0);
    renderSidebar({ collapsed: true });

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });
});

describe('AdminSidebar mobile off-canvas drawer', () => {
  it('closes the drawer when the close button is clicked', async () => {
    mockCount.mockReturnValue(0);
    const onMobileClose = vi.fn();
    renderSidebar({ mobileOpen: true, onMobileClose });

    await userEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }));

    expect(onMobileClose).toHaveBeenCalledTimes(1);
  });

  it('closes the drawer after navigating to a new route', async () => {
    mockCount.mockReturnValue(0);
    const onMobileClose = vi.fn();
    renderSidebar({ mobileOpen: true, onMobileClose, route: '/' });

    // Navigating away from the current route closes the drawer; the initial
    // mount does not, so the drawer can be opened on the current page.
    expect(onMobileClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('link', { name: 'Users' }));

    expect(onMobileClose).toHaveBeenCalled();
  });
});

// ADS-743: drawer is a modal dialog on mobile. Verifies dialog semantics,
// focus management, focus trap, Escape-to-close, and focus restore — all owned
// by the shared NavSidebar.
describe('AdminSidebar mobile drawer accessibility (ADS-743)', () => {
  it('exposes role="dialog" with aria-modal while the drawer is open', () => {
    mockCount.mockReturnValue(0);
    renderSidebar({ mobileOpen: true, onMobileClose: () => undefined });

    const dialog = screen.getByRole('dialog', { name: 'Main navigation' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('does not apply dialog semantics when the drawer is closed', () => {
    mockCount.mockReturnValue(0);
    renderSidebar({ mobileOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves focus to the close button when the drawer opens', async () => {
    mockCount.mockReturnValue(0);
    const { rerender } = render(
      <MemoryRouter>
        <AdminSidebar
          collapsed={false}
          onToggle={() => undefined}
          mobileOpen={false}
          onMobileClose={() => undefined}
        />
      </MemoryRouter>
    );

    rerender(
      <MemoryRouter>
        <AdminSidebar
          collapsed={false}
          onToggle={() => undefined}
          mobileOpen
          onMobileClose={() => undefined}
        />
      </MemoryRouter>
    );

    const closeButton = screen.getByRole('button', { name: 'Close navigation menu' });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(closeButton);
  });

  it('calls onMobileClose when Escape is pressed inside the drawer', async () => {
    mockCount.mockReturnValue(0);
    const onMobileClose = vi.fn();
    renderSidebar({ mobileOpen: true, onMobileClose });

    const closeButton = screen.getByRole('button', { name: 'Close navigation menu' });
    closeButton.focus();
    await userEvent.keyboard('{Escape}');

    expect(onMobileClose).toHaveBeenCalled();
  });

  it('restores focus to the previously focused element when the drawer closes', async () => {
    mockCount.mockReturnValue(0);
    const Harness: React.FC<{ open: boolean }> = ({ open }) => (
      <MemoryRouter>
        <button data-testid='external-trigger'>Trigger</button>
        <AdminSidebar
          collapsed={false}
          onToggle={() => undefined}
          mobileOpen={open}
          onMobileClose={() => undefined}
        />
      </MemoryRouter>
    );

    const { rerender } = render(<Harness open={false} />);
    const trigger = screen.getByTestId('external-trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    rerender(<Harness open={true} />);
    await new Promise(resolve => setTimeout(resolve, 0));

    rerender(<Harness open={false} />);
    expect(document.activeElement).toBe(trigger);
  });
});
