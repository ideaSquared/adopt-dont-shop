import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { StaffList, StaffForm, StaffOverview, InviteStaffModal, PendingInvitations } from '../components/staff';
import { StaffMember, NewStaffMember } from '../types/staff';
import { useStaff } from '../hooks/useStaff';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import { usePermissions } from '../contexts/PermissionsContext';
import { STAFF_CREATE, STAFF_DELETE, STAFF_UPDATE } from '@adopt-dont-shop/lib-permissions';
import { InvitationPayload, PendingInvitation } from '@adopt-dont-shop/lib-invitations';
import { invitationService } from '../services/libraryServices';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderContent = styled.div`
  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    color: #333;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 1.1rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: ${props => props.variant === 'secondary' ? '#6c757d' : '#1976d2'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.variant === 'secondary' ? '#5a6268' : '#1565c0'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Alert = styled.div<{ type?: 'error' | 'success' }>`
  background: ${props => props.type === 'success' ? '#d4edda' : '#f8d7da'};
  color: ${props => props.type === 'success' ? '#155724' : '#721c24'};
  border: 1px solid ${props => props.type === 'success' ? '#c3e6cb' : '#f5c6cb'};
  border-radius: 8px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const AlertClose = styled.button`
  background: none;
  border: none;
  color: inherit;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
`;

const PageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Section = styled.div`
  h2 {
    margin: 0 0 1rem 0;
    color: #333;
    font-weight: 600;
    font-size: 1.5rem;
  }
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ErrorIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const ErrorTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #333;
  font-weight: 600;
`;

const ErrorText = styled.p`
  margin: 0 0 2rem 0;
  color: #666;
`;

const RetryButton = styled.button`
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: #1565c0;
  }
`;

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { staff, loading, error, refetch, addStaffMember, removeStaffMember, updateStaffMember } = useStaff();

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
      if (staff.length === 0) return;

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
      const result = await invitationService.sendInvitation(rescueId, invitation);

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
      setActionError('You cannot edit your own profile. Please ask another admin to make changes to your account.');
      return;
    }

    setEditingStaff(staffMember);
  };

  const handleUpdateStaff = async (staffData: NewStaffMember) => {
    if (!editingStaff) return;

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
      setActionError('You cannot remove yourself from the rescue. Please ask another admin to remove you.');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${staffMember.firstName} ${staffMember.lastName} from your staff?`)) {
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
      <PageContainer>
        <PageHeader>
          <HeaderContent>
            <h1>Staff & Volunteer Management</h1>
          </HeaderContent>
        </PageHeader>

        <ErrorState>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>Unable to Load Staff</ErrorTitle>
          <ErrorText>{error}</ErrorText>
          <RetryButton onClick={refetch}>
            Try Again
          </RetryButton>
        </ErrorState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <HeaderContent>
          <h1>Staff & Volunteer Management</h1>
          <p>Manage your rescue team, send invitations, and coordinate activities.</p>
        </HeaderContent>

        {canAddStaff && (
          <HeaderActions>
            <ActionButton
              variant="primary"
              onClick={() => setShowInviteModal(true)}
              disabled={actionLoading}
            >
              Invite Staff Member
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={() => setShowAddForm(true)}
              disabled={actionLoading}
            >
              Add Existing User
            </ActionButton>
          </HeaderActions>
        )}
      </PageHeader>

      {actionError && (
        <Alert type="error">
          <span><strong>Error:</strong> {actionError}</span>
          <AlertClose onClick={() => setActionError(null)}>
            ✕
          </AlertClose>
        </Alert>
      )}

      {actionSuccess && (
        <Alert type="success">
          <span><strong>Success:</strong> {actionSuccess}</span>
          <AlertClose onClick={() => setActionSuccess(null)}>
            ✕
          </AlertClose>
        </Alert>
      )}

      <PageContent>
        <Section>
          <h2>Team Overview</h2>
          <StaffOverview staff={staff} loading={loading} />
        </Section>

        {pendingInvitations.length > 0 && (
          <Section>
            <h2>Pending Invitations</h2>
            <PendingInvitations
              invitations={pendingInvitations}
              loading={invitationsLoading}
              onCancel={canDeleteStaff ? handleCancelInvitation : undefined}
              canCancel={canDeleteStaff}
            />
          </Section>
        )}

        <Section>
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
        </Section>
      </PageContent>

      {showInviteModal && (
        <InviteStaffModal
          onSubmit={handleSendInvitation}
          onCancel={handleCloseForm}
          loading={actionLoading}
        />
      )}

      {showAddForm && (
        <StaffForm
          onSubmit={handleAddStaff}
          onCancel={handleCloseForm}
          loading={actionLoading}
        />
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
    </PageContainer>
  );
};

export default StaffManagement;
