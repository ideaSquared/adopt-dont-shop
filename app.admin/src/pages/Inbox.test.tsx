import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';

const mockAssignMutate = vi.fn();
const mockNavigate = vi.fn();

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
    assignedTo: 'admin-1',
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
  useInbox: () => ({
    data: {
      data: sampleItems,
      pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
    },
    isLoading: false,
    error: null,
  }),
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
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import Inbox from './Inbox';

describe('Inbox page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
