import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import Dropdown from './DropdownMenu';

/**
 * Dropdown wraps @radix-ui/react-dropdown-menu. The behaviours the consumer
 * cares about are:
 *   - the labelled trigger is rendered
 *   - opening the menu reveals each configured item, with hrefs preserved
 *     for navigational items and click handlers for action items
 *
 * Radix relies on `pointerdown` events that JSDOM doesn't fully synthesize
 * via userEvent, so we use fireEvent.pointerDown which Radix accepts.
 */
describe('Dropdown', () => {
  const renderUI = (component: React.ReactElement) => render(component);

  it('renders the trigger label', () => {
    renderUI(<Dropdown triggerLabel='Menu' items={[]} />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('reveals navigational items with their hrefs when opened', async () => {
    const items = [
      { label: 'Profile', to: '/profile' },
      { label: 'Settings', to: '/settings' },
    ];
    renderUI(<Dropdown triggerLabel='Menu' items={items} />);

    const trigger = screen.getByText('Menu');
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
    expect(screen.getByText('Profile').closest('a')).toHaveAttribute('href', '/profile');
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
  });

  it('invokes the item callback when an action item is selected', async () => {
    const onSelect = vi.fn();
    const items = [{ label: 'Sign out', onClick: onSelect }];
    renderUI(<Dropdown triggerLabel='Menu' items={items} />);

    const trigger = screen.getByText('Menu');
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(trigger);

    const item = await screen.findByText('Sign out');
    fireEvent.pointerDown(item, { button: 0, pointerType: 'mouse' });
    fireEvent.pointerUp(item, { button: 0, pointerType: 'mouse' });
    fireEvent.click(item);

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalled();
    });
  });
});
