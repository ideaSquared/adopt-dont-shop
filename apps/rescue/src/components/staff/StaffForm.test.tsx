import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '../../test-utils';
import StaffForm from './StaffForm';

const staff = {
  id: 'staff-1',
  userId: 'user_0000abcd1234',
  rescueId: 'rescue-1',
  firstName: 'Sam',
  lastName: 'Jones',
  email: 'sam@example.com',
  title: 'Coordinator',
  isVerified: true,
  addedAt: '2024-01-01T00:00:00Z',
};

describe('StaffForm', () => {
  it('presents the title form as a dialog and cancels from the Cancel button', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithProviders(<StaffForm initialStaff={staff} onSubmit={vi.fn()} onCancel={onCancel} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit Staff Member' })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Coordinator');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('has no user ID control', () => {
    renderWithProviders(<StaffForm initialStaff={staff} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByLabelText(/user id/i)).not.toBeInTheDocument();
  });

  it('submits the updated title', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<StaffForm initialStaff={staff} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), 'Manager');
    await user.click(screen.getByRole('button', { name: 'Update Staff Member' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ userId: 'user_0000abcd1234', title: 'Manager' });
  });
});
