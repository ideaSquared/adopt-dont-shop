import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';
import { createMockUser } from '@adopt-dont-shop/lib.dev-tools';
import { ProfileEditForm } from './ProfileEditForm';

const baseUser = createMockUser({
  userId: 'user-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
});

describe('ProfileEditForm', () => {
  it('renders labelled fields for the editable profile data', () => {
    render(<ProfileEditForm user={baseUser} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue('Ada');
    expect(screen.getByLabelText(/^email/i)).toHaveValue('ada@example.com');
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
  });

  it('shows inline validation errors when required fields are cleared', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ProfileEditForm user={baseUser} onSave={onSave} onCancel={vi.fn()} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.clear(screen.getByLabelText(/^email/i));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a malformed email address', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ProfileEditForm user={baseUser} onSave={onSave} onCancel={vi.fn()} />);

    await user.clear(screen.getByLabelText(/^email/i));
    await user.type(screen.getByLabelText(/^email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('clears a field error once the user edits it', async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm user={baseUser} onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText('First name is required')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/first name/i), 'Grace');
    expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
  });

  it('submits mapped profile data when valid', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileEditForm user={baseUser} onSave={onSave} onCancel={vi.fn()} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.type(screen.getByLabelText(/first name/i), 'Grace');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0] as { firstName?: string; email?: string };
    expect(payload.firstName).toBe('Grace');
    expect(payload.email).toBe('ada@example.com');
  });
});
