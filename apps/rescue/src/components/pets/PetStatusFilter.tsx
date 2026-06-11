import React from 'react';
import * as styles from './PetStatusFilter.css';

interface PetStatusFilterProps {
  activeStatus: string;
  statusCounts: Record<string, number>;
  onStatusChange: (status: string) => void;
}

const statusOptions = [
  { value: '', label: 'All Pets' },
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Pending' },
  { value: 'adopted', label: 'Adopted' },
  { value: 'foster', label: 'Foster' },
  { value: 'medical_hold', label: 'Medical Hold' },
  { value: 'behavioral_hold', label: 'Behavioral Hold' },
  { value: 'not_available', label: 'Not Available' },
];

const PetStatusFilter: React.FC<PetStatusFilterProps> = ({
  activeStatus,
  statusCounts,
  onStatusChange,
}) => {
  const getTotalCount = () => {
    return Object.values(statusCounts).reduce((total, count) => total + count, 0);
  };

  return (
    <div className={styles.statusFilterContainer} role="group" aria-label="Filter pets by status">
      {statusOptions.map(option => {
        const count = option.value === '' ? getTotalCount() : statusCounts[option.value] || 0;
        const isActive = activeStatus === option.value;

        return (
          <button
            key={option.value}
            className={styles.statusButton({ active: isActive })}
            onClick={() => onStatusChange(option.value)}
            aria-pressed={isActive}
            aria-label={`${option.label} (${count} pets)`}
          >
            {option.label}
            <span className={styles.statusCount({ active: isActive })} aria-hidden="true">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default PetStatusFilter;
