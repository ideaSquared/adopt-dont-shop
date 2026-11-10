import React from 'react';
import { Spinner } from '@adopt-dont-shop/lib.components';
import { StaffMember } from '../../types/staff';
import StaffCard from './StaffCard';
import * as styles from './StaffList.css';

interface StaffListProps {
  staff: StaffMember[];
  loading?: boolean;
  onEdit?: (staffMember: StaffMember) => void;
  onRemove?: (staffMember: StaffMember) => void;
  canEdit?: boolean;
  canRemove?: boolean;
  currentUserId?: string; // Prevents self-edit and self-removal
}

const StaffList: React.FC<StaffListProps> = ({
  staff,
  loading = false,
  onEdit,
  onRemove,
  canEdit = false,
  canRemove = false,
  currentUserId,
}) => {
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <Spinner size="lg" label="Loading staff members" />
          <p>Loading staff members...</p>
        </div>
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3 className={styles.emptyTitle}>No Staff Members</h3>
        <p className={styles.emptyText}>Your rescue doesn't have any staff members yet.</p>
      </div>
    );
  }

  return (
    <ul className={styles.staffGrid} aria-label="Staff members">
      {staff.map(staffMember => (
        <StaffCard
          key={staffMember.id}
          staffMember={staffMember}
          onEdit={onEdit}
          onRemove={onRemove}
          canEdit={canEdit && staffMember.userId !== currentUserId}
          canRemove={canRemove && staffMember.userId !== currentUserId}
        />
      ))}
    </ul>
  );
};

export default StaffList;
