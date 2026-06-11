import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { EditUserModal } from './EditUserModal';
import type { AdminUser } from '@/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const testUser: AdminUser = {
  userId: 'u1',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  userType: 'user',
  status: 'active',
  emailVerified: true,
  phoneNumber: '555-1234',
  phoneVerified: false,
  profileImageUrl: null,
  bio: null,
  country: null,
  city: null,
  addressLine1: null,
  addressLine2: null,
  postalCode: null,
  rescueId: null,
  rescueName: null,
  lastLoginAt: null,
  lastLogin: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EditUserModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when user is null', () => {
    const { container } = renderWithProviders(
      <EditUserModal isOpen={true} onClose={onClose} user={null} onSave={onSave} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('populates the form with user data', () => {
    renderWithProviders(
      <EditUserModal isOpen={true} onClose={onClose} user={testUser} onSave={onSave} />
    );

    expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
    expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com');
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('555-1234');
  });

  it('shows role dropdown with valid options', () => {
    renderWithProviders(
      <EditUserModal isOpen={true} onClose={onClose} user={testUser} onSave={onSave} />
    );

    const roleSelect = screen.getByLabelText(/role/i);
    const options = Array.from(roleSelect.querySelectorAll('option')).map(o => o.textContent);

    expect(options).toEqual(['User', 'Admin', 'Moderator', 'Super Admin']);
  });

  it('shows status dropdown with active and suspended options', () => {
    renderWithProviders(
      <EditUserModal isOpen={true} onClose={onClose} user={testUser} onSave={onSave} />
    );

    const statusSelect = screen.getByLabelText(/status/i);
    const options = Array.from(statusSelect.querySelectorAll('option')).map(o => o.textContent);

    expect(options).toEqual(['Active', 'Suspended']);
  });

  describe('dirty-field detection', () => {
    it('closes without saving when no fields are changed', async () => {
      renderWithProviders(
        <EditUserModal isOpen={true} onClose={onClose} user={testUser} onSave={onSave} />
      );

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('sends only modified fields to onSave', async () => {
      renderWithProviders(
        <EditUserModal isOpen={true} onClose={onClose} user={testUser} onSave={onSave} />
      );

      const user = userEvent.setup();
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('u1', { firstName: 'Jane' });
      });
    });

    it('includes role change in the update payload', async () => {
      renderWithProviders(
        <EditUserModal isOpen={true} onClose={onClose} user={testUser} onSave={onSave} />
      );

      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/role/i), 'admin');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('u1', { userType: 'admin' });
      });
    });

    it('includes multiple changed fields in the update payload', async () => {
      renderWithProviders(
        <EditUserModal isOpen={true} onClose={onClose} user={testUser} onSave={onSave} />
      );

      const user = userEvent.setup();
      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'jane@example.com');

      await user.selectOptions(screen.getByLabelText(/status/i), 'suspended');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('u1', {
          email: 'jane@example.com',
          status: 'suspended',
        });
      });
    });
  });

  describe('error handling', () => {
    it('shows an error message when onSave rejects', async () => {
      onSave.mockRejectedValueOnce(new Error('Update failed'));

      renderWithProviders(
        <EditUserModal isOpen={true} onClose={onClose} user={testUser} onSave={onSave} />
      );

      const user = userEvent.setup();
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Changed');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('shows a generic error for non-Error rejections', async () => {
      onSave.mockRejectedValueOnce('unknown');

      renderWithProviders(
        <EditUserModal isOpen={true} onClose={onClose} user={testUser} onSave={onSave} />
      );

      const user = userEvent.setup();
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Changed');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to update user')).toBeInTheDocument();
      });
    });
  });

  describe('cancel', () => {
    it('calls onClose when cancel button is clicked', async () => {
      renderWithProviders(
        <EditUserModal isOpen={true} onClose={onClose} user={testUser} onSave={onSave} />
      );

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
