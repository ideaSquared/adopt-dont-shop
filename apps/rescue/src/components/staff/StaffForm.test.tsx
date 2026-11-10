import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '../../test-utils';
import StaffForm from './StaffForm';

describe('StaffForm', () => {
  it('renders the user ID and title fields with accessible labels', () => {
    renderWithProviders(<StaffForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('presents the form as a dialog and cancels from the Cancel button', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithProviders(<StaffForm onSubmit={vi.fn()} onCancel={onCancel} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add New Staff Member' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows the edit wording and locks the user ID when editing', () => {
    renderWithProviders(
      <StaffForm
        isEditing
        initialStaff={{
          id: 'staff-1',
          userId: 'user_0000abcd1234',
          rescueId: 'rescue-1',
          firstName: 'Sam',
          lastName: 'Jones',
          email: 'sam@example.com',
          title: 'Coordinator',
          isVerified: true,
          addedAt: '2024-01-01T00:00:00Z',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Edit Staff Member' })).toBeInTheDocument();
    expect(screen.getByLabelText(/user id/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Update Staff Member' })).toBeInTheDocument();
  });

  it('rejects an invalid user ID and does not submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<StaffForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/user id/i), 'not-a-valid-id');
    await user.click(screen.getByRole('button', { name: /add staff member/i }));

    expect(await screen.findByText(/valid user id/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid user ID', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<StaffForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/user id/i), 'user_0000abcd1234');
    await user.type(screen.getByLabelText(/title/i), 'Coordinator');
    await user.click(screen.getByRole('button', { name: /add staff member/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      userId: 'user_0000abcd1234',
      title: 'Coordinator',
    });
  });
});
