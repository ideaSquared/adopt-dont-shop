import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from 'styled-components';
import Support from './Support';
import type { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '@adopt-dont-shop/lib-support-tickets';

// Mock theme for styled-components
const mockTheme = {
  colors: {
    primary: {
      100: '#e0e7ff',
      500: '#667eea',
    },
  },
};

// Mock support ticket data
const mockTickets: SupportTicket[] = [
  {
    ticketId: 'ticket-1',
    userId: 'user-1',
    userEmail: 'john@example.com',
    userName: 'John Doe',
    subject: 'Cannot access my account',
    description: 'I forgot my password and cannot reset it',
    category: 'account_problem' as TicketCategory,
    priority: 'high' as TicketPriority,
    status: 'open' as TicketStatus,
    assignedTo: null,
    responses: [],
    createdAt: '2024-11-10T09:00:00Z',
    updatedAt: '2024-11-10T09:00:00Z',
  },
  {
    ticketId: 'ticket-2',
    userId: 'user-2',
    userEmail: 'jane@example.com',
    userName: 'Jane Smith',
    subject: 'Question about adoption process',
    description: 'How long does the adoption process typically take?',
    category: 'adoption_inquiry' as TicketCategory,
    priority: 'normal' as TicketPriority,
    status: 'in_progress' as TicketStatus,
    assignedTo: 'admin-1',
    responses: [
      {
        responseId: 'resp-1',
        ticketId: 'ticket-2',
        content: 'The adoption process typically takes 1-2 weeks.',
        isInternal: false,
        createdBy: 'admin-1',
        createdAt: '2024-11-10T10:00:00Z',
      },
    ],
    createdAt: '2024-11-09T14:00:00Z',
    updatedAt: '2024-11-10T10:00:00Z',
  },
  {
    ticketId: 'ticket-3',
    userId: 'user-3',
    userEmail: 'bob@example.com',
    userName: 'Bob Wilson',
    subject: 'Website bug report',
    description: 'The search feature is not working properly',
    category: 'report_bug' as TicketCategory,
    priority: 'urgent' as TicketPriority,
    status: 'escalated' as TicketStatus,
    assignedTo: 'admin-2',
    responses: [],
    createdAt: '2024-11-10T08:00:00Z',
    updatedAt: '2024-11-10T08:30:00Z',
  },
];

const mockStats = {
  open: 15,
  inProgress: 8,
  waitingForUser: 5,
  resolved: 42,
};

// Mock the hooks from lib-support-tickets
const mockRefetch = jest.fn();
const mockAddResponse = jest.fn();

jest.mock('@adopt-dont-shop/lib-support-tickets', () => ({
  useTickets: () => ({
    data: { data: mockTickets },
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  }),
  useTicketStats: () => ({
    data: mockStats,
    isLoading: false,
  }),
  useTicketMutations: () => ({
    addResponse: mockAddResponse,
  }),
  getStatusLabel: (status: string) => status.replace('_', ' ').toUpperCase(),
  getPriorityLabel: (priority: string) => priority.toUpperCase(),
  getCategoryLabel: (category: string) => category.replace('_', ' ').toUpperCase(),
  formatRelativeTime: (date: string) => '2 hours ago',
}));

// Mock the components library
jest.mock('@adopt-dont-shop/components', () => ({
  Heading: ({ children, level }: { children: React.ReactNode; level: string }) => {
    const Tag = level as keyof JSX.IntrinsicElements;
    return React.createElement(Tag, { 'data-testid': `heading-${level}` }, children);
  },
  Text: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="text">{children}</p>
  ),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Input: ({ value, onChange, type, placeholder }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type: string;
    placeholder: string;
  }) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data-testid="search-input"
    />
  ),
}));

