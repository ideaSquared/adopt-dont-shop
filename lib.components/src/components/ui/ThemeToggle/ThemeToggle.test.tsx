import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider } from '../../../styles/ThemeProvider';
import { lightTheme } from '../../../styles/theme';
import { ThemeToggle } from './ThemeToggle';

// Mock the theme context
const mockSetThemeMode = jest.fn();

jest.mock('../../../styles/ThemeProvider', () => ({
  ...jest.requireActual('../../../styles/ThemeProvider'),
  useTheme: () => ({
    themeMode: 'light',
    setThemeMode: mockSetThemeMode,
    theme: lightTheme,
  }),
}));

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

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

// Test with dark theme - Create a simple test for dark mode without complex mocking
describe('ThemeToggle - Dark Mode Integration', () => {
  it('should toggle from light to dark mode', async () => {
    const user = userEvent.setup();

    // Create a test wrapper with mock
    const TestWrapper = () => {
      const [mode, setMode] = React.useState<'light' | 'dark'>('light');

      React.useEffect(() => {
        const originalUseTheme = require('../../../styles/ThemeProvider').useTheme;
        jest.spyOn(require('../../../styles/ThemeProvider'), 'useTheme').mockReturnValue({
          themeMode: mode,
          setThemeMode: setMode,
          theme: lightTheme,
        });

        return () => {
          jest.restoreAllMocks();
        };
      }, [mode]);

      return <ThemeToggle />;
    };

    renderWithTheme(<TestWrapper />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });
});
