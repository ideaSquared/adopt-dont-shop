import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import * as styles from './MetricCard.css';

export type MetricCardFormat = 'number' | 'percent' | 'currency' | 'duration';

export type MetricCardProps = {
  label: string;
  value: number | string;
  delta?: number;
  /** When true, a positive delta is displayed in red (e.g. error rate going up). */
  deltaInverted?: boolean;
  format?: MetricCardFormat;
  helperText?: string;
  /** Optional icon rendered above the label. */
  icon?: React.ReactNode;
  /** Tints the icon (e.g. '#667eea'); the background uses the same colour at low opacity. */
  iconColor?: string;
  /** When true, the value is replaced with a skeleton (delta/helper are hidden). */
  loading?: boolean;
};

const formatValue = (value: number | string, format: MetricCardFormat | undefined): string => {
  if (typeof value !== 'number') {
    return String(value);
  }
  if (format === 'percent') {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (format === 'currency') {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (format === 'duration') {
    // Treat numeric value as seconds.
    const totalSec = Math.round(value);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  return new Intl.NumberFormat(undefined).format(value);
};

const deltaColor = (delta: number, inverted: boolean): string => {
  const positiveIsGood = !inverted;
  if (delta === 0) {
    return 'var(--color-text-muted, #6b7280)';
  }
  if ((delta > 0 && positiveIsGood) || (delta < 0 && !positiveIsGood)) {
    return 'var(--color-success, #16a34a)';
  }
  return 'var(--color-danger, #dc2626)';
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  delta,
  deltaInverted,
  format,
  helperText,
  icon,
  iconColor,
  loading,
}) => (
  <div className={styles.card} data-testid='metric-card'>
    {icon ? (
      <div
        className={styles.icon}
        data-testid='metric-card-icon'
        style={iconColor ? { background: `${iconColor}20`, color: iconColor } : undefined}
      >
        {icon}
      </div>
    ) : null}
    <h4 className={styles.label}>{label}</h4>
    {loading ? (
      <div className={styles.value} data-testid='metric-card-skeleton'>
        <Skeleton width='70%' height='1.6rem' />
      </div>
    ) : (
      <div className={styles.value}>{formatValue(value, format)}</div>
    )}
    {!loading && typeof delta === 'number' ? (
      <div className={styles.delta} style={{ color: deltaColor(delta, !!deltaInverted) }}>
        {delta > 0 ? '+' : ''}
        {(delta * 100).toFixed(1)}%
      </div>
    ) : null}
    {!loading && helperText ? <div className={styles.helper}>{helperText}</div> : null}
  </div>
);
