import React from 'react';
import * as styles from './StatusBadge.css';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, children, size = 'medium' }) => {
  return <span className={styles.badge({ variant, size })}>{children}</span>;
};
