import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../styles/theme';
import { Navbar } from './Navbar';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

const mockNavItems = [
  { label: 'Home', href: '/' },
  { label: 'Pets', href: '/pets' },
  { label: 'About', href: '/about' },
];

describe('Navbar', () => {
  it('renders correctly with navigation items', () => {
    renderWithTheme(<Navbar items={mockNavItems} />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Pets')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('handles item clicks', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    const itemsWithClick = [
      { label: 'Home', onClick: handleClick },
      { label: 'About', href: '/about' },
    ];

    renderWithTheme(<Navbar items={itemsWithClick} />);

    const homeItem = screen.getByText('Home');
    await user.click(homeItem);

    expect(handleClick).toHaveBeenCalled();
  });

  it('shows mobile menu toggle on small screens', () => {
    renderWithTheme(<Navbar items={mockNavItems} />);

    const menuToggle = screen.getByLabelText('Toggle mobile menu');
    expect(menuToggle).toBeInTheDocument();
  });

  it('renders brand/logo when provided', () => {
    renderWithTheme(<Navbar items={mockNavItems} brand='My App' />);

    expect(screen.getByText('My App')).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Navbar items={mockNavItems} data-testid='test-navbar' />);
    const navbar = screen.getByTestId('test-navbar');
    expect(navbar).toBeInTheDocument();
  });
});
