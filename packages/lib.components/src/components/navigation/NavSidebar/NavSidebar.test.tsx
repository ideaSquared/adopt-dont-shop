import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router';
import { vi } from 'vitest';

import { NavSidebar, type NavSidebarGroup } from './NavSidebar';

const groups: NavSidebarGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: '🏠', end: true },
      { to: '/pets', label: 'Pets', icon: '🐕' },
    ],
  },
  {
    id: 'comms',
    label: 'Comms',
    items: [{ to: '/messages', label: 'Messages', badge: 5, badgeAriaLabel: '5 unread messages' }],
  },
];

const renderSidebar = (props: Partial<React.ComponentProps<typeof NavSidebar>> = {}, route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <NavSidebar groups={groups} {...props} />
    </MemoryRouter>
  );

describe('NavSidebar', () => {
  it('renders grouped nav items with their group labels', () => {
    renderSidebar();
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pets/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /messages/i })).toBeInTheDocument();
  });

  it('marks the current route active via aria-current', () => {
    renderSidebar({}, '/pets');
    expect(screen.getByRole('link', { name: /pets/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveAttribute('aria-current');
  });

  it('renders a numeric badge with an accessible label', () => {
    renderSidebar();
    const badge = screen.getByText('5');
    expect(badge).toHaveAttribute('aria-label', '5 unread messages');
  });

  it('caps badges over 99', () => {
    render(
      <MemoryRouter>
        <NavSidebar groups={[{ id: 'g', items: [{ to: '/x', label: 'X', badge: 150 }] }]} />
      </MemoryRouter>
    );
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('shows a collapse control when collapsible and calls the toggle', () => {
    const onToggle = vi.fn();
    renderSidebar({ collapsible: true, collapsed: false, onToggleCollapsed: onToggle });
    fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders the footer slot', () => {
    renderSidebar({ footer: <button type='button'>Sign out</button> });
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('acts as a modal dialog when the mobile drawer is open', () => {
    renderSidebar({ mobileOpen: true, 'data-testid': 'sb' });
    const aside = screen.getByTestId('sb');
    expect(aside).toHaveAttribute('role', 'dialog');
    expect(aside).toHaveAttribute('aria-modal', 'true');
  });

  it('closes the drawer on Escape', () => {
    const onClose = vi.fn();
    renderSidebar({ mobileOpen: true, onMobileClose: onClose, 'data-testid': 'sb' });
    fireEvent.keyDown(screen.getByTestId('sb'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is not a dialog when the drawer is closed', () => {
    renderSidebar({ mobileOpen: false, 'data-testid': 'sb' });
    expect(screen.getByTestId('sb')).not.toHaveAttribute('role', 'dialog');
  });

  it('auto-closes the drawer after navigating to a new route', () => {
    const onClose = vi.fn();
    const Harness = () => {
      const navigate = useNavigate();
      return (
        <>
          <button type='button' onClick={() => navigate('/pets')}>
            navigate
          </button>
          <NavSidebar groups={groups} mobileOpen onMobileClose={onClose} />
        </>
      );
    };
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'navigate' }));
    expect(onClose).toHaveBeenCalled();
  });
});
