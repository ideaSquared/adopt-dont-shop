import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';

import { DiscoveryLocationControl } from './DiscoveryLocationControl';

type Props = React.ComponentProps<typeof DiscoveryLocationControl>;

const renderControl = (overrides: Partial<Props> = {}) => {
  const onUseLocation = vi.fn();
  const onClear = vi.fn();
  render(
    <ThemeProvider>
      <DiscoveryLocationControl
        status='idle'
        hasLocation={false}
        onUseLocation={onUseLocation}
        onClear={onClear}
        {...overrides}
      />
    </ThemeProvider>
  );
  return { onUseLocation, onClear };
};

describe('DiscoveryLocationControl', () => {
  it('offers to use the adopter location without asking the browser by itself', async () => {
    const { onUseLocation } = renderControl();

    expect(screen.getByText(/see how far each pet is from you/i)).toBeInTheDocument();
    expect(onUseLocation).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /use my location/i }));

    expect(onUseLocation).toHaveBeenCalledTimes(1);
  });

  it('is reachable and usable from the keyboard', async () => {
    const { onUseLocation } = renderControl();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: /use my location/i })).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    expect(onUseLocation).toHaveBeenCalledTimes(1);
  });

  it('shows progress and blocks a second request while the browser is locating', () => {
    renderControl({ status: 'loading' });

    const button = screen.getByRole('button', { name: /finding your location/i });
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/finding your location/i);
  });

  it('confirms the distances are from the adopter and lets them stop sharing', async () => {
    const { onClear } = renderControl({ status: 'granted', hasLocation: true });

    expect(screen.getByRole('status')).toHaveTextContent('Showing distance from your location');
    expect(screen.queryByRole('button', { name: /use my location/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /stop sharing location/i }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['denied', /blocked/i],
    ['unavailable', /doesn.t support/i],
    ['error', /couldn.t work out your location/i],
  ] as const)(
    'explains a %s outcome in plain English and lets them try again',
    async (status, message) => {
      const { onUseLocation } = renderControl({ status });

      expect(screen.getByRole('status')).toHaveTextContent(message);
      // Nothing retries on its own; only the adopter's click asks again.
      expect(onUseLocation).not.toHaveBeenCalled();
      if (status !== 'unavailable') {
        await userEvent.click(screen.getByRole('button', { name: /try again/i }));
        expect(onUseLocation).toHaveBeenCalledTimes(1);
      } else {
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      }
    }
  );

  it('announces every state change through one polite live region', () => {
    renderControl({ status: 'idle' });

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
