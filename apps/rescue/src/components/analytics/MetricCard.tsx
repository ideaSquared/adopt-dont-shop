import React from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import * as styles from './MetricCard.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  subtitle?: string;
  onClick?: () => void;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  onClick,
  loading = false,
}) => {
  return (
    <div
      className={styles.card({ clickable: !!onClick })}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                onClick();
              }
            }
          : undefined
      }
    >
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        {icon && <div className={styles.iconContainer}>{icon}</div>}
      </div>

      <div className={styles.value}>{loading ? '...' : value}</div>

      {trend && !loading && (
        <div className={styles.trendContainer({ positive: trend.isPositive })}>
          <div className={styles.trendIcon}>
            {trend.isPositive ? <FiTrendingUp /> : <FiTrendingDown />}
          </div>
          <span>
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </span>
          {trend.label && <span>{trend.label}</span>}
        </div>
      )}

      {subtitle && !loading && <div className={styles.subtitle}>{subtitle}</div>}

      {loading && <div className={styles.loadingBar} />}
    </div>
  );
};

export default MetricCard;
