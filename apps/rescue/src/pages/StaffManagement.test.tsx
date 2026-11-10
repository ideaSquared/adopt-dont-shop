import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from '@adopt-dont-shop/lib.components';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';

/**
 * Staff management: the team list, pending invitations for the rescue, and
 * result feedback for staff actions (shown as toasts).
 */

const staffMember = {
  id: 's1',
  userId: 'su2',
  rescueId: 'rescue-1',
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'sarah@rescue.org',
  title: 'Manager',
  isVerified: true,
  addedAt: '2024-01-01',
};

const { useStaffMock, getPendingInvitationsMock, removeStaffMemberMock, sendInvitationMock } =
  vi.hoisted(() => ({
    useStaffMock: vi.fn(),
    getPendingInvitationsMock: vi.fn(),
    removeStaffMemberMock: vi.fn(),
    sendInvitationMock: vi.fn(),
  }));

vi.mock('../hooks/useStaff', () => ({ useStaff: useStaffMock }));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { userId: 'su1' } }),
  useHasPermission: () => ({ allowed: true, isLoading: false }),
}));

vi.mock('../services/libraryServices', () => ({
  invitationService: {
    getPendingInvitations: getPendingInvitationsMock,
    sendInvitation: sendInvitationMock,
    cancelInvitation: vi.fn(),
  },
}));

vi.mock('../components/staff', () => ({
  InviteStaffModal: ({
    onSubmit,
  }: {
    onSubmit: (invitation: { email: string; title: string }) => Promise<void>;
  }) => (
    <button onClick={() => onSubmit({ email: 'new@rescue.org', title: 'Volunteer' })}>
      Send invitation
    </button>
  ),
  PendingInvitations: ({ invitations }: { invitations: Array<{ email: string }> }) => (
    <ul>
      {invitations.map(invitation => (
        <li key={invitation.email}>{invitation.email}</li>
      ))}
    </ul>
  ),
  StaffList: ({
    staff,
    onRemove,
  }: {
    staff: Array<typeof staffMember>;
    onRemove?: (member: typeof staffMember) => void;
  }) => (
    <ul>
      {staff.map(member => (
        <li key={member.userId}>
          {member.firstName}
          {onRemove && <button onClick={() => onRemove(member)}>Remove {member.firstName}</button>}
        </li>
      ))}
    </ul>
  ),
}));

import StaffManagement from './StaffManagement';

const staffState = (overrides: Record<string, unknown> = {}) => ({
  staff: [staffMember],
  loading: false,
  error: null,
  refetch: vi.fn(),
  addStaffMember: vi.fn(),
  removeStaffMember: removeStaffMemberMock,
  updateStaffMember: vi.fn(),
  ...overrides,
});

describe('StaffManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStaffMock.mockReturnValue(staffState());
    getPendingInvitationsMock.mockResolvedValue([]);
    removeStaffMemberMock.mockResolvedValue(undefined);
  });

  it('lists pending invitations for the staff rescue', async () => {
    getPendingInvitationsMock.mockResolvedValue([{ email: 'new@rescue.org' }]);

    renderWithProviders(<StaffManagement />);

    expect(await screen.findByText('new@rescue.org')).toBeInTheDocument();
    expect(getPendingInvitationsMock).toHaveBeenCalledWith('rescue-1');
  });

  it('removes a staff member after confirmation and reports success', async () => {
    renderWithProviders(<StaffManagement />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Sarah' }));

    await waitFor(() => expect(removeStaffMemberMock).toHaveBeenCalledWith('su2', 'rescue-1'));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Staff member removed successfully!')
    );
  });

  it('reports a failed removal as an error toast', async () => {
    removeStaffMemberMock.mockRejectedValue(new Error('not allowed'));

    renderWithProviders(<StaffManagement />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Sarah' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('not allowed'));
  });

  it('sends an invitation from the prominent Invite button and confirms with a toast', async () => {
    sendInvitationMock.mockResolvedValue(undefined);

    renderWithProviders(<StaffManagement />);
    fireEvent.click(screen.getByRole('button', { name: 'Invite Staff Member' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() =>
      expect(sendInvitationMock).toHaveBeenCalledWith('rescue-1', {
        email: 'new@rescue.org',
        title: 'Volunteer',
      })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Invitation sent to new@rescue.org!')
    );
  });

  it('no longer offers the add-existing-user or team overview extras', () => {
    renderWithProviders(<StaffManagement />);

    expect(screen.queryByRole('button', { name: /add existing user/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Team Overview')).not.toBeInTheDocument();
  });

  it('offers a retry when the staff list fails to load', () => {
    const refetch = vi.fn();
    useStaffMock.mockReturnValue(staffState({ error: 'Failed to load staff members', refetch }));

    renderWithProviders(<StaffManagement />);

    expect(screen.getByText('Failed to load staff members')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
