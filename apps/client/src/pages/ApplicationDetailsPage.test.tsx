/**
 * ADS-634: Inline "Message rescue" CTA on the application details page.
 *
 * Behaviours covered:
 * - CTA is rendered above the fold
 * - When a conversation already exists for this pet + rescue, clicking the
 *   CTA navigates straight to it without creating a new conversation
 * - When no conversation exists, the CTA creates one and then navigates
 * - Navigation always carries the application's return path as router state
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';
import { toast } from '@adopt-dont-shop/lib.components';

const navigateMock = vi.fn();
const getApplicationByIdMock = vi.fn();
const startConversationMock = vi.fn();
const withdrawApplicationMock = vi.fn();

type MockConversation = {
  id: string;
  petId?: string;
  rescueId?: string;
};

const chatStateMock: { conversations: MockConversation[] } = { conversations: [] };

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: 'app-1' }),
  };
});

vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => ({
    conversations: chatStateMock.conversations,
    startConversation: startConversationMock,
  }),
}));

vi.mock('@/services', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services');
  return {
    ...actual,
    applicationService: {
      getApplicationById: (...args: unknown[]) => getApplicationByIdMock(...args),
      withdrawApplication: (...args: unknown[]) => withdrawApplicationMock(...args),
    },
  };
});

import { ApplicationDetailsPage } from './ApplicationDetailsPage';

const makeApplication = () => ({
  id: 'app-1',
  petId: 'pet-1',
  userId: 'u-1',
  rescueId: 'rescue-1',
  status: 'submitted',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
  submittedAt: '2025-01-01T00:00:00Z',
});

describe('ApplicationDetailsPage Message rescue CTA (ADS-634)', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    getApplicationByIdMock.mockReset();
    startConversationMock.mockReset();
    chatStateMock.conversations = [];
  });

  it('shows a "Message rescue" CTA once the application loads', async () => {
    getApplicationByIdMock.mockResolvedValue(makeApplication());

    render(<ApplicationDetailsPage />);

    expect(await screen.findByRole('button', { name: /message rescue/i })).toBeInTheDocument();
  });

  it('navigates to the existing conversation when one already covers this pet + rescue', async () => {
    chatStateMock.conversations = [{ id: 'conv-7', petId: 'pet-1', rescueId: 'rescue-1' }];
    getApplicationByIdMock.mockResolvedValue(makeApplication());

    const user = userEvent.setup();
    render(<ApplicationDetailsPage />);

    const cta = await screen.findByRole('button', { name: /message rescue/i });
    await user.click(cta);

    expect(startConversationMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/chat/conv-7', {
      state: { from: '/applications/app-1' },
    });
  });

  it('creates a new conversation when none exists, then navigates to it', async () => {
    getApplicationByIdMock.mockResolvedValue(makeApplication());
    startConversationMock.mockResolvedValue({ id: 'conv-new' });

    const user = userEvent.setup();
    render(<ApplicationDetailsPage />);

    const cta = await screen.findByRole('button', { name: /message rescue/i });
    await user.click(cta);

    await waitFor(() => {
      expect(startConversationMock).toHaveBeenCalledWith('rescue-1', 'pet-1');
    });
    expect(navigateMock).toHaveBeenCalledWith('/chat/conv-new', {
      state: { from: '/applications/app-1' },
    });
  });

  it('surfaces an error and does not navigate when conversation creation fails', async () => {
    getApplicationByIdMock.mockResolvedValue(makeApplication());
    startConversationMock.mockRejectedValue(new Error('network down'));

    const user = userEvent.setup();
    render(<ApplicationDetailsPage />);

    const cta = await screen.findByRole('button', { name: /message rescue/i });
    await user.click(cta);

    expect(await screen.findByText(/failed to start a conversation/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/chat\//),
      expect.anything()
    );
  });
});

describe('ApplicationDetailsPage pet and rescue', () => {
  beforeEach(() => {
    getApplicationByIdMock.mockReset();
    chatStateMock.conversations = [];
  });

  it('links the pet and rescue by name instead of showing their ids', async () => {
    getApplicationByIdMock.mockResolvedValue({
      ...makeApplication(),
      petName: 'Buddy',
      rescueName: 'Happy Paws',
    });

    render(<ApplicationDetailsPage />);

    expect(await screen.findByRole('link', { name: 'Buddy' })).toHaveAttribute(
      'href',
      '/pets/pet-1'
    );
    expect(screen.getByRole('link', { name: 'Happy Paws' })).toHaveAttribute(
      'href',
      '/rescues/rescue-1'
    );
    expect(screen.queryByText('pet-1')).not.toBeInTheDocument();
    expect(screen.queryByText('rescue-1')).not.toBeInTheDocument();
  });

  it('does not reveal which rescue staff member reviewed the application', async () => {
    getApplicationByIdMock.mockResolvedValue({
      ...makeApplication(),
      status: 'approved',
      reviewedAt: '2025-01-03T00:00:00Z',
      reviewedBy: 'staff-user-42',
    });

    render(<ApplicationDetailsPage />);

    expect(await screen.findByText('Reviewed')).toBeInTheDocument();
    expect(screen.queryByText(/reviewed by/i)).not.toBeInTheDocument();
    expect(screen.queryByText('staff-user-42')).not.toBeInTheDocument();
  });
});

describe('ApplicationDetailsPage withdrawing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApplicationByIdMock.mockResolvedValue(makeApplication());
  });

  it('withdraws the application, confirms with a toast and shows the withdrawn status', async () => {
    withdrawApplicationMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<ApplicationDetailsPage />);
    await screen.findByRole('button', { name: /message rescue/i });
    // The modal's confirm button is rendered after the page's own trigger button.
    const buttons = screen.getAllByRole('button', { name: /^withdraw application$/i });
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Application withdrawn successfully');
    });
    expect(withdrawApplicationMock).toHaveBeenCalledWith('app-1', undefined);
    expect(await screen.findByText(/this application was withdrawn/i)).toBeInTheDocument();
  });

  it('keeps the application as submitted when the withdrawal fails', async () => {
    withdrawApplicationMock.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();

    render(<ApplicationDetailsPage />);
    await screen.findByRole('button', { name: /message rescue/i });
    const buttons = screen.getAllByRole('button', { name: /^withdraw application$/i });
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(withdrawApplicationMock).toHaveBeenCalled();
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByText(/this application was withdrawn/i)).not.toBeInTheDocument();
  });
});
