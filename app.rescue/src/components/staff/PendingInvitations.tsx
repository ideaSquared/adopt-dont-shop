import React from 'react';
import { PendingInvitation } from '@adopt-dont-shop/lib.invitations';
import * as styles from './PendingInvitations.css';

interface PendingInvitationsProps {
  invitations: PendingInvitation[];
  loading?: boolean;
  onCancel?: (invitationId: number) => void;
  canCancel?: boolean;
}

const PendingInvitations: React.FC<PendingInvitationsProps> = ({
  invitations,
  loading = false,
  onCancel,
  canCancel = false,
}) => {
  const getExpirationStatus = (
    expirationDate: string
  ): {
    isExpiring: boolean;
    daysRemaining: number;
  } => {
    const expiration = new Date(expirationDate);
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isExpiring: daysRemaining <= 2 && daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
    };
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3>Pending Invitations</h3>
          <p>Loading invitations...</p>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Pending Invitations</h3>
        <p>
          {invitations.length === 0
            ? 'No pending invitations'
            : `${invitations.length} pending invitation${invitations.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {invitations.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📧</div>
          <div className={styles.emptyText}>
            <p>
              <strong>No Pending Invitations</strong>
            </p>
            <p>Invite staff members to join your rescue team!</p>
          </div>
        </div>
      ) : (
        <div className={styles.invitationsList}>
          {invitations.map(invitation => {
            const { isExpiring, daysRemaining } = getExpirationStatus(invitation.expiration);

            return (
              <div key={invitation.invitation_id} className={styles.invitationCard({ isExpiring })}>
                <div className={styles.invitationHeader}>
                  <div className={styles.invitationInfo}>
                    <div className={styles.email}>{invitation.email}</div>
                    {invitation.title && (
                      <div className={styles.title}>Title: {invitation.title}</div>
                    )}

                    <div className={styles.metaInfo}>
                      <div className={styles.metaItem}>
                        <span>📅</span>
                        <span>Sent: {formatDate(invitation.created_at)}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span>⏰</span>
                        <span>
                          {daysRemaining === 0
                            ? 'Expires today'
                            : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
                        </span>
                      </div>
                      <div className={styles.metaItem}>
                        <span
                          className={styles.statusBadge({
                            status: isExpiring ? 'expiring' : 'active',
                          })}
                        >
                          {isExpiring ? 'Expiring Soon' : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canCancel && onCancel && (
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButton({ variant: 'danger' })}
                        onClick={() => onCancel(invitation.invitation_id)}
                        title="Cancel invitation"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingInvitations;
