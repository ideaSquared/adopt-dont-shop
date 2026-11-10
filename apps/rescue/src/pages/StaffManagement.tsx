import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  ConfirmDialog,
  ErrorState,
  PageHeader,
  toast,
  useConfirm,
} from '@adopt-dont-shop/lib.components';
import {
  StaffList,
  StaffForm,
  StaffOverview,
  InviteStaffModal,
  PendingInvitations,
} from '../components/staff';
import { StaffMember, NewStaffMember } from '../types/staff';
import { useStaff } from '../hooks/useStaff';
import { useAuth, useHasPermission } from '@adopt-dont-shop/lib.auth';
import { STAFF_CREATE, STAFF_DELETE, STAFF_UPDATE } from '@adopt-dont-shop/lib.permissions';
import { InvitationPayload, type PendingInvitation } from '@adopt-dont-shop/lib.invitations';
import { invitationService } from '../services/libraryServices';
import * as styles from './StaffManagement.css';

const NO_INVITATIONS: PendingInvitation[] = [];

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  // ADS-757: gate controls on permissions having loaded so they don't flash
  // hidden during the initial fetch.
  const { allowed: hasDeleteStaff, isLoading: deletePermLoading } = useHasPermission(STAFF_DELETE);
  const { allowed: hasEditStaff, isLoading: editPermLoading } = useHasPermission(STAFF_UPDATE);
  const { allowed: hasAddStaff, isLoading: addPermLoading } = useHasPermission(STAFF_CREATE);
  const canDeleteStaff = hasDeleteStaff && !deletePermLoading;
  const canEditStaff = hasEditStaff && !editPermLoading;
  const canAddStaff = hasAddStaff && !addPermLoading;
  const { staff, loading, error, refetch, addStaffMember, removeStaffMember, updateStaffMember } =
    useStaff();

  // State for modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  // ADS-586: confirm dialog for destructive staff/invitation actions.
  const { confirm, confirmProps } = useConfirm();

  // Get rescue ID from the current user's staff record
  const getRescueId = (): string => {
    if (staff.length > 0) {
      return staff[0].rescueId;
    }

    const currentUserStaff = staff.find(s => s.userId === user?.userId);
    if (currentUserStaff) {
      return currentUserStaff.rescueId;
    }

    throw new Error('Unable to determine rescue ID. Please refresh the page.');
  };

  // Pending invitations load once the rescue is known (it comes from the staff list).
  const queryClient = useQueryClient();
  const invitationsRescueId = staff[0]?.rescueId;
  const invitationsQuery = useQuery({
    queryKey: ['staff', 'invitations', invitationsRescueId],
    queryFn: async (): Promise<PendingInvitation[]> => {
      try {
        return await invitationService.getPendingInvitations(invitationsRescueId ?? '');
      } catch (err) {
        console.error('Failed to load pending invitations:', err);
        return [];
      }
    },
    enabled: invitationsRescueId !== undefined,
  });
  const pendingInvitations = invitationsQuery.data ?? NO_INVITATIONS;
  const invitationsLoading = invitationsQuery.isFetching;
  const reloadInvitations = () =>
    queryClient.invalidateQueries({ queryKey: ['staff', 'invitations'] });

  const sendInvitationMutation = useMutation({
    mutationFn: ({ rescueId, invitation }: { rescueId: string; invitation: InvitationPayload }) =>
      invitationService.sendInvitation(rescueId, invitation),
    onSuccess: reloadInvitations,
    onError: () => undefined,
  });
  const cancelInvitationMutation = useMutation({
    mutationFn: ({ rescueId, invitationId }: { rescueId: string; invitationId: number }) =>
      invitationService.cancelInvitation(rescueId, invitationId),
    onSuccess: reloadInvitations,
    onError: () => undefined,
  });

  const handleSendInvitation = async (invitation: InvitationPayload) => {
    setActionLoading(true);

    try {
      const rescueId = getRescueId();
      await sendInvitationMutation.mutateAsync({ rescueId, invitation });

      toast.success(`Invitation sent to ${invitation.email}!`);
      setShowInviteModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    const confirmed = await confirm({
      title: 'Cancel invitation?',
      message: 'Are you sure you want to cancel this invitation?',
      confirmText: 'Cancel invitation',
      cancelText: 'Keep invitation',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    try {
      const rescueId = getRescueId();
      await cancelInvitationMutation.mutateAsync({ rescueId, invitationId });

      toast.success('Invitation cancelled successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel invitation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddStaff = async (staffData: NewStaffMember) => {
    setActionLoading(true);

    try {
      const rescueId = getRescueId();
      await addStaffMember(staffData, rescueId);
      setShowAddForm(false);
      toast.success('Staff member added successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add staff member');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditStaff = (staffMember: StaffMember) => {
    if (staffMember.userId === user?.userId) {
      toast.error(
        'You cannot edit your own profile. Please ask another admin to make changes to your account.'
      );
      return;
    }

    setEditingStaff(staffMember);
  };

  const handleUpdateStaff = async (staffData: NewStaffMember) => {
    if (!editingStaff) {
      return;
    }

    setActionLoading(true);

    try {
      const rescueId = getRescueId();
      await updateStaffMember(editingStaff.userId, { title: staffData.title }, rescueId);
      setEditingStaff(null);
      toast.success('Staff member updated successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update staff member');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveStaff = async (staffMember: StaffMember) => {
    if (staffMember.userId === user?.userId) {
      toast.error(
        'You cannot remove yourself from the rescue. Please ask another admin to remove you.'
      );
      return;
    }

    const confirmed = await confirm({
      title: 'Remove staff member?',
      message: `Are you sure you want to remove ${staffMember.firstName} ${staffMember.lastName} from your staff?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    try {
      const rescueId = getRescueId();
      await removeStaffMember(staffMember.userId, rescueId);
      toast.success('Staff member removed successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove staff member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setShowInviteModal(false);
    setEditingStaff(null);
  };

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <PageHeader title="Staff & Volunteer Management" />
        <ErrorState title="Unable to Load Staff" message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <PageHeader
        title="Staff & Volunteer Management"
        description="Manage your rescue team, send invitations, and coordinate activities."
        actions={
          canAddStaff ? (
            <div className={styles.headerActions}>
              <Button
                variant="primary"
                onClick={() => setShowInviteModal(true)}
                disabled={actionLoading}
              >
                Invite Staff Member
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddForm(true)}
                disabled={actionLoading}
              >
                Add Existing User
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className={styles.pageContent}>
        <div className={styles.section}>
          <h2>Team Overview</h2>
          <StaffOverview staff={staff} loading={loading} />
        </div>

        {pendingInvitations.length > 0 && (
          <div className={styles.section}>
            <h2>Pending Invitations</h2>
            <PendingInvitations
              invitations={pendingInvitations}
              loading={invitationsLoading}
              onCancel={canDeleteStaff ? handleCancelInvitation : undefined}
              canCancel={canDeleteStaff}
            />
          </div>
        )}

        <div className={styles.section}>
          <h2>Staff Directory</h2>
          <StaffList
            staff={staff}
            loading={loading}
            onEdit={canEditStaff ? handleEditStaff : undefined}
            onRemove={canDeleteStaff ? handleRemoveStaff : undefined}
            canEdit={canEditStaff}
            canRemove={canDeleteStaff}
            showSearch={true}
            currentUserId={user?.userId}
          />
        </div>
      </div>

      {showInviteModal && (
        <InviteStaffModal
          onSubmit={handleSendInvitation}
          onCancel={handleCloseForm}
          loading={actionLoading}
        />
      )}

      {showAddForm && (
        <StaffForm onSubmit={handleAddStaff} onCancel={handleCloseForm} loading={actionLoading} />
      )}

      {editingStaff && (
        <StaffForm
          initialStaff={editingStaff}
          onSubmit={handleUpdateStaff}
          onCancel={handleCloseForm}
          isEditing={true}
          loading={actionLoading}
        />
      )}

      <ConfirmDialog {...confirmProps} />
    </div>
  );
};

export default StaffManagement;
