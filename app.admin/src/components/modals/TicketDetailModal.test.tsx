import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { TicketDetailModal } from './TicketDetailModal';
import { SupportTicketSchema, type SupportTicket } from '@adopt-dont-shop/lib.support-tickets';

const buildTicket = (overrides: Record<string, unknown> = {}): SupportTicket =>
  SupportTicketSchema.parse({
    ticketId: 'tkt-1',
    userId: 'user-99',
    userEmail: 'jane@example.com',
    userName: 'Jane Doe',
    subject: 'Help me please',
    description: 'Something is wrong with my account',
    category: 'general_question',
    status: 'open',
    priority: 'normal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responses: [],
    ...overrides,
  });

describe('TicketDetailModal', () => {
  it('renders the customer name as a link to the user detail route', () => {
    render(<TicketDetailModal isOpen onClose={vi.fn()} ticket={buildTicket()} onReply={vi.fn()} />);
    const link = screen.getByRole('link', { name: 'Jane Doe' });
    expect(link).toHaveAttribute('href', '/users/user-99');
  });

  it('calls onClose when the customer link is clicked', () => {
    const onClose = vi.fn();
    render(<TicketDetailModal isOpen onClose={onClose} ticket={buildTicket()} onReply={vi.fn()} />);

    fireEvent.click(screen.getByRole('link', { name: 'Jane Doe' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to plain text when the ticket has no userId', () => {
    render(
      <TicketDetailModal
        isOpen
        onClose={vi.fn()}
        ticket={buildTicket({ userId: null })}
        onReply={vi.fn()}
      />
    );
    expect(screen.queryByRole('link', { name: 'Jane Doe' })).not.toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});
