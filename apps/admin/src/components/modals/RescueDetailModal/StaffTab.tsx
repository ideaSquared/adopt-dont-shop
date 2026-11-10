import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as styles from '../RescueDetailModal.css';
import {
  Badge,
  Button,
  DateTime,
  ConfirmDialog,
  ErrorState,
  FormField,
  Input,
  useConfirm,
  Skeleton,
} from '@adopt-dont-shop/lib.components';
import { Check, Clock, UserMinus, UserPlus, X } from 'lucide-react';
import type { InviteStaffPayload } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';

type StaffTabProps = {
  rescueId: string;
};

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

export const StaffTab: React.FC<StaffTabProps> = ({ rescueId }) => {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');
  const { confirm, confirmProps } = useConfirm();

  const staffKey = ['rescues', 'staff', rescueId];

  const {
    data,
    isLoading: loadingList,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: staffKey,
    queryFn: async () => {
      const [staffData, invitationsData] = await Promise.all([
        rescueService.getStaff(rescueId, 1, 100),
        rescueService.getInvitations(rescueId),
      ]);
      return { staff: staffData.data, invitations: invitationsData };
    },
  });
  const staff = data?.staff ?? [];
  const invitations = data?.invitations ?? [];

  const refreshStaff = () => queryClient.invalidateQueries({ queryKey: staffKey });

  const inviteMutation = useMutation({
    mutationFn: (payload: InviteStaffPayload) => rescueService.inviteStaff(rescueId, payload),
    onSuccess: async () => {
      setInviteEmail('');
      setInviteTitle('');
      setShowInviteForm(false);
      await refreshStaff();
    },
    onError: err => setActionError(errorMessage(err, 'Failed to send invitation')),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => rescueService.removeStaff(rescueId, userId),
    onSuccess: refreshStaff,
    onError: err => setActionError(errorMessage(err, 'Failed to remove staff member')),
  });

  const cancelMutation = useMutation({
    mutationFn: (invitationId: number) => rescueService.cancelInvitation(rescueId, invitationId),
    onSuccess: refreshStaff,
    onError: err => setActionError(errorMessage(err, 'Failed to cancel invitation')),
  });

  const loadingStaff =
    loadingList || inviteMutation.isPending || removeMutation.isPending || cancelMutation.isPending;
  const staffError =
    actionError ?? (loadError ? errorMessage(loadError, 'Failed to load staff') : null);

  const handleInviteStaff = () => {
    if (!inviteEmail.trim()) {
      setActionError('Please enter an email address');
      return;
    }

    setActionError(null);
    inviteMutation.mutate({
      email: inviteEmail.trim(),
      title: inviteTitle.trim() || undefined,
    });
  };

  const handleRemoveStaff = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Remove staff member?',
      message:
        'Are you sure you want to remove this staff member? They will lose access to this rescue immediately.',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setActionError(null);
    removeMutation.mutate(userId);
  };

  const handleCancelInvitation = (invitationId: number) => {
    setActionError(null);
    cancelMutation.mutate(invitationId);
  };

  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <div className={styles.staffSectionHeader}>
            <span>Staff Members ({staff.length})</span>
            <Button variant='primary' size='sm' onClick={() => setShowInviteForm(!showInviteForm)}>
              <UserPlus size='1em' className={styles.userPlusIcon} />
              Invite Staff
            </Button>
          </div>
        </h3>

        {staffError && (
          <ErrorState message={staffError} onRetry={loadError ? () => void refetch() : undefined} />
        )}

        {showInviteForm && (
          <div className={styles.inviteForm}>
            <h4 className={styles.staffSectionSubtitle}>Invite New Staff Member</h4>
            <div className={styles.formRow}>
              <FormField label='Email Address' htmlFor='invite-email' required>
                <Input
                  id='invite-email'
                  type='email'
                  placeholder='staffmember@example.com'
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  disabled={loadingStaff}
                />
              </FormField>
              <FormField label='Job Title (Optional)' htmlFor='invite-title'>
                <Input
                  id='invite-title'
                  type='text'
                  placeholder='e.g., Veterinarian, Coordinator'
                  value={inviteTitle}
                  onChange={e => setInviteTitle(e.target.value)}
                  disabled={loadingStaff}
                />
              </FormField>
            </div>
            <div className={styles.formActions}>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail('');
                  setInviteTitle('');
                  setActionError(null);
                }}
                disabled={loadingStaff}
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                size='sm'
                onClick={handleInviteStaff}
                disabled={loadingStaff || !inviteEmail.trim()}
              >
                Send Invitation
              </Button>
            </div>
          </div>
        )}

        {loadingStaff && (
          <div aria-label='Loading staff' className={styles.skeletonStaffList}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={styles.skeletonStaffRow}>
                <Skeleton width='2.5rem' height='2.5rem' radius='50%' />
                <div className={styles.skeletonStaffText}>
                  <Skeleton height='0.875rem' width='40%' className={styles.skeletonStaffName} />
                  <Skeleton height='0.75rem' width='60%' />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingStaff && staff.length === 0 && invitations.length === 0 && (
          <div className={styles.infoValue}>
            No staff members yet. Invite your first team member!
          </div>
        )}

        {!loadingStaff && staff.length > 0 && (
          <div className={styles.staffList}>
            {staff.map(member => (
              <div className={styles.staffCard} key={member.staffMemberId}>
                <div className={styles.staffInfo}>
                  <div className={styles.staffName}>
                    {member.firstName} {member.lastName}
                    {member.isVerified && <Check className={styles.acceptedBadge} size={16} />}
                  </div>
                  <div className={styles.staffEmail}>{member.email}</div>
                  <div className={styles.staffMeta}>
                    {member.title && <span>{member.title} •</span>}
                    <span>Added {<DateTime timestamp={member.addedAt} />}</span>
                  </div>
                </div>
                <div className={styles.staffActions}>
                  <Button
                    variant='ghost'
                    size='sm'
                    title='Remove staff member'
                    aria-label='Remove staff member'
                    onClick={() => handleRemoveStaff(member.userId)}
                    disabled={loadingStaff}
                  >
                    <UserMinus size='1em' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {invitations.length > 0 && (
        <div className={styles.invitationsList}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Pending Invitations ({invitations.length})</h3>
            {invitations.map(invitation => (
              <div className={styles.invitationCard} key={invitation.invitationId}>
                <div className={styles.staffInfo}>
                  <div className={styles.staffName}>{invitation.email}</div>
                  <div className={styles.staffMeta}>
                    {invitation.title && <span>{invitation.title} •</span>}
                    <span>Invited {<DateTime timestamp={invitation.createdAt} />}</span>
                    <span>• Expires {<DateTime timestamp={invitation.expiresAt} />}</span>
                  </div>
                </div>
                <div className={styles.staffRowFlex}>
                  <Badge variant={invitation.status === 'pending' ? 'warning' : 'neutral'}>
                    <Clock size='1em' />
                    {invitation.status}
                  </Badge>
                  <Button
                    variant='ghost'
                    size='sm'
                    title='Cancel invitation'
                    aria-label='Cancel invitation'
                    onClick={() => handleCancelInvitation(invitation.invitationId)}
                    disabled={loadingStaff}
                  >
                    <X size='1em' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmProps} />
    </>
  );
};
