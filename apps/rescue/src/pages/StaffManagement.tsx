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
import { StaffList, InviteStaffModal, PendingInvitations } from '../components/staff';
import { StaffMember } from '../types/staff';
import { useStaff } from '../hooks/useStaff';
import { useAuth, useHasPermission } from '@adopt-dont-shop/lib.auth';
import { STAFF_CREATE, STAFF_DELETE } from '@adopt-dont-shop/lib.permissions';
import { InvitationPayload, type PendingInvitation } from '@adopt-dont-shop/lib.invitations';
import { invitationService } from '../services/libraryServices';
import * as styles from './StaffManagement.css';

const NO_INVITATIONS: PendingInvitation[] = [];

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  // ADS-757: gate controls on permissions having loaded so they don't flash
  // hidden during the initial fetch.
  const { allowed: hasDeleteStaff, isLoading: deletePermLoading } = useHasPermission(STAFF_DELETE);
  const { allowed: hasAddStaff, isLoading: addPermLoading } = useHasPermission(STAFF_CREATE);
  const canDeleteStaff = hasDeleteStaff && !deletePermLoading;
  const canAddStaff = hasAddStaff && !addPermLoading;
  const { staff, loading, error, refetch, removeStaffMember } = useStaff();

  // State for modals
  const [showInviteModal, setShowInviteModal] = useState(false);

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
    setShowInviteModal(false);
  };

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <PageHeader title="Staff" />
        <ErrorState title="Unable to Load Staff" message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <PageHeader
        title="Staff"
        description="Invite people to help at your rescue, or remove people who no longer need access."
        actions={
          canAddStaff ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowInviteModal(true)}
              disabled={actionLoading}
            >
              Invite Staff Member
            </Button>
          ) : undefined
        }
      />

      <div className={styles.pageContent}>
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
          <h2>Your team</h2>
          <StaffList
            staff={staff}
            loading={loading}
            onRemove={canDeleteStaff ? handleRemoveStaff : undefined}
            canRemove={canDeleteStaff}
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

      <ConfirmDialog {...confirmProps} />
    </div>
  );
};

export default StaffManagement;
