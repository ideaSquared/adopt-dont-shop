/**
 * ADS-587: When chat init fails on the pet details page, we surface a
 * `toast.error` with a "Retry" action — replacing the legacy native alert.
 * Chat init failures are usually transient, so the retry is genuinely useful.
 *
 * ADS-638: Signed-out users now see auth-aware CTAs that route to
 * `/login?redirect=…` rather than opening a post-click modal. After
 * sign-in the user returns to the pet page (for contact) or jumps to
 * the application flow (for apply).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';
import { toast } from '@adopt-dont-shop/lib.components';

const startConversationMock = vi.fn();
const getPetByIdMock = vi.fn();
const isFavoriteMock = vi.fn();

const authStateMock = {
  isAuthenticated: true,
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'pet-1' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: authStateMock.isAuthenticated ? { userId: 'u-1', email: 'a@b.c' } : null,
      isAuthenticated: authStateMock.isAuthenticated,
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

/**
 * Narrow the loosely-typed sonner `action` (Action | ReactNode) to a plain
 * { label, onClick } shape so the test can assert on the retry handler.
 * The intermediate `Record<string, unknown>` cast is the minimum needed to
 * read a property off `object` after the runtime `in` check.
 */
const isActionObject = (
  value: unknown
): value is { label: unknown; onClick: (event: unknown) => void } => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('label' in value) || !('onClick' in value)) {
    return false;
  }
  const record: Record<string, unknown> = value;
  return typeof record.onClick === 'function';
};

describe('PetDetailsPage CTA hierarchy (ADS-639)', () => {
  beforeEach(() => {
    authStateMock.isAuthenticated = true;
    startConversationMock.mockReset();
    getPetByIdMock.mockReset();
    isFavoriteMock.mockReset();

    getPetByIdMock.mockResolvedValue({
      pet_id: 'pet-1',
      name: 'Luna',
      type: 'dog',
      status: 'available',
      rescue_id: 'rescue-1',
      rescue: { name: 'Happy Tails', location: 'Bristol' },
      images: [],
    });
    isFavoriteMock.mockResolvedValue(false);
  });

  it('renders exactly one primary "Apply to Adopt" CTA, presents "Contact Rescue" as a secondary affordance framed as asking a question before applying, and keeps "View Rescue Profile" as a tertiary link (not a button)', async () => {
    render(<PetDetailsPage />);

    // Primary CTA: a single "Apply to Adopt" action linking to the
    // application form. No other CTA on the page should share the
    // "Apply to Adopt" label.
    const applyLinks = await screen.findAllByRole('link', { name: /apply to adopt/i });
    expect(applyLinks).toHaveLength(1);
    expect(applyLinks[0]).toHaveAttribute('href', '/apply/pet-1');

    // No competing primary CTA: nothing else uses the "Apply" / "Adopt"
    // call-to-action phrasing as a button.
    expect(screen.queryByRole('button', { name: /apply to adopt/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^adopt/i })).not.toBeInTheDocument();

    // Secondary affordance: the rescue-contact action is a button whose
    // accessible name frames it as asking a question *before* applying
    // — not as a competing primary CTA labelled "Contact Rescue".
    expect(
      screen.getByRole('button', { name: /ask a question before applying/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^contact rescue$/i })).not.toBeInTheDocument();

    // Tertiary: "View Rescue Profile" remains an inline link to the
    // rescue page, not a button-styled action.
    const rescueProfileLinks = screen.getAllByRole('link', { name: /view rescue profile/i });
    expect(rescueProfileLinks.length).toBeGreaterThan(0);
    rescueProfileLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '/rescues/rescue-1');
    });
    expect(screen.queryByRole('button', { name: /view rescue profile/i })).not.toBeInTheDocument();
  });
});

describe('PetDetailsPage chat init failure', () => {
  beforeEach(() => {
    authStateMock.isAuthenticated = true;
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

    render(<PetDetailsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /ask a question before applying/i })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ask a question before applying/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    const [message, options] = vi.mocked(toast.error).mock.calls[0];
    expect(typeof message).toBe('string');
    expect(String(message)).toMatch(/failed to start conversation/i);

    const action = options?.action;
    expect(isActionObject(action)).toBe(true);
    if (isActionObject(action)) {
      expect(action.label).toBe('Retry');
    }
  });
});

describe('PetDetailsPage signed-out CTAs (ADS-638)', () => {
  beforeEach(() => {
    authStateMock.isAuthenticated = false;
    startConversationMock.mockReset();
    getPetByIdMock.mockReset();
    isFavoriteMock.mockReset();

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

  it('still renders pet details for a signed-out visitor (deep-link sharing works)', async () => {
    render(<PetDetailsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /luna/i })).toBeInTheDocument();
    });
  });

  it('shows a "Sign in to apply" CTA linking to /login with a return URL to the apply page', async () => {
    render(<PetDetailsPage />);

    const applyLink = await screen.findByRole('link', { name: /sign in to apply/i });
    expect(applyLink).toHaveAttribute(
      'href',
      `/login?redirect=${encodeURIComponent('/apply/pet-1')}`
    );
  });

  it('shows a "Sign in to message rescue" CTA that returns the user back to the pet page with action=contact', async () => {
    render(<PetDetailsPage />);

    const contactLink = await screen.findByRole('link', { name: /sign in to message rescue/i });
    expect(contactLink).toHaveAttribute(
      'href',
      `/login?redirect=${encodeURIComponent('/pets/pet-1?action=contact')}`
    );
  });

  it('does not show the original "Apply to Adopt" or "Contact Rescue" buttons to signed-out users', async () => {
    render(<PetDetailsPage />);

    await screen.findByRole('link', { name: /sign in to apply/i });

    expect(screen.queryByRole('link', { name: /^apply to adopt$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^contact rescue$/i })).not.toBeInTheDocument();
  });

  it('does not open a login modal when the page renders for a signed-out visitor', async () => {
    render(<PetDetailsPage />);

    await screen.findByRole('link', { name: /sign in to apply/i });

    expect(
      screen.queryByRole('heading', { name: /join adopt don't shop/i })
    ).not.toBeInTheDocument();
  });
});

describe('PetDetailsPage signed-in CTAs (ADS-638 regression)', () => {
  beforeEach(() => {
    authStateMock.isAuthenticated = true;
    startConversationMock.mockReset();
    getPetByIdMock.mockReset();
    isFavoriteMock.mockReset();

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

  it('renders the "Apply to Adopt" link pointing at the apply route', async () => {
    render(<PetDetailsPage />);

    const applyLink = await screen.findByRole('link', { name: /^apply to adopt$/i });
    expect(applyLink).toHaveAttribute('href', '/apply/pet-1');
  });

  it('renders the rescue-contact button (now framed as asking a question before applying) for signed-in users', async () => {
    render(<PetDetailsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /ask a question before applying/i })
      ).toBeInTheDocument();
    });
  });
});
