import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  HIGH_CONTRAST_STORAGE_KEY,
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from './ThemeProvider';

const Probe: React.FC = () => {
  const { themeMode, highContrast, theme, toggleHighContrast, setHighContrast } = useTheme();
  return (
    <div>
      <span data-testid='mode'>{themeMode}</span>
      <span data-testid='high-contrast'>{String(highContrast)}</span>
      <span data-testid='theme-mode'>{theme.mode}</span>
      <button onClick={toggleHighContrast}>toggle</button>
      <button onClick={() => setHighContrast(true)}>enable</button>
      <button onClick={() => setHighContrast(false)}>disable</button>
    </div>
  );
};

describe('ThemeProvider — high-contrast behaviour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-high-contrast');
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('defaults to high-contrast off and applies the light theme', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('high-contrast').textContent).toBe('false');
    expect(screen.getByTestId('mode').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-high-contrast')).toBe('false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('switches the active theme to high-contrast when toggled on', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'toggle' }));

    expect(screen.getByTestId('high-contrast').textContent).toBe('true');
    expect(screen.getByTestId('theme-mode').textContent).toBe('high-contrast');
    expect(document.documentElement.getAttribute('data-high-contrast')).toBe('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
  });

  it('persists the preference to localStorage on change', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'enable' }));
    expect(window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY)).toBe('true');

    await user.click(screen.getByRole('button', { name: 'disable' }));
    expect(window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY)).toBe('false');
  });

  it('rehydrates the preference from localStorage on mount', () => {
    window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, 'true');

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('high-contrast').textContent).toBe('true');
    expect(screen.getByTestId('theme-mode').textContent).toBe('high-contrast');
  });

  it('Alt+Shift+H toggles high-contrast mode', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('high-contrast').textContent).toBe('false');

    act(() => {
      fireEvent.keyDown(window, { key: 'H', altKey: true, shiftKey: true });
    });
    expect(screen.getByTestId('high-contrast').textContent).toBe('true');

    act(() => {
      fireEvent.keyDown(window, { key: 'h', altKey: true, shiftKey: true });
    });
    expect(screen.getByTestId('high-contrast').textContent).toBe('false');
  });

  it('ignores the H key when Alt or Shift is missing', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    act(() => {
      fireEvent.keyDown(window, { key: 'h' });
      fireEvent.keyDown(window, { key: 'h', altKey: true });
      fireEvent.keyDown(window, { key: 'h', shiftKey: true });
    });
    expect(screen.getByTestId('high-contrast').textContent).toBe('false');
  });

  it('keeps high-contrast preference independent from themeMode storage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, 'true');

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    // High-contrast wins over the dark preference visually...
    expect(screen.getByTestId('theme-mode').textContent).toBe('high-contrast');
    // ...but the underlying themeMode is preserved so disabling HC returns the user to dark.
    expect(screen.getByTestId('mode').textContent).toBe('dark');
  });
});
