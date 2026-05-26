import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { UserActionsMenu } from './UserActionsMenu';
import type { AdminUser } from '@/types';

// Override the global Modal mock so it respects the `isOpen` prop.
// The setup-tests.ts Modal mock renders children unconditionally.
vi.mock('@adopt-dont-shop/lib.components', async () => {
  const original =
    await vi.importActual<typeof import('@adopt-dont-shop/lib.components')>(
      '@adopt-dont-shop/lib.components'
    );
  return {
    ...original,
    Modal: ({
      children,
      isOpen,
      ...props
    }: {
      children: React.ReactNode;
      isOpen: boolean;
      [k: string]: unknown;
    }) => (isOpen ? React.createElement('div', props, children) : null),
    Button: ({ children, ...props }: React.ComponentPropsWithoutRef<'button'>) =>
      React.createElement('button', props, children),
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const activeUser: AdminUser = {
  userId: 'u1',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  userType: 'adopter',
  status: 'active',
  emailVerified: false,
  phoneNumber: null,
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

const suspendedUser: AdminUser = { ...activeUser, status: 'suspended' };
const verifiedUser: AdminUser = { ...activeUser, emailVerified: true };

// ── Tests ────────────────────────────────────────────────────────────────────

describe('UserActionsMenu', () => {
  const defaultHandlers = {
    onSuspend: vi.fn().mockResolvedValue(undefined),
    onUnsuspend: vi.fn().mockResolvedValue(undefined),
    onVerify: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const openMenu = async () => {
    const user = userEvent.setup();
    const button = screen.getByLabelText('Actions menu');
    await user.click(button);
    return user;
  };

  describe('menu items based on user state', () => {
    it('shows suspend option for active users', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      await openMenu();

      expect(screen.getByRole('menuitem', { name: /suspend user/i })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /unsuspend user/i })).not.toBeInTheDocument();
    });

    it('shows unsuspend option for suspended users', async () => {
      renderWithProviders(<UserActionsMenu user={suspendedUser} {...defaultHandlers} />);
      await openMenu();

      expect(screen.getByRole('menuitem', { name: /unsuspend user/i })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /^suspend user$/i })).not.toBeInTheDocument();
    });

    it('shows verify email option when email is not verified', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      await openMenu();

      expect(screen.getByRole('menuitem', { name: /verify email/i })).toBeInTheDocument();
    });

    it('hides verify email option when email is already verified', async () => {
      renderWithProviders(<UserActionsMenu user={verifiedUser} {...defaultHandlers} />);
      await openMenu();

      expect(screen.queryByRole('menuitem', { name: /verify email/i })).not.toBeInTheDocument();
    });

    it('always shows delete user option', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      await openMenu();

      expect(screen.getByRole('menuitem', { name: /delete user/i })).toBeInTheDocument();
    });

    it('shows password reset option when onResetPassword is provided', async () => {
      renderWithProviders(
        <UserActionsMenu
          user={activeUser}
          {...defaultHandlers}
          onResetPassword={vi.fn().mockResolvedValue(undefined)}
        />
      );
      await openMenu();

      expect(screen.getByRole('menuitem', { name: /send password reset/i })).toBeInTheDocument();
    });

    it('hides password reset option when onResetPassword is not provided', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      await openMenu();

      expect(
        screen.queryByRole('menuitem', { name: /send password reset/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('confirmation dialogs', () => {
    it('shows confirmation dialog when suspend is clicked', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: /suspend user/i }));

      expect(screen.getByText(/are you sure you want to suspend this user/i)).toBeInTheDocument();
      expect(screen.getByText('John Doe (john@example.com)')).toBeInTheDocument();
    });

    it('shows confirmation dialog when delete is clicked', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: /delete user/i }));

      expect(
        screen.getByText(/are you sure you want to delete this user/i)
      ).toBeInTheDocument();
    });

    it('shows danger warning for destructive actions', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: /delete user/i }));

      // The danger box renders a <strong>Warning:</strong> prefix
      expect(screen.getByText(/^Warning:$/)).toBeInTheDocument();
    });

    it('shows reason field for suspend action', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: /suspend user/i }));

      expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    });

    it('shows reason field for delete action', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: /delete user/i }));

      expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    });
  });

  describe('confirm actions', () => {
    it('calls onVerify with the user ID on confirm', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: /verify email/i }));

      const confirmButton = screen.getByRole('button', { name: /verify email/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(defaultHandlers.onVerify).toHaveBeenCalledWith('u1');
      });
    });

    it('calls onSuspend with user ID and reason on confirm', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: /suspend user/i }));

      const reasonField = screen.getByLabelText(/reason/i);
      await user.type(reasonField, 'Violated terms of service');

      const confirmButton = screen.getByRole('button', { name: /suspend user/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(defaultHandlers.onSuspend).toHaveBeenCalledWith('u1', 'Violated terms of service');
      });
    });

    it('calls onUnsuspend with user ID on confirm', async () => {
      renderWithProviders(<UserActionsMenu user={suspendedUser} {...defaultHandlers} />);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: /unsuspend user/i }));

      const confirmButton = screen.getByRole('button', { name: /unsuspend user/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(defaultHandlers.onUnsuspend).toHaveBeenCalledWith('u1');
      });
    });

    it('calls onDelete with user ID and reason on confirm', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: /delete user/i }));

      const reasonField = screen.getByLabelText(/reason/i);
      await user.type(reasonField, 'Spam account');

      const confirmButton = screen.getByRole('button', { name: /delete user/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(defaultHandlers.onDelete).toHaveBeenCalledWith('u1', 'Spam account');
      });
    });
  });

  describe('cancel actions', () => {
    it('does not call the action handler when cancel is clicked', async () => {
      renderWithProviders(<UserActionsMenu user={activeUser} {...defaultHandlers} />);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: /suspend user/i }));

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultHandlers.onSuspend).not.toHaveBeenCalled();
    });
  });
});
