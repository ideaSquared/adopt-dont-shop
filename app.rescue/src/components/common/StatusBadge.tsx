import React from 'react';
import { formatStatusName, getStatusColor } from '../../utils/statusUtils';
import * as styles from './StatusBadge.css';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const variant = getStatusColor(status);

  return (
    <span className={[styles.badge({ variant }), className].filter(Boolean).join(' ')}>
      {formatStatusName(status)}
    </span>
  );
};

export default StatusBadge;
