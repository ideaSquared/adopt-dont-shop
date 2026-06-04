import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { UserDetailPanel } from './UserDetailPanel';
import type { AdminUser } from '@/types';

// The global Modal mock renders children unconditionally; override so we can
// assert the confirmation modal opens only after the action button is clicked.
vi.mock('@adopt-dont-shop/lib.components', async () => {
  const original = await vi.importActual<typeof import('@adopt-dont-shop/lib.components')>(
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

vi.mock('../../hooks', async () => {
  const actual = await vi.importActual<typeof import('../../hooks')>('../../hooks');
  return {
    ...actual,
    useEntityActivity: () => ({ data: [], isLoading: false, error: null }),
  };
});

const baseUser: AdminUser = {
  userId: 'u1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  userType: 'adopter',
  status: 'active',
  emailVerified: true,
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

const makeHandlers = () => ({
  onClose: vi.fn(),
  onSave: vi.fn().mockResolvedValue(undefined),
  onSuspend: vi.fn().mockResolvedValue(undefined),
  onUnsuspend: vi.fn().mockResolvedValue(undefined),
  onVerify: vi.fn().mockResolvedValue(undefined),
  onDelete: vi.fn().mockResolvedValue(undefined),
  onResetPassword: vi.fn().mockResolvedValue(undefined),
  onMessage: vi.fn(),
});

describe('UserDetailPanel destructive-action confirmation (ADS-690)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const goToActions = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('tab', { name: /actions/i }));
  };

  it('does not call onDelete on the first click — it opens a confirmation dialog', async () => {
    const handlers = makeHandlers();
    const user = userEvent.setup();
    renderWithProviders(<UserDetailPanel user={baseUser} {...handlers} />);

    await goToActions(user);
    await user.click(screen.getByRole('button', { name: /delete user/i }));

    expect(handlers.onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/are you sure you want to delete this user/i)).toBeInTheDocument();
  });

  it('calls onDelete with the typed reason after confirmation', async () => {
    const handlers = makeHandlers();
    const user = userEvent.setup();
    renderWithProviders(<UserDetailPanel user={baseUser} {...handlers} />);

    await goToActions(user);
    await user.click(screen.getByRole('button', { name: /delete user/i }));

    const reasonField = await screen.findByLabelText(/reason/i);
    await user.type(reasonField, 'spam account');
    // Two "Delete User" buttons exist (trigger + modal confirm). Click the last one (the confirm button inside the modal).
    const confirmButtons = screen.getAllByRole('button', { name: /^delete user$/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(handlers.onDelete).toHaveBeenCalledWith('u1', 'spam account');
    });
  });

  it('does not call onSuspend on the first click — it opens a confirmation dialog with reason', async () => {
    const handlers = makeHandlers();
    const user = userEvent.setup();
    renderWithProviders(<UserDetailPanel user={baseUser} {...handlers} />);

    await goToActions(user);
    await user.click(screen.getByRole('button', { name: /suspend user/i }));

    expect(handlers.onSuspend).not.toHaveBeenCalled();
    expect(screen.getByText(/are you sure you want to suspend this user/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
  });

  it('forwards the suspend reason to onSuspend after confirmation', async () => {
    const handlers = makeHandlers();
    const user = userEvent.setup();
    renderWithProviders(<UserDetailPanel user={baseUser} {...handlers} />);

    await goToActions(user);
    await user.click(screen.getByRole('button', { name: /suspend user/i }));

    const reasonField = await screen.findByLabelText(/reason/i);
    await user.type(reasonField, 'abusive behaviour');
    const confirmButtons = screen.getAllByRole('button', { name: /^suspend user$/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(handlers.onSuspend).toHaveBeenCalledWith('u1', 'abusive behaviour');
    });
  });
});
