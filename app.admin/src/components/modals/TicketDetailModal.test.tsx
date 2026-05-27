import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { TicketDetailModal } from './TicketDetailModal';
import type { SupportTicket } from '@adopt-dont-shop/lib.support-tickets';

const makeTicket = (overrides: Partial<SupportTicket> = {}): SupportTicket => ({
  ticketId: 'ticket_1700000000_abcdef',
  userId: 'user-1',
  userEmail: 'user@example.com',
  userName: 'Test User',
  assignedTo: null,
  status: 'open',
  priority: 'normal',
  category: 'general_question',
  subject: 'Question about adoptions',
  description: 'Hello, I have a question about how adoptions work on this platform.',
  tags: [],
  responses: [],
  attachments: [],
  metadata: {},
  firstResponseAt: null,
  lastResponseAt: null,
  resolvedAt: null,
  closedAt: null,
  escalatedAt: null,
  escalatedTo: null,
  escalationReason: null,
  satisfactionRating: null,
  satisfactionFeedback: null,
  internalNotes: null,
  dueDate: null,
  estimatedResolutionTime: null,
  actualResolutionTime: null,
  createdAt: new Date('2024-02-01T10:00:00Z'),
  updatedAt: new Date('2024-02-01T10:00:00Z'),
  ...overrides,
});

describe('TicketDetailModal — breadcrumb navigation', () => {
  it('renders breadcrumb segments linking back to the support list and current status', () => {
    const ticket = makeTicket();
    render(
      <TicketDetailModal
        isOpen
        onClose={vi.fn()}
        ticket={ticket}
        onReply={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const ticketsLink = screen.getByRole('link', { name: 'Tickets' });
    expect(ticketsLink).toHaveAttribute('href', '/support');

    const statusLink = screen.getByRole('link', { name: 'Open' });
    expect(statusLink).toHaveAttribute('href', '/support?status=open');
  });

  it('navigates to the next sibling when the next button is clicked', async () => {
    const onNavigate = vi.fn();
    const ticket = makeTicket({ ticketId: 'ticket_b' });
    render(
      <TicketDetailModal
        isOpen
        onClose={vi.fn()}
        ticket={ticket}
        onReply={vi.fn().mockResolvedValue(undefined)}
        siblingIds={['ticket_a', 'ticket_b', 'ticket_c']}
        onNavigate={onNavigate}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /next item/i }));
    expect(onNavigate).toHaveBeenCalledWith('ticket_c');
  });

  it('disables next when the current ticket is the last sibling', () => {
    const ticket = makeTicket({ ticketId: 'ticket_c' });
    render(
      <TicketDetailModal
        isOpen
        onClose={vi.fn()}
        ticket={ticket}
        onReply={vi.fn().mockResolvedValue(undefined)}
        siblingIds={['ticket_a', 'ticket_b', 'ticket_c']}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /next item/i })).toBeDisabled();
  });
});

describe('TicketDetailModal — customer link', () => {
  it('renders the customer name as a link to the user detail route', () => {
    render(
      <TicketDetailModal
        isOpen
        onClose={vi.fn()}
        ticket={makeTicket({ userId: 'user-99', userName: 'Jane Doe' })}
        onReply={vi.fn().mockResolvedValue(undefined)}
      />
    );
    const link = screen.getByRole('link', { name: 'Jane Doe' });
    expect(link).toHaveAttribute('href', '/users/user-99');
  });

  it('calls onClose when the customer link is clicked', () => {
    const onClose = vi.fn();
    render(
      <TicketDetailModal
        isOpen
        onClose={onClose}
        ticket={makeTicket({ userId: 'user-99', userName: 'Jane Doe' })}
        onReply={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: 'Jane Doe' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to plain text when the ticket has no userId', () => {
    render(
      <TicketDetailModal
        isOpen
        onClose={vi.fn()}
        ticket={makeTicket({ userId: null, userName: 'Jane Doe' })}
        onReply={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.queryByRole('link', { name: 'Jane Doe' })).not.toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});
