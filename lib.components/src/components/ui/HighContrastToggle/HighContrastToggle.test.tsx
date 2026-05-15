import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider } from '../../../styles/ThemeProvider';
import { HighContrastToggle, HIGH_CONTRAST_SHORTCUT_HINT } from './HighContrastToggle';

const renderToggle = () =>
  render(
    <ThemeProvider>
      <HighContrastToggle />
    </ThemeProvider>
  );

describe('HighContrastToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('exposes an aria-pressed toggle button reflecting the current state', () => {
    renderToggle();

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAccessibleName('Turn on high-contrast mode');
  });

  it('flips aria-pressed when activated', async () => {
    const user = userEvent.setup();
    renderToggle();

    const button = screen.getByRole('button');
    await user.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAccessibleName('Turn off high-contrast mode');
  });

  it('responds to keyboard activation', async () => {
    const user = userEvent.setup();
    renderToggle();

    const button = screen.getByRole('button');
    await user.tab();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('advertises the keyboard shortcut in its title', () => {
    renderToggle();

    const button = screen.getByRole('button');
    expect(button.getAttribute('title')).toContain(HIGH_CONTRAST_SHORTCUT_HINT);
  });
});
