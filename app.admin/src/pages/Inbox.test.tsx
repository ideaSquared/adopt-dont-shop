import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import type { InboxFilters } from '../hooks/useInbox';

const mockAssignMutate = vi.fn();
const mockNavigate = vi.fn();
const mockUseInbox = vi.fn();

const sampleItems = [
  {
    id: 'report-1',
    source: 'moderation' as const,
    title: 'Spam report on pet listing',
    summary: 'User posted spam content on a pet listing page',
    status: 'pending',
    severity: 'high',
    assignedTo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relatedUserId: 'user-1',
    relatedUserEmail: 'spammer@test.com',
  },
  {
    id: 'ticket-1',
    source: 'support' as const,
    title: 'Cannot access my account',
    summary: 'I forgot my password and reset is not working',
    status: 'open',
    severity: 'medium',
    assignedTo: 'admin-user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relatedUserId: 'user-2',
    relatedUserEmail: 'user2@test.com',
  },
  {
    id: 'chat-1',
    source: 'message' as const,
    title: 'Chat #abc123',
    summary: 'active conversation with 2 participants',
    status: 'active',
    severity: 'medium',
    assignedTo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relatedUserId: 'user-3',
    relatedUserEmail: 'user3@test.com',
  },
];

vi.mock('../hooks/useInbox', () => ({
  useInbox: (filters: InboxFilters) => mockUseInbox(filters),
  useInboxAssign: () => ({
    mutate: mockAssignMutate,
    isPending: false,
  }),
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({
    user: { userId: 'admin-user-1', email: 'admin@test.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import Inbox from './Inbox';

describe('Inbox page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInbox.mockImplementation((_filters: InboxFilters) => ({
      data: {
        data: sampleItems,
        pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
      },
      isLoading: false,
      error: null,
    }));
  });

  it('renders the page heading and filter controls', () => {
    renderWithProviders(<Inbox />);

    expect(screen.getByText('Triage Inbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search across all items...')).toBeInTheDocument();
    expect(screen.getByLabelText('Source')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Severity')).toBeInTheDocument();
  });

  it('displays items from all three sources', () => {
    renderWithProviders(<Inbox />);

    // Source badges in the table rows
    expect(screen.getAllByText('Moderation').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Support').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Message').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Spam report on pet listing')).toBeInTheDocument();
    expect(screen.getByText('Cannot access my account')).toBeInTheDocument();
    expect(screen.getByText('Chat #abc123')).toBeInTheDocument();
  });

  it('shows related user email for items that have one', () => {
    renderWithProviders(<Inbox />);

    expect(screen.getByText('spammer@test.com')).toBeInTheDocument();
    expect(screen.getByText('user2@test.com')).toBeInTheDocument();
    expect(screen.getByText('user3@test.com')).toBeInTheDocument();
  });

  it('shows assign button only for unassigned items', () => {
    renderWithProviders(<Inbox />);

    const assignButtons = screen.getAllByTitle('Assign to me');
    // Items at index 0 (report-1) and 2 (chat-1) are unassigned
    expect(assignButtons).toHaveLength(2);
  });

  it('calls assign mutation with current user when assign button clicked', () => {
    renderWithProviders(<Inbox />);

    const assignButtons = screen.getAllByTitle('Assign to me');
    fireEvent.click(assignButtons[0]);

    expect(mockAssignMutate).toHaveBeenCalledWith({
      itemId: 'report-1',
      source: 'moderation',
      assignedTo: 'admin-user-1',
    });
  });

  it('allows filtering by source', () => {
    renderWithProviders(<Inbox />);

    const sourceSelect = screen.getByLabelText('Source');
    fireEvent.change(sourceSelect, { target: { value: 'moderation' } });

    expect(sourceSelect).toHaveValue('moderation');
  });

  it('navigates message-source rows to the chat deep-link, not the list view', () => {
    renderWithProviders(<Inbox />);

    fireEvent.click(screen.getByText('Chat #abc123'));

    expect(mockNavigate).toHaveBeenCalledWith('/messages?chatId=chat-1');
  });

  it('navigates moderation rows to the moderation page', () => {
    renderWithProviders(<Inbox />);

    fireEvent.click(screen.getByText('Spam report on pet listing'));

    expect(mockNavigate).toHaveBeenCalledWith('/moderation');
  });

  it('navigates support rows to the specific ticket page', () => {
    renderWithProviders(<Inbox />);

    fireEvent.click(screen.getByText('Cannot access my account'));

    expect(mockNavigate).toHaveBeenCalledWith('/support/ticket-1');
  });

  it('renders the related user email as a link to the user detail page', () => {
    renderWithProviders(<Inbox />);

    const emailLink = screen.getByRole('link', { name: 'spammer@test.com' });
    expect(emailLink).toHaveAttribute('href', '/users/user-1');
  });

  it('clicking the email link does not trigger the row navigation', () => {
    renderWithProviders(<Inbox />);

    const emailLink = screen.getByRole('link', { name: 'user3@test.com' });
    fireEvent.click(emailLink);

    expect(mockNavigate).not.toHaveBeenCalledWith('/messages?chatId=chat-1');
  });

  describe('My Queue filter', () => {
    it('does not pass assignedTo filter by default', () => {
      renderWithProviders(<Inbox />);

      const lastCall = mockUseInbox.mock.calls.at(-1);
      expect(lastCall?.[0]?.assignedTo).toBeUndefined();
    });

    it('toggles aria-pressed and queries with current user id when clicked', () => {
      renderWithProviders(<Inbox />);

      const chip = screen.getByRole('button', { name: /My Queue/i });
      expect(chip).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(chip);

      expect(chip).toHaveAttribute('aria-pressed', 'true');
      const lastCall = mockUseInbox.mock.calls.at(-1);
      expect(lastCall?.[0]?.assignedTo).toBe('admin-user-1');
    });

    it('reads ?assignedTo=me from the URL on initial render', () => {
      renderWithProviders(<Inbox />, { initialRoute: '/inbox?assignedTo=me' });

      const chip = screen.getByRole('button', { name: /My Queue/i });
      expect(chip).toHaveAttribute('aria-pressed', 'true');

      const lastCall = mockUseInbox.mock.calls.at(-1);
      expect(lastCall?.[0]?.assignedTo).toBe('admin-user-1');
    });

    it('clears the assignedTo filter when toggled off', () => {
      renderWithProviders(<Inbox />, { initialRoute: '/inbox?assignedTo=me' });

      const chip = screen.getByRole('button', { name: /My Queue/i });
      fireEvent.click(chip);

      expect(chip).toHaveAttribute('aria-pressed', 'false');
      const lastCall = mockUseInbox.mock.calls.at(-1);
      expect(lastCall?.[0]?.assignedTo).toBeUndefined();
    });
  });
});
