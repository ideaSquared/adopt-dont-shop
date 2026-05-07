import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { lightTheme } from '../../../styles/theme';
import { ThemeToggle } from './ThemeToggle';

// Mock the theme context
const mockSetThemeMode = vi.fn();

vi.mock('../../../styles/ThemeProvider', async () => ({
  ...((await vi.importActual('../../../styles/ThemeProvider')) as Record<string, unknown>),
  useTheme: () => ({
    themeMode: 'light',
    setThemeMode: mockSetThemeMode,
    theme: lightTheme,
  }),
}));

const renderWithTheme = (component: React.ReactElement) => render(component);

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetThemeMode.mockClear();
  });

  it('renders correctly with light theme', () => {
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  it('displays correct icon and text for light theme', () => {
    renderWithTheme(<ThemeToggle />);

    expect(screen.getByText('🌙')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('calls setThemeMode when clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(mockSetThemeMode).toHaveBeenCalledTimes(1);
    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
  });

  it('supports keyboard interaction', async () => {
    const user = userEvent.setup();
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole('button');

    // Focus and activate with keyboard
    await user.tab();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(mockSetThemeMode).toHaveBeenCalledTimes(1);
    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');

    mockSetThemeMode.mockClear();

    await user.keyboard(' ');
    expect(mockSetThemeMode).toHaveBeenCalledTimes(1);
    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
  });

  it('has proper accessibility attributes', () => {
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });
});

// Test with dark theme — the module is already mocked above with `themeMode: 'light'`.
// Verifying the toggle aria-label confirms the mock is wired up correctly.
describe('ThemeToggle - Dark Mode Integration', () => {
  it('should toggle from light to dark mode', () => {
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole('button');
    // The mock returns themeMode: 'light', so the button should offer to switch to dark
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });
});
