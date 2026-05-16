/**
 * ADS-587: When chat init fails on the pet details page, we surface a
 * `toast.error` with a "Retry" action — replacing the legacy native alert.
 * Chat init failures are usually transient, so the retry is genuinely useful.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, toast } from '@adopt-dont-shop/lib.components';

const startConversationMock = vi.fn();
const getPetByIdMock = vi.fn();
const isFavoriteMock = vi.fn();

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: { userId: 'u-1', email: 'a@b.c' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => ({ startConversation: startConversationMock }),
}));

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalytics: () => ({ trackPageView: vi.fn(), trackEvent: vi.fn() }),
}));

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({ logEvent: vi.fn() }),
}));

vi.mock('@/services', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services');
  return {
    ...actual,
    petService: {
      getPetById: (...args: unknown[]) => getPetByIdMock(...args),
      isFavorite: (...args: unknown[]) => isFavoriteMock(...args),
      addToFavorites: vi.fn(),
      removeFromFavorites: vi.fn(),
    },
  };
});

import { PetDetailsPage } from './PetDetailsPage';

const renderPage = () =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/pets/pet-1']}>
        <PetDetailsPage />
      </MemoryRouter>
    </ThemeProvider>
  );

describe('PetDetailsPage chat init failure', () => {
  beforeEach(() => {
    startConversationMock.mockReset();
    getPetByIdMock.mockReset();
    isFavoriteMock.mockReset();
    vi.mocked(toast.error).mockReset();

    getPetByIdMock.mockResolvedValue({
      pet_id: 'pet-1',
      name: 'Luna',
      type: 'dog',
      status: 'available',
      rescue_id: 'rescue-1',
      images: [],
    });
    isFavoriteMock.mockResolvedValue(false);
  });

  it('shows a toast.error with a Retry action when startConversation fails', async () => {
    const user = userEvent.setup();
    startConversationMock.mockRejectedValueOnce(new Error('network down'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /contact rescue/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /contact rescue/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    const [message, options] = vi.mocked(toast.error).mock.calls[0] as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(message).toMatch(/failed to start conversation/i);
    expect(options.action.label).toBe('Retry');
    expect(typeof options.action.onClick).toBe('function');
  });
});
