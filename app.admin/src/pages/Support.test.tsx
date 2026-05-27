import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const refetchMock = vi.fn().mockResolvedValue(undefined);
const addResponseMock = vi.fn();

const sampleTickets = [
  {
    ticketId: 'ticket-1',
    subject: 'Cannot reset password',
    description: 'I forgot my password and the reset link is broken',
    status: 'open',
    priority: 'high',
    category: 'account_problem',
    userId: 'user-1',
    userName: 'Alice Tester',
    userEmail: 'alice@test.com',
    responses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    ticketId: 'ticket-2',
    subject: 'Adoption application stuck',
    description: 'My application has been pending for weeks',
    status: 'in_progress',
    priority: 'normal',
    category: 'adoption_inquiry',
    userId: 'user-2',
    userName: 'Bob Tester',
    userEmail: 'bob@test.com',
    responses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

vi.mock('@adopt-dont-shop/lib.support-tickets', () => ({
  useTickets: () => ({
    data: {
      data: sampleTickets,
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    },
    isLoading: false,
    error: null,
    refetch: refetchMock,
  }),
  useTicketStats: () => ({
    data: { open: 1, inProgress: 1, waitingForUser: 0, resolved: 0 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useTicketMutations: () => ({
    addResponse: addResponseMock,
    isLoading: false,
    error: null,
  }),
  getStatusLabel: (s: string) => s,
  getPriorityLabel: (p: string) => p,
  getCategoryLabel: (c: string) => c,
  formatRelativeTime: () => 'just now',
}));

// Stub the modal so we can observe its open state and trigger close
// without rendering the heavy real implementation.
vi.mock('../components/modals/TicketDetailModal', () => ({
  TicketDetailModal: ({
    isOpen,
    onClose,
    ticket,
  }: {
    isOpen: boolean;
    onClose: () => void;
    ticket: { ticketId: string; subject: string } | null;
  }) => {
    if (!isOpen || !ticket) {
      return null;
    }
    return (
      <div data-testid='ticket-detail-modal'>
        <div data-testid='ticket-detail-id'>{ticket.ticketId}</div>
        <div data-testid='ticket-detail-subject'>{ticket.subject}</div>
        <button type='button' onClick={onClose} data-testid='ticket-detail-close'>
          Close
        </button>
      </div>
    );
  },
}));

import Support from './Support';

const renderSupportAt = (initialRoute: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ThemeProvider>
          <Routes>
            <Route path='/support' element={<Support />} />
            <Route path='/support/:ticketId' element={<Support />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// The ticket subject in the list is rendered alongside an id prefix
// ("#cket-1 - Cannot reset password") which splits across text nodes,
// so we look up rows by the customer email column which is intact.
const findTicketRow = (email: string): HTMLElement => {
  const emailCell = screen.getByText(new RegExp(email.replace(/\./g, '\\.'), 'i'));
  const row = emailCell.closest('tr');
  if (!row) {
    throw new Error(`Could not find row for ${email}`);
  }
  return row;
};

describe('Support deep-linking via /support/:ticketId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the detail modal for the ticket in the URL', async () => {
    renderSupportAt('/support/ticket-1');

    await waitFor(() => {
      expect(screen.getByTestId('ticket-detail-modal')).toBeInTheDocument();
    });
    expect(screen.getByTestId('ticket-detail-id')).toHaveTextContent('ticket-1');
    expect(screen.getByTestId('ticket-detail-subject')).toHaveTextContent('Cannot reset password');
  });

  it('does not open the modal when visiting /support without a ticketId', () => {
    renderSupportAt('/support');

    expect(screen.queryByTestId('ticket-detail-modal')).not.toBeInTheDocument();
  });

  it('clicking a row navigates to /support/<ticketId> and opens the modal', async () => {
    renderSupportAt('/support');

    expect(screen.queryByTestId('ticket-detail-modal')).not.toBeInTheDocument();

    fireEvent.click(findTicketRow('bob@test.com'));

    await waitFor(() => {
      expect(screen.getByTestId('ticket-detail-modal')).toBeInTheDocument();
    });
    expect(screen.getByTestId('ticket-detail-id')).toHaveTextContent('ticket-2');
  });

  it('closing the modal navigates back to /support and unmounts the modal', async () => {
    renderSupportAt('/support/ticket-1');

    await waitFor(() => {
      expect(screen.getByTestId('ticket-detail-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('ticket-detail-close'));

    await waitFor(() => {
      expect(screen.queryByTestId('ticket-detail-modal')).not.toBeInTheDocument();
    });
  });

  it('redirects to /support without crashing when the ticketId is unknown', async () => {
    renderSupportAt('/support/does-not-exist');

    // List still renders, modal never opens, and a toast surfaces the error.
    await waitFor(() => {
      expect(screen.getByText(/ticket not found/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('ticket-detail-modal')).not.toBeInTheDocument();
    // Both ticket rows remain visible by their (intact) email cells.
    expect(screen.getByText(/alice@test\.com/)).toBeInTheDocument();
    expect(screen.getByText(/bob@test\.com/)).toBeInTheDocument();
  });
});
