import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from './ThemeProvider';
import type { ThemeMode } from './theme';

const Probe: React.FC = () => {
  const { themeMode, theme, setThemeMode } = useTheme();
  return (
    <div>
      <span data-testid='mode'>{themeMode}</span>
      <span data-testid='theme-mode'>{theme.mode}</span>
      <button onClick={() => setThemeMode('light')}>light</button>
      <button onClick={() => setThemeMode('normal')}>normal</button>
      <button onClick={() => setThemeMode('dark')}>dark</button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('defaults to the normal (warm cream) theme when nothing is stored', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mode').textContent).toBe('normal');
    expect(screen.getByTestId('theme-mode').textContent).toBe('normal');
    expect(document.documentElement.getAttribute('data-theme')).toBe('normal');
  });

  it('honours initialTheme when nothing is stored', () => {
    render(
      <ThemeProvider initialTheme='dark'>
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mode').textContent).toBe('dark');
  });

  it.each<ThemeMode>(['light', 'normal', 'dark'])(
    'switches to %s when setThemeMode is called',
    async mode => {
      const user = userEvent.setup();
      render(
        <ThemeProvider initialTheme='light'>
          <Probe />
        </ThemeProvider>
      );

      await user.click(screen.getByRole('button', { name: mode }));

      expect(screen.getByTestId('mode').textContent).toBe(mode);
      expect(document.documentElement.getAttribute('data-theme')).toBe(mode);
    }
  );

  it('persists the selected theme to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'dark' }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'light' }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('rehydrates a stored theme on mount', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mode').textContent).toBe('dark');
  });

  it('falls back to the initialTheme when the stored value is unrecognised', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'something-else');

    render(
      <ThemeProvider initialTheme='light'>
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mode').textContent).toBe('light');
  });
});
