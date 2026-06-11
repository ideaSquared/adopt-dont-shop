/**
 * Accessibility tests for ActionMenu (ADS-127)
 *
 * Verifies the dropdown menu meets WCAG AA criteria:
 * - Trigger announces it controls a menu (aria-haspopup + aria-expanded)
 * - Dropdown has role="menu" and items have role="menuitem"
 * - Escape key closes the menu (keyboard users can dismiss without clicking)
 * - Arrow keys navigate between items (keyboard users don't need Tab)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { ActionMenu, type ActionMenuItem } from './ActionMenu';

const items: ActionMenuItem[] = [
  { id: 'edit', label: 'Edit', onClick: vi.fn() },
  { id: 'delete', label: 'Delete', danger: true, onClick: vi.fn() },
];

const openMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: /actions menu/i }));
};

describe('ActionMenu accessibility', () => {
  it('trigger has aria-haspopup="menu"', () => {
    render(<ActionMenu items={items} />);
    expect(screen.getByRole('button', { name: /actions menu/i })).toHaveAttribute(
      'aria-haspopup',
      'menu'
    );
  });

  it('trigger starts with aria-expanded="false"', () => {
    render(<ActionMenu items={items} />);
    expect(screen.getByRole('button', { name: /actions menu/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('trigger shows aria-expanded="true" when open', () => {
    render(<ActionMenu items={items} />);
    openMenu();
    expect(screen.getByRole('button', { name: /actions menu/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('dropdown has role="menu"', () => {
    render(<ActionMenu items={items} />);
    openMenu();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('each item has role="menuitem"', () => {
    render(<ActionMenu items={items} />);
    openMenu();
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(2);
    expect(menuItems[0]).toHaveTextContent('Edit');
    expect(menuItems[1]).toHaveTextContent('Delete');
  });

  it('Escape key closes the menu', () => {
    render(<ActionMenu items={items} />);
    openMenu();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ArrowDown moves focus to next menu item', () => {
    render(<ActionMenu items={items} />);
    openMenu();
    const menuItems = screen.getAllByRole('menuitem');
    menuItems[0].focus();
    fireEvent.keyDown(menuItems[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(menuItems[1]);
  });

  it('ArrowUp moves focus to previous menu item', () => {
    render(<ActionMenu items={items} />);
    openMenu();
    const menuItems = screen.getAllByRole('menuitem');
    menuItems[1].focus();
    fireEvent.keyDown(menuItems[1], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(menuItems[0]);
  });
});
