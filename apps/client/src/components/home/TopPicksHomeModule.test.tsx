import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test-utils/render';
import { TopPicksHomeModule } from './TopPicksHomeModule';

const authState = { isAuthenticated: false };
const matchPreferencesState = { hasPreferences: false, isLoading: false };
const getTopPicks = vi.fn();

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({ isAuthenticated: authState.isAuthenticated }),
  };
});

vi.mock('@/hooks/useMatchPreferences', () => ({
  useMatchPreferences: () => matchPreferencesState,
}));

vi.mock('@/services', () => ({
  matchingService: {
    getTopPicks: (...args: unknown[]) => getTopPicks(...args),
  },
}));

beforeEach(() => {
  authState.isAuthenticated = false;
  matchPreferencesState.hasPreferences = false;
  matchPreferencesState.isLoading = false;
  getTopPicks.mockReset();
});

describe('TopPicksHomeModule', () => {
  it('renders nothing for signed-out users', () => {
    const { container } = renderWithProviders(<TopPicksHomeModule />);
    expect(container).toBeEmptyDOMElement();
    expect(getTopPicks).not.toHaveBeenCalled();
  });

  it('renders nothing for signed-in users without preferences', () => {
    authState.isAuthenticated = true;
    const { container } = renderWithProviders(<TopPicksHomeModule />);
    expect(container).toBeEmptyDOMElement();
    expect(getTopPicks).not.toHaveBeenCalled();
  });

  it('shows the Your top picks heading and See all link when preferences exist and picks load', async () => {
    authState.isAuthenticated = true;
    matchPreferencesState.hasPreferences = true;
    getTopPicks.mockResolvedValueOnce([
      {
        petId: 'pet-1',
        name: 'Rex',
        type: 'dog',
        ageGroup: 'adult',
        size: 'medium',
        score: 87,
        reasons: [],
        rescueName: 'Happy Rescue',
      },
    ]);
    renderWithProviders(<TopPicksHomeModule />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /your top picks/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('link', { name: /see all/i })).toHaveAttribute(
      'href',
      '/match/top-picks'
    );
    expect(screen.getByText('Rex')).toBeInTheDocument();
  });

  it('renders nothing when the API returns an empty result', async () => {
    authState.isAuthenticated = true;
    matchPreferencesState.hasPreferences = true;
    getTopPicks.mockResolvedValueOnce([]);
    const { container } = renderWithProviders(<TopPicksHomeModule />);
    await waitFor(() => expect(getTopPicks).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
