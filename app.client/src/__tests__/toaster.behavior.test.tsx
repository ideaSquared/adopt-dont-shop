/**
 * ADS-125: Verifies the Toaster is wired into the client app such that
 * calling `toast.success` displays a message to the user.
 *
 * The global setup-tests.ts mocks @adopt-dont-shop/lib.components, so we
 * unmock it for this file to exercise the real sonner-backed exports.
 */
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.unmock('@adopt-dont-shop/lib.components');

const { Toaster, toast } = await vi.importActual<typeof import('@adopt-dont-shop/lib.components')>(
  '@adopt-dont-shop/lib.components'
);

describe('Client Toaster mount', () => {
  it('surfaces a success toast when triggered', async () => {
    render(<Toaster />);
    act(() => {
      toast.success('Application submitted');
    });
    expect(await screen.findByText('Application submitted')).toBeInTheDocument();
  });
});
