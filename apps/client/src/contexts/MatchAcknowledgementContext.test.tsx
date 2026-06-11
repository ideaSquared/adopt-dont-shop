/**
 * ADS C4-5: behaviour test for the real-time match-acknowledgement path.
 *
 * Previously the MatchAcknowledgementProvider only refreshed every 60s.
 * It now also subscribes to the backend's `application_status_changed`
 * socket event and re-checks immediately when one arrives, while keeping
 * the polling timer as a safety net.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@/test-utils/render';
import type { ApplicationStatusChangedPayload } from '@adopt-dont-shop/lib.analytics';

const getUserApplicationsMock = vi.fn();
const getPetByIdMock = vi.fn();

// Capture the handler the context subscribes with so we can fire socket
// events synthetically from the test.
let lastStatusHandler: ((p: ApplicationStatusChangedPayload) => void) | null = null;

vi.mock('@adopt-dont-shop/lib.analytics', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.analytics')>(
    '@adopt-dont-shop/lib.analytics'
  );
  return {
    ...actual,
    useRealtimeAnalytics: (event: string, handler: unknown) => {
      if (event === 'application_status_changed') {
        lastStatusHandler = handler as (p: ApplicationStatusChangedPayload) => void;
      }
    },
  };
});

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

describe('MatchAcknowledgementProvider (C4-5)', () => {
  beforeEach(() => {
    getUserApplicationsMock.mockReset();
    getPetByIdMock.mockReset();
    __resetMatchAcknowledgementStorage();
    lastStatusHandler = null;
    // Defeat the navigator.webdriver short-circuit so the mount-time poll
    // runs and we can observe the event-driven refresh as a *second* call.
    Object.defineProperty(window.navigator, 'webdriver', {
      configurable: true,
      get: () => false,
    });
  });

  it('subscribes to application_status_changed at mount', () => {
    getUserApplicationsMock.mockResolvedValue([]);
    render(
      <MatchAcknowledgementProvider>
        <div />
      </MatchAcknowledgementProvider>
    );
    expect(lastStatusHandler).not.toBeNull();
  });

  it('refreshes applications when the socket fires application_status_changed', async () => {
    getUserApplicationsMock.mockResolvedValue([sampleApp()]);
    getPetByIdMock.mockResolvedValue(samplePet());

    render(
      <MatchAcknowledgementProvider>
        <div />
      </MatchAcknowledgementProvider>
    );

    await waitFor(() => {
      expect(getUserApplicationsMock).toHaveBeenCalledTimes(1);
    });

    // Fire the socket event — this should kick another applicationService
    // fetch without waiting for the 60s poll interval.
    lastStatusHandler?.({
      applicationId: 'app-1',
      status: 'approved',
      updatedAt: '2025-01-02T01:00:00Z',
    });

    await waitFor(() => {
      expect(getUserApplicationsMock).toHaveBeenCalledTimes(2);
    });
  });
});
