import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import Dropdown from './DropdownMenu';

describe('Dropdown', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
  };

  it('renders the trigger label correctly', () => {
    renderWithTheme(<Dropdown triggerLabel='Menu' items={[]} />);

    // Check if the trigger label is rendered
    const triggerElement = screen.getByText('Menu');
    expect(triggerElement).toBeInTheDocument();
  });

  it.skip('shows dropdown items when the trigger is clicked', async () => {
    const items = [
      { label: 'Item 1', to: '/item1' },
      { label: 'Item 2', to: '/item2' },
    ];

    const user = userEvent.setup();
    renderWithTheme(<Dropdown triggerLabel='Menu' items={items} />);

    // The trigger is a span, so use keyboard to open (Space or Enter)
    const triggerElement = screen.getByText('Menu');
    triggerElement.focus();
    await user.keyboard('{Enter}');

    // Ensure the dropdown has opened by checking for the presence of the dropdown items
    await waitFor(() => {
      items.forEach(item => {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      });
    });
  });

  it.skip('renders dropdown items with correct href attributes', async () => {
    const items = [
      { label: 'Item 1', to: '/item1' },
      { label: 'Item 2', to: '/item2' },
    ];

    const user = userEvent.setup();
    renderWithTheme(<Dropdown triggerLabel='Menu' items={items} />);

    const triggerElement = screen.getByText('Menu');
    triggerElement.focus();
    await user.keyboard('{Enter}');

    // Wait for the dropdown items to appear and check href attributes
    await waitFor(() => {
      items.forEach(item => {
        const linkElement = screen.getByText(item.label);
        expect(linkElement.closest('a')).toHaveAttribute('href', item.to);
      });
    });
  });
});
