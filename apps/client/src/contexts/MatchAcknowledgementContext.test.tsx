/**
 * ADS-633 / ADS-1326: behaviour test for the match-acknowledgement poll.
 *
 * The provider used to also subscribe to a `useRealtimeAnalytics`
 * `application_status_changed` socket event as a fast path (ADS C4-5), but
 * the gateway never actually emits that event — no WS namespace for it
 * exists — so the subscription was permanently inert. ADS-1326 removed it;
 * the 60s poll below is the only mechanism now, and always was the one
 * actually doing the work.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils/render';

const getUserApplicationsMock = vi.fn();
const getPetByIdMock = vi.fn();

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: { userId: 'u-1', email: 'a@b.c', firstName: 'Ada' },
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

vi.mock('@/services', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services');
  return {
    ...actual,
    applicationService: {
      getUserApplications: (...args: unknown[]) => getUserApplicationsMock(...args),
    },
    petService: {
      getPetById: (...args: unknown[]) => getPetByIdMock(...args),
    },
  };
});

import {
  MatchAcknowledgementProvider,
  __resetMatchAcknowledgementStorage,
} from './MatchAcknowledgementContext';

const sampleApp = (overrides: Record<string, unknown> = {}) => ({
  id: 'app-1',
  petId: 'pet-1',
  userId: 'u-1',
  rescueId: 'rescue-1',
  status: 'submitted',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
  submittedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

const samplePet = () => ({
  pet_id: 'pet-1',
  name: 'Luna',
  breed: 'Labrador',
  age_years: 3,
  images: [{ url: 'https://cdn.example.com/luna.jpg', is_primary: true }],
});

describe('MatchAcknowledgementProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getUserApplicationsMock.mockReset();
    getPetByIdMock.mockReset();
    __resetMatchAcknowledgementStorage();
    Object.defineProperty(window.navigator, 'webdriver', {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('checks for matches immediately on mount', async () => {
    getUserApplicationsMock.mockResolvedValue([]);

    render(
      <MatchAcknowledgementProvider>
        <div />
      </MatchAcknowledgementProvider>
    );

    await waitFor(() => {
      expect(getUserApplicationsMock).toHaveBeenCalledTimes(1);
    });
  });

  it('polls again after the 60s interval and shows the match modal once a status transitions', async () => {
    getUserApplicationsMock.mockResolvedValueOnce([sampleApp({ status: 'submitted' })]);
    getUserApplicationsMock.mockResolvedValueOnce([sampleApp({ status: 'approved' })]);
    getPetByIdMock.mockResolvedValue(samplePet());

    render(
      <MatchAcknowledgementProvider>
        <div />
      </MatchAcknowledgementProvider>
    );

    await waitFor(() => {
      expect(getUserApplicationsMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('its-a-match-modal')).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(60_000);

    await waitFor(() => {
      expect(getUserApplicationsMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByTestId('its-a-match-modal')).toBeInTheDocument();
    });
  });
});
