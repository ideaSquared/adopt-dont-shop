import React, { useState, useEffect } from 'react';
import * as styles from '../RescueDetailModal.css';
import { Button, DateTime, ConfirmDialog, useConfirm } from '@adopt-dont-shop/lib.components';
import { Skeleton, SkeletonText } from '../../ui/Skeleton';
import { FiUserPlus, FiUserMinus, FiCheck, FiClock, FiX } from 'react-icons/fi';
import type { StaffMember, StaffInvitation, InviteStaffPayload } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';

type StaffTabProps = {
  rescueId: string;
};

export const StaffTab: React.FC<StaffTabProps> = ({ rescueId }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');
  const { confirm, confirmProps } = useConfirm();

  const fetchStaff = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingStaff(true);
      setStaffError(null);

      const [staffData, invitationsData] = await Promise.all([
        rescueService.getStaff(rescueId, 1, 100),
        rescueService.getInvitations(rescueId),
      ]);

      setStaff(staffData.data);
      setInvitations(invitationsData);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to load staff');
    } finally {
      if (showLoading) setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [rescueId]);

  const handleInviteStaff = async () => {
    if (!inviteEmail.trim()) {
      setStaffError('Please enter an email address');
      return;
    }

    try {
      setLoadingStaff(true);
      setStaffError(null);

      const payload: InviteStaffPayload = {
        email: inviteEmail.trim(),
        title: inviteTitle.trim() || undefined,
      };

      await rescueService.inviteStaff(rescueId, payload);
      setInviteEmail('');
      setInviteTitle('');
      setShowInviteForm(false);
      await fetchStaff(false);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoadingStaff(false);
    }
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
    if (!confirmed) return;

    try {
      setLoadingStaff(true);
      setStaffError(null);
      await rescueService.removeStaff(rescueId, userId);
      await fetchStaff(false);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to remove staff member');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      setLoadingStaff(true);
      setStaffError(null);
      await rescueService.cancelInvitation(rescueId, invitationId);
      await fetchStaff(false);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    } finally {
      setLoadingStaff(false);
    }
  };

  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Staff Members ({staff?.length || 0})</span>
            <Button variant='primary' size='sm' onClick={() => setShowInviteForm(!showInviteForm)}>
              <FiUserPlus style={{ marginRight: '0.5rem' }} />
              Invite Staff
            </Button>
          </div>
        </h3>

        {staffError && <div className={styles.errorMessage}>{staffError}</div>}

        {showInviteForm && (
          <div className={styles.inviteForm}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem', color: '#111827' }}>
              Invite New Staff Member
            </h4>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor='invite-email'>
                  Email Address *
                </label>
                <input
                  className={styles.input}
                  id='invite-email'
                  type='email'
                  placeholder='staffmember@example.com'
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  disabled={loadingStaff}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor='invite-title'>
                  Job Title (Optional)
                </label>
                <input
                  className={styles.input}
                  id='invite-title'
                  type='text'
                  placeholder='e.g., Veterinarian, Coordinator'
                  value={inviteTitle}
                  onChange={e => setInviteTitle(e.target.value)}
                  disabled={loadingStaff}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail('');
                  setInviteTitle('');
                  setStaffError(null);
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
          <div
            aria-label='Loading staff'
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}
          >
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Skeleton width='2.5rem' height='2.5rem' radius='50%' />
                <div style={{ flex: 1 }}>
                  <Skeleton height='0.875rem' width='40%' style={{ marginBottom: '0.25rem' }} />
                  <Skeleton height='0.75rem' width='60%' />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingStaff && (staff?.length || 0) === 0 && (invitations?.length || 0) === 0 && (
          <div className={styles.infoValue}>
            No staff members yet. Invite your first team member!
          </div>
        )}

        {!loadingStaff && (staff?.length || 0) > 0 && (
          <div className={styles.staffList}>
            {staff?.map(member => (
              <div className={styles.staffCard} key={member.staffMemberId}>
                <div className={styles.staffInfo}>
                  <div className={styles.staffName}>
                    {member.firstName} {member.lastName}
                    {member.isVerified && (
                      <FiCheck
                        style={{ display: 'inline-block', marginLeft: '0.5rem', color: '#10b981' }}
                        size={16}
                      />
                    )}
                  </div>
                  <div className={styles.staffEmail}>{member.email}</div>
                  <div className={styles.staffMeta}>
                    {member.title && <span>{member.title} •</span>}
                    <span>Added {<DateTime timestamp={member.addedAt} />}</span>
                  </div>
                </div>
                <div className={styles.staffActions}>
                  <button
                    className={styles.iconButton}
                    title='Remove staff member'
                    onClick={() => handleRemoveStaff(member.userId)}
                    disabled={loadingStaff}
                  >
                    <FiUserMinus color='#ef4444' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(invitations?.length || 0) > 0 && (
        <div className={styles.invitationsList}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Pending Invitations ({invitations?.length || 0})
            </h3>
            {invitations?.map(invitation => (
              <div className={styles.invitationCard} key={invitation.invitationId}>
                <div className={styles.staffInfo}>
                  <div className={styles.staffName}>{invitation.email}</div>
                  <div className={styles.staffMeta}>
                    {invitation.title && <span>{invitation.title} •</span>}
                    <span>Invited {<DateTime timestamp={invitation.createdAt} />}</span>
                    <span>• Expires {<DateTime timestamp={invitation.expiresAt} />}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    className={
                      invitation.status === 'pending'
                        ? styles.invitationBadgePending
                        : styles.invitationBadgeDefault
                    }
                  >
                    <FiClock size={12} />
                    {invitation.status}
                  </span>
                  <button
                    className={styles.iconButton}
                    title='Cancel invitation'
                    onClick={() => handleCancelInvitation(invitation.invitationId)}
                    disabled={loadingStaff}
                  >
                    <FiX color='#ef4444' />
                  </button>
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
