import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { lightTheme } from '../../../styles/theme';
import { ThemeToggle } from './ThemeToggle';

const mockSetThemeMode = vi.fn();
let mockThemeMode: 'light' | 'normal' | 'dark' = 'light';

vi.mock('../../../styles/ThemeProvider', async () => ({
  ...((await vi.importActual('../../../styles/ThemeProvider')) as Record<string, unknown>),
  useTheme: () => ({
    themeMode: mockThemeMode,
    setThemeMode: mockSetThemeMode,
    theme: lightTheme,
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetThemeMode.mockClear();
    mockThemeMode = 'light';
  });

  it('shows the current theme label and cycles to the next on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to Cosy theme');
    expect(screen.getByText('Light')).toBeInTheDocument();

    await user.click(button);
    expect(mockSetThemeMode).toHaveBeenCalledWith('normal');
  });

  it('cycles light → normal → dark → light', () => {
    mockThemeMode = 'normal';
    const { rerender } = render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to Dark theme');

    mockThemeMode = 'dark';
    rerender(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to Light theme');
  });

  it('activates with keyboard', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(mockSetThemeMode).toHaveBeenCalledWith('normal');
  });
});
