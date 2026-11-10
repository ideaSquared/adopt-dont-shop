import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteStaffModal from './InviteStaffModal';

describe('InviteStaffModal', () => {
  it('presents the invitation form as a dialog titled "Invite Staff Member"', () => {
    render(<InviteStaffModal onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Invite Staff Member' })).toBeInTheDocument();
  });

  it('calls onCancel from the Cancel button', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<InviteStaffModal onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('submits the email and title', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<InviteStaffModal onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
    await user.type(screen.getByLabelText(/title\/role/i), 'Coordinator');
    await user.click(screen.getByRole('button', { name: 'Send Invitation' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: 'new@example.com', title: 'Coordinator' })
    );
  });

  it('disables the actions while an invitation is being sent', () => {
    render(<InviteStaffModal onSubmit={vi.fn()} onCancel={vi.fn()} loading />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /sending invitation/i })).toBeDisabled();
  });
});

describe('InviteStaffModal aria-required (a11y sweep — extends PR #673/#674 C1-2)', () => {
  it('marks the required email input with aria-required="true"', () => {
    render(<InviteStaffModal onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-required', 'true');
  });

  it('does not set aria-required on the optional title input', () => {
    render(<InviteStaffModal onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/title\/role/i)).not.toHaveAttribute('aria-required');
  });
});
