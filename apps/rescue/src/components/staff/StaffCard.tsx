import React from 'react';
import { Avatar, Button } from '@adopt-dont-shop/lib.components';
import { StaffMember } from '../../types/staff';
import * as styles from './StaffCard.css';

interface StaffCardProps {
  staffMember: StaffMember;
  onRemove?: (staffMember: StaffMember) => void;
  canRemove?: boolean;
}

const getInitials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

const StaffCard: React.FC<StaffCardProps> = ({ staffMember, onRemove, canRemove = false }) => {
  const fullName = `${staffMember.firstName} ${staffMember.lastName}`;

  return (
    <li className={styles.cardContainer}>
      <Avatar
        name={fullName}
        initials={getInitials(staffMember.firstName, staffMember.lastName)}
        size="lg"
      />
      <div className={styles.staffInfo}>
        <h3 className={styles.staffName}>{fullName}</h3>
        <p className={styles.staffTitle}>{staffMember.title}</p>
        <p className={styles.staffEmail}>{staffMember.email}</p>
      </div>
      {canRemove && (
        <Button
          variant="danger"
          size="sm"
          onClick={() => onRemove?.(staffMember)}
          aria-label={`Remove ${fullName}`}
        >
          Remove
        </Button>
      )}
    </li>
  );
};

export default StaffCard;
