/**
 * ADS-C5: the swipe UI is gesture-driven, which is inoperable by keyboard and
 * assistive tech. SwipeStack exposes an additive, AT-operable set of like/skip
 * controls tied to the current pet. These tests document that a keyboard user
 * can like or skip the top pet without performing a swipe gesture.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import type { DiscoveryPet } from '@/services';
import { SwipeStack } from './SwipeStack';

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({
    logEvent: vi.fn(),
    checkGate: () => false,
    client: null,
    getExperiment: () => null,
    getDynamicConfig: () => null,
  }),
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { userId: 'u-1' }, isAuthenticated: true, isLoading: false }),
}));

const pets: DiscoveryPet[] = [
  { petId: 'pet-1', name: 'Buddy', type: 'dog', breed: 'Labrador' },
  { petId: 'pet-2', name: 'Milo', type: 'cat', breed: 'Tabby' },
];

const renderStack = (onSwipe = vi.fn()) => {
  const onEndReached = vi.fn();
  renderWithProviders(
    <SwipeStack pets={pets} onSwipe={onSwipe} onEndReached={onEndReached} sessionId='s-1' />
  );
  return { onSwipe, onEndReached };
};

describe('SwipeStack accessible controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes labelled like/skip controls for the current pet', () => {
    renderStack();
    expect(screen.getByRole('button', { name: /^like buddy$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^skip buddy$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^super like buddy$/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /actions for buddy/i })).toBeInTheDocument();
  });

  it('likes the current pet from the keyboard-operable control', async () => {
    const user = userEvent.setup();
    const { onSwipe } = renderStack();

    await user.click(screen.getByRole('button', { name: /^like buddy$/i }));

    expect(onSwipe).toHaveBeenCalledTimes(1);
    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'like', petId: 'pet-1' })
    );
  });

  it('skips the current pet from the keyboard-operable control', async () => {
    const user = userEvent.setup();
    const { onSwipe } = renderStack();

    await user.click(screen.getByRole('button', { name: /^skip buddy$/i }));

    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'pass', petId: 'pet-1' })
    );
  });

  it('activates the like control with the keyboard (Enter)', async () => {
    const user = userEvent.setup();
    const { onSwipe } = renderStack();

    await user.tab();
    const likeButton = screen.getByRole('button', { name: /^like buddy$/i });
    likeButton.focus();
    await user.keyboard('{Enter}');

    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'like', petId: 'pet-1' })
    );
  });

  it('announces the current pet in a polite live region', () => {
    renderStack();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/showing buddy/i);
  });
});
