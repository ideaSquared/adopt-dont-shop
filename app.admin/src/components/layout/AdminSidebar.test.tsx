import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The global setup-tests.ts mock of @adopt-dont-shop/lib.components doesn't
// export Logo (which AdminSidebar pulls in for the header). The previous
// importActual approach started pulling recharts into the test bundle on
// Vitest 4, so we now extend the existing stub inline.
vi.mock('@adopt-dont-shop/lib.components', () => ({
  Logo: () => null,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockCount = vi.fn<[], number>();

vi.mock('../../hooks/useMyInboxCount', () => ({
  useMyInboxCount: () => ({ count: mockCount() }),
}));

import React from 'react';
import { AdminSidebar } from './AdminSidebar';

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <AdminSidebar collapsed={false} onToggle={() => undefined} />
    </MemoryRouter>
  );

/**
 * ADS-652: The "System" sidebar section was a junk drawer of six items in
 * an order driven by no particular logic. We reorder by frequency-of-use
 * (the items admins reach for most often appear first) and ensure no
 * sidebar entry points to a known-stub page.
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

    const systemHeading = screen.getByText('System');
    const systemSection = systemHeading.parentElement;
    expect(systemSection).not.toBeNull();
    if (!systemSection) {
      return;
    }

    const links = within(systemSection).getAllByRole('link');
    const visibleOrder = links.map(link => ({
      label: link.textContent?.trim() ?? '',
      href: link.getAttribute('href') ?? '',
    }));

    expect(visibleOrder).toEqual(expectedSystemOrder);
  });

  it('does not link to any known-stub pages', () => {
    mockCount.mockReturnValue(0);
    renderSidebar();

    // Sentinel list: if a future page is added to System but is a stub,
    // add its path here and the test will fail until it is removed from
    // the sidebar or completed. Reports (ADS-105) is fully implemented
    // and is intentionally NOT in this list.
    const knownStubRoutes: string[] = [];

    const allLinks = screen.getAllByRole('link');
    const hrefs = allLinks.map(link => link.getAttribute('href') ?? '');

    for (const stub of knownStubRoutes) {
      expect(hrefs).not.toContain(stub);
    }
  });
});

describe('AdminSidebar Inbox assigned-to-me badge', () => {
  it('renders the count badge next to the Inbox link when there are assigned items', () => {
    mockCount.mockReturnValue(7);
    renderSidebar();

    const badge = screen.getByTestId('inbox-my-queue-badge');
    expect(badge).toHaveTextContent('7');

    const inboxLink = screen.getByRole('link', { name: /Inbox/ });
    expect(inboxLink).toContainElement(badge);
  });

  it('does not render a badge when the count is zero', () => {
    mockCount.mockReturnValue(0);
    renderSidebar();

    expect(screen.queryByTestId('inbox-my-queue-badge')).not.toBeInTheDocument();
  });
});

describe('AdminSidebar mobile off-canvas drawer', () => {
  it('closes the drawer when the close button is clicked', async () => {
    mockCount.mockReturnValue(0);
    const onMobileClose = vi.fn();
    render(
      <MemoryRouter>
        <AdminSidebar
          collapsed={false}
          onToggle={() => undefined}
          mobileOpen
          onMobileClose={onMobileClose}
        />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }));

    expect(onMobileClose).toHaveBeenCalledTimes(1);
  });

  it('closes the drawer after navigating to a new route', async () => {
    mockCount.mockReturnValue(0);
    const onMobileClose = vi.fn();
    render(
      <MemoryRouter initialEntries={['/']}>
        <AdminSidebar
          collapsed={false}
          onToggle={() => undefined}
          mobileOpen
          onMobileClose={onMobileClose}
        />
      </MemoryRouter>
    );

    // Navigating away from the current route closes the drawer; the initial
    // mount does not, so the drawer can be opened on the current page.
    expect(onMobileClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('link', { name: 'Users' }));

    expect(onMobileClose).toHaveBeenCalled();
  });
});

// ADS-743: drawer is a modal dialog on mobile. Verifies dialog semantics,
// focus management, focus trap, Escape-to-close, and focus restore.
describe('AdminSidebar mobile drawer accessibility (ADS-743)', () => {
  it('exposes role="dialog" with aria-modal while the drawer is open', () => {
    mockCount.mockReturnValue(0);
    render(
      <MemoryRouter>
        <AdminSidebar
          collapsed={false}
          onToggle={() => undefined}
          mobileOpen
          onMobileClose={() => undefined}
        />
      </MemoryRouter>
    );

    const dialog = screen.getByRole('dialog', { name: 'Main navigation' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('does not apply dialog semantics when the drawer is closed', () => {
    mockCount.mockReturnValue(0);
    render(
      <MemoryRouter>
        <AdminSidebar collapsed={false} onToggle={() => undefined} mobileOpen={false} />
      </MemoryRouter>
    );

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
    render(
      <MemoryRouter>
        <AdminSidebar
          collapsed={false}
          onToggle={() => undefined}
          mobileOpen
          onMobileClose={onMobileClose}
        />
      </MemoryRouter>
    );

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
