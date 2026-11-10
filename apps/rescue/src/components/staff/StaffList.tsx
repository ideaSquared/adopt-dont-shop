import React, { useState } from 'react';
import { Input, SelectInput, Spinner } from '@adopt-dont-shop/lib.components';
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
  showSearch?: boolean;
  currentUserId?: string; // Add current user ID to prevent self-editing/removal
}

type StaffFilter = 'all' | 'verified' | 'pending';

const STAFF_FILTER_OPTIONS: { value: StaffFilter; label: string }[] = [
  { value: 'all', label: 'All Staff' },
  { value: 'verified', label: 'Verified Only' },
  { value: 'pending', label: 'Pending Only' },
];

const toStaffFilter = (value: string | string[]): StaffFilter => {
  const match = STAFF_FILTER_OPTIONS.find(option => option.value === value);
  return match ? match.value : 'all';
};

const StaffList: React.FC<StaffListProps> = ({
  staff,
  loading = false,
  onEdit,
  onRemove,
  canEdit = false,
  canRemove = false,
  showSearch = true,
  currentUserId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<StaffFilter>('all');

  const filteredStaff = staff.filter(member => {
    const matchesSearch =
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterBy === 'all' ||
      (filterBy === 'verified' && member.isVerified) ||
      (filterBy === 'pending' && !member.isVerified);

    return matchesSearch && matchesFilter;
  });

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

  return (
    <div className={styles.listContainer}>
      {showSearch && (
        <div className={styles.listControls}>
          <div className={styles.searchFilters}>
            <Input
              className={styles.searchInput}
              type="text"
              aria-label="Search staff members"
              placeholder="Search staff members..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <SelectInput
              className={styles.filterSelect}
              label="Filter by status"
              value={filterBy}
              onChange={value => setFilterBy(toStaffFilter(value))}
              options={STAFF_FILTER_OPTIONS}
            />
          </div>
          <div className={styles.staffCount}>
            Showing {filteredStaff.length} of {staff.length} staff members
          </div>
        </div>
      )}

      {filteredStaff.length === 0 ? (
        <div className={styles.emptyState}>
          {staff.length === 0 ? (
            <div className={styles.emptyContainer}>
              <div className={styles.emptyIcon}>👥</div>
              <h3 className={styles.emptyTitle}>No Staff Members</h3>
              <p className={styles.emptyText}>Your rescue doesn't have any staff members yet.</p>
            </div>
          ) : (
            <div className={styles.emptyContainer}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3 className={styles.emptyTitle}>No Results Found</h3>
              <p className={styles.emptyText}>
                No staff members match your current search criteria.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.staffGrid}>
          {filteredStaff.map(staffMember => {
            // Prevent self-editing and self-removal
            const isCurrentUser = staffMember.userId === currentUserId;
            return (
              <StaffCard
                key={staffMember.id}
                staffMember={staffMember}
                onEdit={onEdit}
                onRemove={onRemove}
                canEdit={canEdit && !isCurrentUser}
                canRemove={canRemove && !isCurrentUser}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StaffList;
