/**
 * ADS-634: Surface unread messages and rescue contact on application pages.
 *
 * Behaviours covered:
 * - Cards render pet thumbnail and rescue name
 * - Unread badge appears only when the application's conversation has unread
 *   messages, and clicking the messages affordance routes to the conversation
 * - Works with 0, 1, and many applications; with and without unread messages
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';
import { applicationStatusLabel } from '@adopt-dont-shop/lib.types';

const navigateMock = vi.fn();
const getUserApplicationsMock = vi.fn();
const getPetByIdMock = vi.fn();

type MockConversation = {
  id: string;
  petId?: string;
  rescueId?: string;
};

const chatStateMock: { conversations: MockConversation[] } = { conversations: [] };
const unreadStateMock: { unreadByConversationId: Record<string, number> } = {
  unreadByConversationId: {},
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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
  useChat: () => ({ conversations: chatStateMock.conversations }),
}));

vi.mock('@adopt-dont-shop/lib.chat', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.chat')>(
    '@adopt-dont-shop/lib.chat'
  );
  return {
    ...actual,
    useUnreadConversations: () => ({
      totalUnread: 0,
      unreadByConversationId: unreadStateMock.unreadByConversationId,
      markRead: vi.fn(),
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

import { ApplicationDashboard } from './ApplicationDashboard';

const makeApplication = (overrides: Partial<Record<string, unknown>> = {}) => ({
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

const makePet = (overrides: Partial<Record<string, unknown>> = {}) => ({
  pet_id: 'pet-1',
  name: 'Luna',
  breed: 'Labrador',
  age_years: 3,
  images: [
    {
      url: 'https://cdn.example.com/luna.jpg',
      image_id: 'img-1',
      is_primary: true,
      order_index: 0,
      uploaded_at: '2025-01-01T00:00:00Z',
    },
  ],
  rescue: { name: 'Happy Tails Rescue' },
  ...overrides,
});

describe('ApplicationDashboard (ADS-634)', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    getUserApplicationsMock.mockReset();
    getPetByIdMock.mockReset();
    chatStateMock.conversations = [];
    unreadStateMock.unreadByConversationId = {};
  });

  it('renders the empty state when the user has no applications', async () => {
    getUserApplicationsMock.mockResolvedValue([]);

    render(<ApplicationDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /no applications yet/i })).toBeInTheDocument();
    });
  });

  it('renders pet thumbnail and rescue name on each card', async () => {
    getUserApplicationsMock.mockResolvedValue([makeApplication()]);
    getPetByIdMock.mockResolvedValue(makePet());

    render(<ApplicationDashboard />);

    const image = await screen.findByAltText('Luna');
    expect(image).toHaveAttribute('src', expect.stringContaining('luna.jpg'));
    expect(screen.getByText('Happy Tails Rescue')).toBeInTheDocument();
  });

  it('shows multiple application cards with correct counts when the user has many', async () => {
    getUserApplicationsMock.mockResolvedValue([
      makeApplication({ id: 'app-1', petId: 'pet-1' }),
      makeApplication({ id: 'app-2', petId: 'pet-2' }),
      makeApplication({ id: 'app-3', petId: 'pet-3' }),
    ]);
    getPetByIdMock.mockImplementation((petId: string) =>
      Promise.resolve(makePet({ pet_id: petId, name: `Pet-${petId}` }))
    );

    render(<ApplicationDashboard />);

    expect(await screen.findByText('Pet-pet-1')).toBeInTheDocument();
    expect(screen.getByText('Pet-pet-2')).toBeInTheDocument();
    expect(screen.getByText('Pet-pet-3')).toBeInTheDocument();
  });

  it('does not show a messages affordance for applications without an existing conversation', async () => {
    getUserApplicationsMock.mockResolvedValue([makeApplication()]);
    getPetByIdMock.mockResolvedValue(makePet());

    render(<ApplicationDashboard />);

    await screen.findByText('Luna');
    expect(screen.queryByRole('button', { name: /messages/i })).not.toBeInTheDocument();
  });

  it('shows a messages affordance with no unread badge when conversation has 0 unread', async () => {
    chatStateMock.conversations = [{ id: 'conv-1', petId: 'pet-1', rescueId: 'rescue-1' }];
    unreadStateMock.unreadByConversationId = { 'conv-1': 0 };
    getUserApplicationsMock.mockResolvedValue([makeApplication()]);
    getPetByIdMock.mockResolvedValue(makePet());

    render(<ApplicationDashboard />);

    expect(
      await screen.findByRole('button', { name: /messages from rescue/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
  });

  it('shows the unread badge with the count when there are unread messages', async () => {
    chatStateMock.conversations = [{ id: 'conv-1', petId: 'pet-1', rescueId: 'rescue-1' }];
    unreadStateMock.unreadByConversationId = { 'conv-1': 3 };
    getUserApplicationsMock.mockResolvedValue([makeApplication()]);
    getPetByIdMock.mockResolvedValue(makePet());

    render(<ApplicationDashboard />);

    const badge = await screen.findByTestId('unread-badge');
    expect(badge).toHaveTextContent('3');
    expect(
      screen.getByRole('button', { name: /messages from rescue: 3 unread/i })
    ).toBeInTheDocument();
  });

  it('navigates to the conversation when the messages button is clicked', async () => {
    chatStateMock.conversations = [{ id: 'conv-99', petId: 'pet-1', rescueId: 'rescue-1' }];
    unreadStateMock.unreadByConversationId = { 'conv-99': 2 };
    getUserApplicationsMock.mockResolvedValue([makeApplication()]);
    getPetByIdMock.mockResolvedValue(makePet());

    const user = userEvent.setup();
    render(<ApplicationDashboard />);

    const button = await screen.findByRole('button', { name: /messages from rescue: 2 unread/i });
    await user.click(button);

    expect(navigateMock).toHaveBeenCalledWith('/chat/conv-99');
  });

  // ADS C4-1: the status-badge selector used to whitelist 'under_review' — a
  // value the frontend Application type never emits — so 'withdrawn'
  // applications silently fell through to the 'default' grey badge. Each
  // reachable status now renders its own readable label.
  it.each(['submitted', 'approved', 'rejected', 'withdrawn'] as const)(
    'renders the %s status label on the application card',
    async status => {
      getUserApplicationsMock.mockResolvedValue([makeApplication({ status })]);
      getPetByIdMock.mockResolvedValue(makePet());

      render(<ApplicationDashboard />);

      const label = await screen.findByText(applicationStatusLabel(status));
      expect(label).toBeInTheDocument();
    }
  );

  // UX P2 E: when an application's pet lookup fails or returns no record,
  // the card used to display "Pet Name Unavailable" — a phrase that reads
  // like a system error to applicants. Replace with "Unknown pet" and keep
  // the card rendering normally.
  it('renders "Unknown pet" instead of the old placeholder when pet data is missing', async () => {
    getUserApplicationsMock.mockResolvedValue([makeApplication()]);
    getPetByIdMock.mockResolvedValue(null);

    render(<ApplicationDashboard />);

    expect(await screen.findByText(/unknown pet/i)).toBeInTheDocument();
    expect(screen.queryByText(/pet name unavailable/i)).not.toBeInTheDocument();
  });
});
