import React, { useState, useEffect } from 'react';
import {
  StaffList,
  StaffForm,
  StaffOverview,
  InviteStaffModal,
  PendingInvitations,
} from '../components/staff';
import { StaffMember, NewStaffMember } from '../types/staff';
import { useStaff } from '../hooks/useStaff';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { usePermissions } from '../contexts/PermissionsContext';
import { STAFF_CREATE, STAFF_DELETE, STAFF_UPDATE } from '@adopt-dont-shop/lib.permissions';
import { InvitationPayload, PendingInvitation } from '@adopt-dont-shop/lib.invitations';
import { invitationService } from '../services/libraryServices';
import * as styles from './StaffManagement.css';

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { staff, loading, error, refetch, addStaffMember, removeStaffMember, updateStaffMember } =
    useStaff();

  // State for modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // State for invitations
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  // State for actions
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Check permissions using the permissions service
  const canDeleteStaff = hasPermission(STAFF_DELETE);
  const canEditStaff = hasPermission(STAFF_UPDATE);
  const canAddStaff = hasPermission(STAFF_CREATE);

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

  // Load pending invitations
  useEffect(() => {
    const loadPendingInvitations = async () => {
      if (staff.length === 0) {
        return;
      }

      try {
        setInvitationsLoading(true);
        const rescueId = getRescueId();
        const invites = await invitationService.getPendingInvitations(rescueId);
        setPendingInvitations(invites);
      } catch (err) {
        console.error('Failed to load pending invitations:', err);
      } finally {
        setInvitationsLoading(false);
      }
    };

    loadPendingInvitations();
  }, [staff]);

  const handleSendInvitation = async (invitation: InvitationPayload) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const rescueId = getRescueId();
      await invitationService.sendInvitation(rescueId, invitation);

      setActionSuccess(`Invitation sent to ${invitation.email}!`);
      setShowInviteModal(false);

      // Reload pending invitations
      const invites = await invitationService.getPendingInvitations(rescueId);
      setPendingInvitations(invites);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to send invitation');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const rescueId = getRescueId();
      await invitationService.cancelInvitation(rescueId, invitationId);

      setActionSuccess('Invitation cancelled successfully');

      // Reload pending invitations
      const invites = await invitationService.getPendingInvitations(rescueId);
      setPendingInvitations(invites);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to cancel invitation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddStaff = async (staffData: NewStaffMember) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const rescueId = getRescueId();
      await addStaffMember(staffData, rescueId);
      setShowAddForm(false);
      setActionSuccess('Staff member added successfully!');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to add staff member');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditStaff = (staffMember: StaffMember) => {
    if (staffMember.userId === user?.userId) {
      setActionError(
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
    setActionError(null);
    setActionSuccess(null);

    try {
      const rescueId = getRescueId();
      await updateStaffMember(editingStaff.userId, { title: staffData.title }, rescueId);
      setEditingStaff(null);
      setActionSuccess('Staff member updated successfully!');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update staff member');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveStaff = async (staffMember: StaffMember) => {
    if (staffMember.userId === user?.userId) {
      setActionError(
        'You cannot remove yourself from the rescue. Please ask another admin to remove you.'
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to remove ${staffMember.firstName} ${staffMember.lastName} from your staff?`
      )
    ) {
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const rescueId = getRescueId();
      await removeStaffMember(staffMember.userId, rescueId);
      setActionSuccess('Staff member removed successfully!');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to remove staff member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setShowInviteModal(false);
    setEditingStaff(null);
    setActionError(null);
  };

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <h1>Staff & Volunteer Management</h1>
          </div>
        </div>

        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3 className={styles.errorTitle}>Unable to Load Staff</h3>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryButton} onClick={refetch}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <h1>Staff & Volunteer Management</h1>
          <p>Manage your rescue team, send invitations, and coordinate activities.</p>
        </div>

        {canAddStaff && (
          <div className={styles.headerActions}>
            <button
              className={styles.actionButtonPrimary}
              onClick={() => setShowInviteModal(true)}
              disabled={actionLoading}
            >
              Invite Staff Member
            </button>
            <button
              className={styles.actionButtonSecondary}
              onClick={() => setShowAddForm(true)}
              disabled={actionLoading}
            >
              Add Existing User
            </button>
          </div>
        )}
      </div>

      {actionError && (
        <div className={styles.alertError}>
          <span>
            <strong>Error:</strong> {actionError}
          </span>
          <button className={styles.alertClose} onClick={() => setActionError(null)}>
            ✕
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className={styles.alertSuccess}>
          <span>
            <strong>Success:</strong> {actionSuccess}
          </span>
          <button className={styles.alertClose} onClick={() => setActionSuccess(null)}>
            ✕
          </button>
        </div>
      )}

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
    </div>
  );
};

export default StaffManagement;
