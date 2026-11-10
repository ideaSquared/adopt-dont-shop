import React from 'react';
import { Avatar, Button, StatusBadge } from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import { StaffMember } from '../../types/staff';
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
    return formatDisplayDate(dateString);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <Avatar
          name={`${staffMember.firstName} ${staffMember.lastName}`}
          initials={getInitials(staffMember.firstName, staffMember.lastName)}
          size="lg"
        />
        <div className={styles.staffInfo}>
          <h3 className={styles.staffName}>
            {staffMember.firstName} {staffMember.lastName}
          </h3>
          <p className={styles.staffTitle}>{staffMember.title}</p>
          <p className={styles.staffEmail}>{staffMember.email}</p>
        </div>
        <div className={styles.staffStatus}>
          <StatusBadge
            variant={staffMember.isVerified ? 'success' : 'warning'}
            label={staffMember.isVerified ? 'Verified' : 'Pending'}
          />
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.staffDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Added:</span>
            <span className={styles.detailValue}>{formatDate(staffMember.addedAt)}</span>
          </div>
        </div>
      </div>

      {(canEdit || canRemove) && (
        <div className={styles.cardActions}>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit?.(staffMember)}>
              Edit
            </Button>
          )}
          {canRemove && (
            <Button variant="danger" size="sm" onClick={() => onRemove?.(staffMember)}>
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffCard;
