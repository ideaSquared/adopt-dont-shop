import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import { ModerationTab } from './ModerationTab';

vi.mock('@adopt-dont-shop/lib.moderation', () => ({
  moderationService: {
    getReports: vi.fn(),
    createReport: vi.fn(),
  },
}));

import { moderationService } from '@adopt-dont-shop/lib.moderation';

const mockGetReports = vi.mocked(moderationService.getReports);
const mockCreateReport = vi.mocked(moderationService.createReport);

const buildChat = (overrides = {}) => ({
  id: 'chat-1',
  status: 'active',
  participants: [
    { id: 'user-1', name: 'Alice', type: 'adopter' },
    { id: 'user-2', name: 'Bob', type: 'rescue' },
  ],
  rescueName: 'Happy Paws',
  petId: 'pet-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastMessage: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetReports.mockResolvedValue({ data: [], pagination: { page: 1, pages: 1, total: 0 } });
});

describe('ModerationTab', () => {
  it('renders the flag conversation button', async () => {
    render(<ModerationTab chat={buildChat()} chatId='chat-1' />);
    expect(
      await screen.findByRole('button', { name: /report this conversation/i })
    ).toBeInTheDocument();
  });

  it('renders empty state when there are no reports', async () => {
    mockGetReports.mockResolvedValue({ data: [], pagination: { page: 1, pages: 1, total: 0 } });
    render(<ModerationTab chat={buildChat()} chatId='chat-1' />);
    expect(await screen.findByText('No reports filed for this conversation')).toBeInTheDocument();
  });

  it('renders a report list when reports exist', async () => {
    mockGetReports.mockResolvedValue({
      data: [
        {
          reportId: 'rep-1',
          category: 'spam',
          status: 'pending',
          description: 'Spammy content',
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    });

    render(<ModerationTab chat={buildChat()} chatId='chat-1' />);
    expect(await screen.findByText('spam')).toBeInTheDocument();
    expect(screen.getByText('Spammy content')).toBeInTheDocument();
  });

  it('calls createReport and refreshes when flag button is clicked', async () => {
    mockCreateReport.mockResolvedValue(undefined);
    mockGetReports.mockResolvedValue({ data: [], pagination: { page: 1, pages: 1, total: 0 } });

    render(<ModerationTab chat={buildChat()} chatId='chat-1' />);
    fireEvent.click(await screen.findByRole('button', { name: /report this conversation/i }));

    await waitFor(() => {
      expect(mockCreateReport).toHaveBeenCalledWith(
        expect.objectContaining({ reportedEntityId: 'chat-1', reportedEntityType: 'conversation' })
      );
    });
  });

  it('renders participant links for moderation', async () => {
    render(<ModerationTab chat={buildChat()} chatId='chat-1' />);
    expect(await screen.findByText('Alice (adopter)')).toBeInTheDocument();
    expect(screen.getByText('Bob (rescue)')).toBeInTheDocument();
  });
});
