import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  MatchAcknowledgementProvider,
  __resetMatchAcknowledgementStorage,
} from '../MatchAcknowledgementContext';

// ── Mocks ────────────────────────────────────────────────────────────────────

const getUserApplicationsMock = vi.fn();
const getPetByIdMock = vi.fn();

vi.mock('@/services', async () => {
  return {
    applicationService: {
      getUserApplications: (...args: unknown[]) => getUserApplicationsMock(...args),
    },
    petService: {
      getPetById: (...args: unknown[]) => getPetByIdMock(...args),
    },
  };
});

const useAuthMock = vi.fn();
vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => useAuthMock(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const renderProvider = () =>
  render(
    <MemoryRouter>
      <MatchAcknowledgementProvider>
        <div>app</div>
      </MatchAcknowledgementProvider>
    </MemoryRouter>
  );

const buildApp = (overrides: Partial<{ id: string; petId: string; status: string }> = {}) => ({
  id: 'app-1',
  petId: 'pet-1',
  userId: 'user-1',
  rescueId: 'rescue-1',
  status: 'submitted',
  data: {},
  documents: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const buildPet = (overrides: Partial<{ name: string; images: Array<unknown> }> = {}) => ({
  pet_id: 'pet-1',
  name: 'Biscuit',
  images: [
    {
      url: 'https://cdn.example.com/biscuit.jpg',
      caption: 'Biscuit smiles',
      image_id: 'img-1',
      is_primary: true,
      order_index: 0,
      uploaded_at: '2024-01-01T00:00:00Z',
    },
  ],
  ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MatchAcknowledgementProvider', () => {
  beforeEach(() => {
    __resetMatchAcknowledgementStorage();
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: { userId: 'user-1' },
    });
    getUserApplicationsMock.mockReset();
    getPetByIdMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not poll applications for unauthenticated visitors', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, user: null });
    renderProvider();
    // Give the effect a tick.
    await waitFor(() => {
      expect(getUserApplicationsMock).not.toHaveBeenCalled();
    });
    expect(screen.queryByTestId('its-a-match-modal')).toBeNull();
  });

  it('shows the modal when an application transitions out of submitted', async () => {
    // First poll: still submitted. Second poll: rescue has moved it to approved.
    getUserApplicationsMock
      .mockResolvedValueOnce([buildApp({ status: 'submitted' })])
      .mockResolvedValueOnce([buildApp({ status: 'approved' })]);
    getPetByIdMock.mockResolvedValue(buildPet());

    const { rerender } = renderProvider();

    await waitFor(() => {
      expect(getUserApplicationsMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('its-a-match-modal')).toBeNull();

    // Trigger another mount so the second poll runs (avoids real timers).
    rerender(
      <MemoryRouter>
        <MatchAcknowledgementProvider key='remount'>
          <div>app</div>
        </MatchAcknowledgementProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('its-a-match-modal')).toBeInTheDocument();
    });
    expect(screen.getByText('Biscuit')).toBeInTheDocument();
    const photo = screen.getByAltText('Biscuit');
    expect(photo).toHaveAttribute('src', 'https://cdn.example.com/biscuit.jpg');
  });

  it('treats a first observation in a non-submitted state as a match (no prior memory)', async () => {
    // Adopter just opened the app; the application is already in `approved`
    // and we've never recorded a status for it. Bias toward celebrating.
    getUserApplicationsMock.mockResolvedValue([buildApp({ status: 'approved' })]);
    getPetByIdMock.mockResolvedValue(buildPet());

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('its-a-match-modal')).toBeInTheDocument();
    });
  });

  it('persists shown state so the modal does not reappear after dismissal', async () => {
    getUserApplicationsMock.mockResolvedValue([buildApp({ status: 'approved' })]);
    getPetByIdMock.mockResolvedValue(buildPet());

    const { unmount } = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('its-a-match-modal')).toBeInTheDocument();
    });

    // User dismisses the celebration.
    await userEvent.click(screen.getByText('Maybe later'));

    await waitFor(() => {
      expect(screen.queryByTestId('its-a-match-modal')).toBeNull();
    });

    unmount();

    // Fresh app load: same application still reports approved, but we've
    // already celebrated it once.
    renderProvider();

    // Wait for the poll to settle before asserting absence.
    await waitFor(() => {
      expect(getUserApplicationsMock).toHaveBeenCalled();
    });
    // Give any potential re-render a chance.
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId('its-a-match-modal')).toBeNull();
  });

  it('does not surface the modal for applications still in submitted', async () => {
    getUserApplicationsMock.mockResolvedValue([buildApp({ status: 'submitted' })]);
    renderProvider();

    await waitFor(() => {
      expect(getUserApplicationsMock).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('its-a-match-modal')).toBeNull();
    // No pet fetch should have happened — we only pull pet info for matches.
    expect(getPetByIdMock).not.toHaveBeenCalled();
  });
});
