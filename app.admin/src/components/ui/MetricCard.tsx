import React from 'react';
import * as styles from './MetricCard.css';

interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  change,
  changePositive = true,
  loading = false,
  onClick,
}) => {
  if (loading) {
    return (
      <div className={styles.card({ clickable: false })}>
        <div className={styles.header}>
          <span className={styles.icon}>{icon}</span>
          <div className={styles.label}>{label}</div>
        </div>
        <div
          className={styles.loadingSkeleton}
          style={{ height: '2.25rem', marginBottom: '0.5rem' }}
        />
        <div className={styles.loadingSkeleton} style={{ height: '0.875rem', width: '60%' }} />
      </div>
    );
  }

  return (
    <div
      className={styles.card({ clickable: !!onClick })}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <div className={styles.label}>{label}</div>
      </div>
      <div className={styles.value}>{value}</div>
      {change && (
        <div className={styles.change({ positive: changePositive })}>
          {changePositive ? '↑' : '↓'} {change}
        </div>
      )}
    </div>
  );
};