// Mock the TicketDetailModal
jest.mock('../components/modals/TicketDetailModal', () => ({
  TicketDetailModal: ({ isOpen, ticket, onClose, onReply }: {
    isOpen: boolean;
    ticket: SupportTicket | null;
    onClose: () => void;
    onReply: (content: string, isInternal: boolean) => Promise<void>;
  }) =>
    isOpen && ticket ? (
      <div data-testid="ticket-detail-modal">
        <h2>Ticket Details</h2>
        <p data-testid="ticket-subject">#{ticket.ticketId.slice(-6)} - {ticket.subject}</p>
        <p data-testid="ticket-user">{ticket.userName} ({ticket.userEmail})</p>
        <p data-testid="ticket-description">{ticket.description}</p>
        <div data-testid="ticket-responses">
          {ticket.responses?.length || 0} responses
        </div>
        <textarea data-testid="reply-input" placeholder="Type your reply..." />
        <button
          data-testid="send-reply-button"
          onClick={() => onReply('Test reply', false)}
        >
          Send Reply
        </button>
        <button data-testid="close-modal-button" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

// Mock DataTable
jest.mock('../components/data', () => ({
  DataTable: ({ columns, data, loading, emptyMessage, onRowClick, getRowId }: {
    columns: unknown[];
    data: SupportTicket[];
    loading: boolean;
    emptyMessage: string;
    onRowClick: (row: SupportTicket) => void;
    getRowId: (row: SupportTicket) => string;
  }) => {
    if (loading) {
      return <div data-testid="data-table-loading">Loading...</div>;
    }

    if (data.length === 0) {
      return <div data-testid="data-table-empty">{emptyMessage}</div>;
    }

    return (
      <table data-testid="data-table">
        <tbody>
          {data.map((ticket) => (
            <tr
              key={getRowId(ticket)}
              onClick={() => onRowClick(ticket)}
              data-testid={`ticket-row-${ticket.ticketId}`}
            >
              <td data-testid={`ticket-subject-${ticket.ticketId}`}>
                #{ticket.ticketId.slice(-6)} - {ticket.subject}
              </td>
              <td>{ticket.category}</td>
              <td data-testid={`ticket-priority-${ticket.ticketId}`}>{ticket.priority}</td>
              <td data-testid={`ticket-status-${ticket.ticketId}`}>{ticket.status}</td>
              <td>{ticket.responses?.length || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
}));

// Mock react-icons
jest.mock('react-icons/fi', () => ({
  FiSearch: () => <span>🔍</span>,
  FiMessageSquare: () => <span>💬</span>,
  FiClock: () => <span>⏰</span>,
  FiCheckCircle: () => <span>✅</span>,
  FiAlertCircle: () => <span>⚠️</span>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderSupport = () => {
  return render(
    <ThemeProvider theme={mockTheme}>
      <QueryClientProvider client={queryClient}>
        <Support />
      </QueryClientProvider>
    </ThemeProvider>
  );
};

describe('Support Page - Support Ticket Behaviours', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddResponse.mockResolvedValue({
      ...mockTickets[0],
      responses: [
        {
          responseId: 'new-resp',
          ticketId: mockTickets[0].ticketId,
          content: 'Test reply',
          isInternal: false,
          createdBy: 'admin',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });

  describe('Ticket List Display', () => {
    it('admin can view list of support tickets', () => {
      renderSupport();

      expect(screen.getByText('Support Tickets')).toBeInTheDocument();
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('admin sees ticket information for each ticket', () => {
      renderSupport();

      mockTickets.forEach((ticket) => {
        expect(screen.getByTestId(`ticket-subject-${ticket.ticketId}`)).toHaveTextContent(
          ticket.subject
        );
      });
    });

    it('admin sees ticket priority badges', () => {
      renderSupport();

      expect(screen.getByTestId('ticket-priority-ticket-1')).toHaveTextContent('high');
      expect(screen.getByTestId('ticket-priority-ticket-2')).toHaveTextContent('normal');
      expect(screen.getByTestId('ticket-priority-ticket-3')).toHaveTextContent('urgent');
    });

    it('admin sees ticket status badges', () => {
      renderSupport();

      expect(screen.getByTestId('ticket-status-ticket-1')).toHaveTextContent('open');
      expect(screen.getByTestId('ticket-status-ticket-2')).toHaveTextContent('in_progress');
      expect(screen.getByTestId('ticket-status-ticket-3')).toHaveTextContent('escalated');
    });

    it('admin sees reply count for each ticket', () => {
      const { container } = renderSupport();

      // Check that reply counts are displayed
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);

      // Verify each row has a cell with reply count
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        // Last cell should contain the reply count
        const lastCell = cells[cells.length - 1];
        expect(lastCell.textContent).toMatch(/^\d+$/); // Should be a number
      });
    });
  });

  describe('Ticket Statistics', () => {
    it('admin sees ticket statistics dashboard', () => {
      renderSupport();

      expect(screen.getByText('Open Tickets')).toBeInTheDocument();
      // "In Progress" appears in both stats and filter, so use getAllByText
      expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
      expect(screen.getByText('Waiting on User')).toBeInTheDocument();
      expect(screen.getByText('Resolved Today')).toBeInTheDocument();
    });

    it('admin sees correct statistics values', () => {
      renderSupport();

      expect(screen.getByText('15')).toBeInTheDocument(); // Open
      expect(screen.getByText('8')).toBeInTheDocument(); // In Progress
      expect(screen.getByText('5')).toBeInTheDocument(); // Waiting
      expect(screen.getByText('42')).toBeInTheDocument(); // Resolved
    });
  });

  describe('Search and Filtering', () => {
    it('admin can search for tickets by subject', async () => {
      const user = userEvent.setup();
      renderSupport();

      const searchInput = screen.getByPlaceholderText(
        'Search tickets by subject, user, or email...'
      );
      await user.type(searchInput, 'account');

      expect(searchInput).toHaveValue('account');
    });

    it('admin can filter tickets by status', async () => {
      const user = userEvent.setup();
      renderSupport();

      const statusFilter = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusFilter, 'open');

      expect(statusFilter).toHaveValue('open');
    });

    it('admin can filter tickets by priority', async () => {
      const user = userEvent.setup();
      renderSupport();

      const priorityFilter = screen.getByDisplayValue('All Priorities');
      await user.selectOptions(priorityFilter, 'urgent');

      expect(priorityFilter).toHaveValue('urgent');
    });

    it('admin can filter tickets by category', async () => {
      const user = userEvent.setup();
      renderSupport();

      const categoryFilter = screen.getByDisplayValue('All Categories');
      await user.selectOptions(categoryFilter, 'account_problem');

      expect(categoryFilter).toHaveValue('account_problem');
    });

    it('admin sees all status filter options', () => {
      renderSupport();

      const statusFilter = screen.getByDisplayValue('All Statuses') as HTMLSelectElement;
      const options = Array.from(statusFilter.options).map((opt) => opt.value);

      expect(options).toContain('all');
      expect(options).toContain('open');
      expect(options).toContain('in_progress');
      expect(options).toContain('waiting_for_user');
      expect(options).toContain('resolved');
      expect(options).toContain('closed');
      expect(options).toContain('escalated');
    });

    it('admin sees all priority filter options', () => {
      renderSupport();

      const priorityFilter = screen.getByDisplayValue('All Priorities') as HTMLSelectElement;
      const options = Array.from(priorityFilter.options).map((opt) => opt.value);

      expect(options).toContain('all');
      expect(options).toContain('critical');
      expect(options).toContain('urgent');
      expect(options).toContain('high');
      expect(options).toContain('normal');
      expect(options).toContain('low');
    });

    it('admin sees all category filter options', () => {
      renderSupport();

      const categoryFilter = screen.getByDisplayValue('All Categories') as HTMLSelectElement;
      const options = Array.from(categoryFilter.options).map((opt) => opt.value);

      expect(options).toContain('all');
      expect(options).toContain('technical_issue');
      expect(options).toContain('account_problem');
      expect(options).toContain('adoption_inquiry');
      expect(options).toContain('payment_issue');
      expect(options).toContain('feature_request');
      expect(options).toContain('report_bug');
      expect(options).toContain('general_question');
      expect(options).toContain('compliance_concern');
      expect(options).toContain('data_request');
      expect(options).toContain('other');
    });
  });

  describe('Ticket Details', () => {
    it('admin can click on a ticket to view details', async () => {
      const user = userEvent.setup();
      renderSupport();

      const ticketRow = screen.getByTestId('ticket-row-ticket-1');
      await user.click(ticketRow);

      await waitFor(() => {
        expect(screen.getByTestId('ticket-detail-modal')).toBeInTheDocument();
      });
    });

    it('admin sees ticket detail modal with complete information', async () => {
      const user = userEvent.setup();
      renderSupport();

      const ticketRow = screen.getByTestId('ticket-row-ticket-1');
      await user.click(ticketRow);

      await waitFor(() => {
        const modal = screen.getByTestId('ticket-detail-modal');
        expect(screen.getByTestId('ticket-subject')).toHaveTextContent('Cannot access my account');
        expect(screen.getByTestId('ticket-user')).toHaveTextContent('John Doe');
        expect(screen.getByTestId('ticket-user')).toHaveTextContent('john@example.com');
        expect(screen.getByTestId('ticket-description')).toHaveTextContent(
          'I forgot my password and cannot reset it'
        );
      });
    });

    it('admin sees all ticket responses in modal', async () => {
      const user = userEvent.setup();
      renderSupport();

      const ticketRow = screen.getByTestId('ticket-row-ticket-2');
      await user.click(ticketRow);

      await waitFor(() => {
        expect(screen.getByTestId('ticket-responses')).toHaveTextContent('1 responses');
      });
    });

    it('admin can close ticket detail modal', async () => {
      const user = userEvent.setup();
      renderSupport();

      const ticketRow = screen.getByTestId('ticket-row-ticket-1');
      await user.click(ticketRow);

      await waitFor(() => {
        expect(screen.getByTestId('ticket-detail-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId('close-modal-button');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('ticket-detail-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Ticket Actions', () => {
    it('admin can reply to a ticket', async () => {
      const user = userEvent.setup();
      renderSupport();

      const ticketRow = screen.getByTestId('ticket-row-ticket-1');
      await user.click(ticketRow);

      await waitFor(() => {
        expect(screen.getByTestId('ticket-detail-modal')).toBeInTheDocument();
      });

      const replyButton = screen.getByTestId('send-reply-button');
      await user.click(replyButton);

      await waitFor(() => {
        expect(mockAddResponse).toHaveBeenCalledWith('ticket-1', {
          content: 'Test reply',
          isInternal: false,
        });
      });
    });

    it('admin sees reply form in ticket modal', async () => {
      const user = userEvent.setup();
      renderSupport();

      const ticketRow = screen.getByTestId('ticket-row-ticket-1');
      await user.click(ticketRow);

      await waitFor(() => {
        expect(screen.getByTestId('reply-input')).toBeInTheDocument();
        expect(screen.getByTestId('send-reply-button')).toBeInTheDocument();
      });
    });

    it('admin can type a reply message', async () => {
      const user = userEvent.setup();
      renderSupport();

      const ticketRow = screen.getByTestId('ticket-row-ticket-1');
      await user.click(ticketRow);

      await waitFor(() => {
        expect(screen.getByTestId('reply-input')).toBeInTheDocument();
      });

      const replyInput = screen.getByTestId('reply-input');
      await user.type(replyInput, 'This is my reply');

      expect(replyInput).toHaveValue('This is my reply');
    });
  });

  describe('Empty and Loading States', () => {
    it('admin sees loading state while fetching tickets', () => {
      jest.spyOn(require('@adopt-dont-shop/lib-support-tickets'), 'useTickets').mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      renderSupport();

      expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();
    });

    it('admin sees empty state when no tickets exist', () => {
      jest.spyOn(require('@adopt-dont-shop/lib-support-tickets'), 'useTickets').mockReturnValue({
        data: { data: [] },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      renderSupport();

      expect(screen.getByTestId('data-table-empty')).toBeInTheDocument();
      expect(
        screen.getByText('No support tickets found matching your criteria')
      ).toBeInTheDocument();
    });

    it('admin sees error message when tickets fail to load', () => {
      jest.spyOn(require('@adopt-dont-shop/lib-support-tickets'), 'useTickets').mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      const { container } = renderSupport();

      // Error message should be displayed
      expect(screen.getByText(/Error loading tickets/i)).toBeInTheDocument();

      // Check that error details are in the DOM (text might be split across elements)
      expect(container.textContent).toContain('Network error');
    });
  });

  describe('Page Header', () => {
    it('admin sees page title and description', () => {
      renderSupport();

      expect(screen.getByText('Support Tickets')).toBeInTheDocument();
      expect(screen.getByText('Manage customer support requests and inquiries')).toBeInTheDocument();
    });
  });
});
