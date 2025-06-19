import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../../styles/ThemeProvider';
import { lightTheme as theme } from '../../../styles/theme';
import Dropdown from './DropdownMenu';

describe('Dropdown', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
  };

  it('renders the trigger label correctly', () => {
    renderWithTheme(<Dropdown triggerLabel='Menu' items={[]} />);

    // Check if the trigger label is rendered
    const triggerElement = screen.getByText('Menu');
    expect(triggerElement).toBeInTheDocument();
  });

  // TODO: Fix
  it.skip('shows dropdown items when the trigger is clicked', async () => {
    const items = [
      { label: 'Item 1', to: '/item1' },
      { label: 'Item 2', to: '/item2' },
    ];

    renderWithTheme(<Dropdown triggerLabel='Menu' items={items} />);

    // Click the trigger to open the dropdown
    const triggerElement = screen.getByText('Menu');
    fireEvent.click(triggerElement);

    // Ensure the dropdown has opened by checking for the presence of the dropdown items
    await waitFor(() => {
      items.forEach(item => {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      });
    });
  });

  // TODO: Fix
  it.skip('renders dropdown items with correct href attributes', async () => {
    const items = [
      { label: 'Item 1', to: '/item1' },
      { label: 'Item 2', to: '/item2' },
    ];

    renderWithTheme(<Dropdown triggerLabel='Menu' items={items} />);

    // Click the trigger to open the dropdown
    const triggerElement = screen.getByText('Menu');
    fireEvent.click(triggerElement);

    // Wait for the dropdown items to appear and check href attributes
    await waitFor(() => {
      items.forEach(item => {
        const linkElement = screen.getByText(item.label);
        expect(linkElement.closest('a')).toHaveAttribute('href', item.to);
      });
    });
  });
});
