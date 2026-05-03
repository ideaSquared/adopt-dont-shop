import React from 'react';
import { StaffMember } from '../../types/staff';
import StatusBadge from '../common/StatusBadge';
import * as styles from './StaffCard.css';

interface StaffCardProps {
  staffMember: StaffMember;
  onEdit?: (staffMember: StaffMember) => void;
  onRemove?: (staffMember: StaffMember) => void;
  canEdit?: boolean;
  canRemove?: boolean;
}

const StaffCard: React.FC<StaffCardProps> = ({
  staffMember,
  onEdit,
  onRemove,
  canEdit = false,
  canRemove = false,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div className={styles.staffAvatar}>
          {getInitials(staffMember.firstName, staffMember.lastName)}
        </div>
        <div className={styles.staffInfo}>
          <h3 className={styles.staffName}>
            {staffMember.firstName} {staffMember.lastName}
          </h3>
          <p className={styles.staffTitle}>{staffMember.title}</p>
          <p className={styles.staffEmail}>{staffMember.email}</p>
        </div>
        <div className={styles.staffStatus}>
          <StatusBadge status={staffMember.isVerified ? 'verified' : 'pending'} />
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.staffDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Added:</span>
            <span className={styles.detailValue}>{formatDate(staffMember.addedAt)}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>User ID:</span>
            <span className={styles.detailValue}>{staffMember.userId}</span>
          </div>
        </div>
      </div>

      {(canEdit || canRemove) && (
        <div className={styles.cardActions}>
          {canEdit && (
            <button
              className={styles.actionButton({ variant: 'edit' })}
              onClick={() => onEdit?.(staffMember)}
            >
              Edit
            </button>
          )}
          {canRemove && (
            <button
              className={styles.actionButton({ variant: 'danger' })}
              onClick={() => onRemove?.(staffMember)}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffCard;
