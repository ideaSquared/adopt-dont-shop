import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import { toast } from '@adopt-dont-shop/lib.components';
import type { AdminUser } from '@/types';
import { CreateSupportTicketModal } from './CreateSupportTicketModal';

const user = {
  userId: 'user-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
} as AdminUser; // test fixture: only the fields the modal reads

const fillIn = () => {
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Cannot log in' } });
  fireEvent.change(screen.getByLabelText('Description'), {
    target: { value: 'The login page keeps failing' },
  });
};

describe('CreateSupportTicketModal', () => {
  it('creates a ticket for the user with the chosen category and priority, then toasts and closes', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<CreateSupportTicketModal isOpen onClose={onClose} user={user} onCreate={onCreate} />);

    fillIn();
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'technical_issue' } });
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith({
      customerId: 'user-1',
      customerEmail: 'ada@example.com',
      customerName: 'Ada Lovelace',
      subject: 'Cannot log in',
      description: 'The login page keeps failing',
      category: 'technical_issue',
      priority: 'high',
    });
    expect(toast.success).toHaveBeenCalledWith('Support ticket created successfully!');
  });

  it('keeps Create Ticket disabled until a subject and description are entered', () => {
    render(<CreateSupportTicketModal isOpen onClose={vi.fn()} user={user} onCreate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Create Ticket' })).toBeDisabled();
  });

  it('shows the failure and stays open when creation fails', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Service unavailable'));
    const onClose = vi.fn();
    render(<CreateSupportTicketModal isOpen onClose={onClose} user={user} onCreate={onCreate} />);

    fillIn();
    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders nothing without a user', () => {
    render(<CreateSupportTicketModal isOpen onClose={vi.fn()} user={null} onCreate={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
