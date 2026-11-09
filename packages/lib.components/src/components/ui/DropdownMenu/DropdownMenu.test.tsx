import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DropdownMenu } from './DropdownMenu';

const openMenu = async (name: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name }));
  return user;
};

describe('DropdownMenu', () => {
  it('renders a labelled trigger and keeps the menu closed', () => {
    render(<DropdownMenu triggerLabel='Menu' items={[{ label: 'Profile' }]} />);

    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens a menu named after its trigger listing each item', async () => {
    render(
      <DropdownMenu triggerLabel='Menu' items={[{ label: 'Profile' }, { label: 'Settings' }]} />
    );
    await openMenu('Menu');

    expect(await screen.findByRole('menu', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      'Profile',
      'Settings',
    ]);
  });

  it('renders navigational items as links with their hrefs', async () => {
    render(<DropdownMenu triggerLabel='Menu' items={[{ label: 'Profile', to: '/profile' }]} />);
    await openMenu('Menu');

    expect(await screen.findByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/profile'
    );
  });

  it('calls onClick and closes the menu when an action item is chosen', async () => {
    const onSelect = vi.fn();
    render(<DropdownMenu triggerLabel='Menu' items={[{ label: 'Sign out', onClick: onSelect }]} />);
    const user = await openMenu('Menu');

    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('supports keyboard navigation and Escape to close', async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        triggerLabel='Menu'
        items={[{ label: 'First' }, { label: 'Second', onClick: onSelect }]}
      />
    );
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);

    await user.keyboard('{Enter}');
    await screen.findByRole('menu');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
  });

  it('does not call onClick for disabled items', async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        triggerLabel='Menu'
        items={[{ label: 'Export', onClick: onSelect, disabled: true }]}
      />
    );
    const user = await openMenu('Menu');

    const item = await screen.findByRole('menuitem', { name: 'Export' });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    await user.click(item);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows item descriptions, the header and separators', async () => {
    render(
      <DropdownMenu
        triggerLabel='Export'
        header='Export as'
        items={[
          { label: 'CSV', description: 'Spreadsheet-compatible', icon: <svg /> },
          { label: 'Log out', danger: true, separatorBefore: true },
        ]}
      />
    );
    await openMenu('Export');

    expect(await screen.findByText('Export as')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /CSV/ })).toHaveTextContent(
      'Spreadsheet-compatible'
    );
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('opens from a custom trigger element', async () => {
    render(
      <DropdownMenu
        triggerLabel='User menu'
        trigger={<button type='button'>Avatar</button>}
        items={[{ label: 'Profile' }]}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'User menu' }));

    expect(await screen.findByRole('menu', { name: 'User menu' })).toBeInTheDocument();
  });

  it('does not open when disabled', async () => {
    render(<DropdownMenu triggerLabel='Menu' disabled items={[{ label: 'Profile' }]} />);

    expect(screen.getByRole('button', { name: 'Menu' })).toBeDisabled();
  });
});
