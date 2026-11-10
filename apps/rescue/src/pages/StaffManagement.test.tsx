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

const {
  useStaffMock,
  getPendingInvitationsMock,
  removeStaffMemberMock,
  sendInvitationMock,
  addStaffMemberMock,
  updateStaffMemberMock,
} = vi.hoisted(() => ({
  useStaffMock: vi.fn(),
  getPendingInvitationsMock: vi.fn(),
  removeStaffMemberMock: vi.fn(),
  sendInvitationMock: vi.fn(),
  addStaffMemberMock: vi.fn(),
  updateStaffMemberMock: vi.fn(),
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
    onEdit,
  }: {
    staff: Array<typeof staffMember>;
    onRemove?: (member: typeof staffMember) => void;
    onEdit?: (member: typeof staffMember) => void;
  }) => (
    <ul>
      {staff.map(member => (
        <li key={member.userId}>
          {member.firstName}
          {onEdit && <button onClick={() => onEdit(member)}>Edit {member.firstName}</button>}
          {onRemove && <button onClick={() => onRemove(member)}>Remove {member.firstName}</button>}
        </li>
      ))}
    </ul>
  ),
  StaffForm: ({
    isEditing,
    onSubmit,
  }: {
    isEditing?: boolean;
    onSubmit: (data: { userId: string; title: string }) => Promise<void>;
  }) => (
    <button
      onClick={() =>
        onSubmit(
          isEditing ? { userId: 'su2', title: 'Head Volunteer' } : { userId: 'su9', title: 'Vet' }
        )
      }
    >
      {isEditing ? 'Save title' : 'Save new staff member'}
    </button>
  ),
}));

import StaffManagement from './StaffManagement';

const staffState = (overrides: Record<string, unknown> = {}) => ({
  staff: [staffMember],
  loading: false,
  error: null,
  refetch: vi.fn(),
  addStaffMember: addStaffMemberMock,
  removeStaffMember: removeStaffMemberMock,
  updateStaffMember: updateStaffMemberMock,
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

  it('adds an existing user to the rescue and confirms with a toast', async () => {
    addStaffMemberMock.mockResolvedValue(undefined);
    renderWithProviders(<StaffManagement />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Existing User' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save new staff member' }));

    await waitFor(() =>
      expect(addStaffMemberMock).toHaveBeenCalledWith({ userId: 'su9', title: 'Vet' }, 'rescue-1')
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Staff member added successfully!')
    );
  });

  it("updates a staff member's title and confirms with a toast", async () => {
    updateStaffMemberMock.mockResolvedValue(undefined);
    renderWithProviders(<StaffManagement />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Sarah' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save title' }));

    await waitFor(() =>
      expect(updateStaffMemberMock).toHaveBeenCalledWith(
        'su2',
        { title: 'Head Volunteer' },
        'rescue-1'
      )
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Staff member updated successfully!')
    );
  });

  it('does not bring back the team overview', () => {
    renderWithProviders(<StaffManagement />);

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
