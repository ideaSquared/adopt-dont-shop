/**
 * Behavioural tests for TopPicksPage — the personalised match list.
 *
 * Covers the adopter discovery journey: the signed-out call to action, the
 * loading state, the load error, the empty-state nudge to set preferences, and
 * the populated grid (including the match-quality badge label and navigation to
 * a pet's details on activation).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/test-utils';

const getTopPicks = vi.fn();
const mockNavigate = vi.fn();
let mockIsAuthenticated = true;

vi.mock('@/services', () => ({
  matchingService: {
    getTopPicks: (...args: unknown[]) => getTopPicks(...args),
  },
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

vi.mock('@/utils/fileUtils', () => ({
  resolveFileUrl: (url?: string) => url ?? '',
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { TopPicksPage } from './TopPicksPage';

const buildPick = (overrides: Record<string, unknown> = {}) => ({
  petId: 'pet-1',
  name: 'Buddy',
  type: 'dog',
  breedName: 'Labrador',
  ageGroup: 'adult',
  size: 'large',
  rescueName: 'Happy Tails',
  score: 80,
  reasons: [],
  photoUrl: null,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  mockIsAuthenticated = true;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('TopPicksPage (signed out)', () => {
  it('invites the visitor to sign in and does not fetch picks', async () => {
    mockIsAuthenticated = false;

    renderWithProviders(<TopPicksPage />);

    expect(
      screen.getByRole('heading', { name: /sign in for your top picks/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(getTopPicks).not.toHaveBeenCalled();
  });
});

describe('TopPicksPage (signed in)', () => {
  it('shows a loading spinner while picks are being fetched', () => {
    getTopPicks.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<TopPicksPage />);

    expect(screen.getByLabelText('loading')).toBeInTheDocument();
  });

  it('renders an error message when the request fails', async () => {
    getTopPicks.mockRejectedValue(new Error('boom'));

    renderWithProviders(<TopPicksPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load your top picks/i);
  });

  it('nudges the user to set preferences when there are no picks', async () => {
    getTopPicks.mockResolvedValue([]);

    renderWithProviders(<TopPicksPage />);

    expect(await screen.findByRole('heading', { name: /no matches yet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set match preferences/i })).toBeInTheDocument();
  });

  it('renders the picks grid with the pet name and a match-quality badge', async () => {
    getTopPicks.mockResolvedValue([buildPick({ score: 80 })]);

    renderWithProviders(<TopPicksPage />);

    expect(await screen.findByRole('heading', { name: /top picks for you/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Buddy' })).toBeInTheDocument();
    expect(screen.getByLabelText('Great match')).toBeInTheDocument();
  });

  it('requests the top-picks endpoint with a limit', async () => {
    getTopPicks.mockResolvedValue([]);

    renderWithProviders(<TopPicksPage />);

    await waitFor(() => expect(getTopPicks).toHaveBeenCalledWith(10));
  });

  it('navigates to the pet details page when a card is activated', async () => {
    getTopPicks.mockResolvedValue([buildPick({ petId: 'pet-42' })]);

    renderWithProviders(<TopPicksPage />);

    const card = (await screen.findByRole('heading', { name: 'Buddy' })).closest('[role="link"]');
    expect(card).not.toBeNull();
    fireEvent.click(card as HTMLElement);

    expect(mockNavigate).toHaveBeenCalledWith('/pets/pet-42');
  });
});
