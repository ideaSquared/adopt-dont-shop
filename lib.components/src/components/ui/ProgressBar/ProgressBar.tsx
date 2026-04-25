import clsx from 'clsx';
import React from 'react';

import * as styles from './ProgressBar.css';

export type ProgressBarSize = 'sm' | 'md' | 'lg';
export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'error';

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: ProgressBarSize;
  variant?: ProgressBarVariant;
  label?: string;
  showValue?: boolean;
  showPercentage?: boolean;
  animated?: boolean;
  striped?: boolean;
  indeterminate?: boolean;
  className?: string;
  'data-testid'?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  label,
  showValue = false,
  showPercentage = false,
  animated = false,
  striped = false,
  indeterminate = false,
  className,
  'data-testid': testId,
}) => {
  const clampedValue = Math.min(Math.max(0, value), max);
  const percentage = indeterminate ? 0 : (clampedValue / max) * 100;

  const valueDisplay = showPercentage
    ? `${Math.round(percentage)}%`
    : showValue
      ? `${clampedValue}/${max}`
      : null;

  const ariaValueNow = indeterminate ? undefined : clampedValue;
  const ariaLabel = indeterminate
    ? `${label ?? 'Progress'} - loading`
    : `${label ?? 'Progress'} - ${clampedValue} of ${max}`;

  return (
    <div className={clsx(styles.progressContainer, className)} data-testid={testId}>
      {(label || valueDisplay) && (
        <div className={styles.labelContainer}>
          {label && <span className={styles.label}>{label}</span>}
          {valueDisplay && <span className={styles.valueText}>{valueDisplay}</span>}
        </div>
      )}

      <div
        className={styles.progressTrack({ size })}
        role='progressbar'
        aria-label={ariaLabel}
        aria-valuenow={ariaValueNow}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={styles.progressFill({ variant, striped, animated: animated && striped, indeterminate })}
          style={indeterminate ? undefined : { width: `${percentage}%` }}
        />
        <span className={styles.srOnly}>
          {indeterminate
            ? `${label ?? 'Progress'} - loading`
            : `${label ?? 'Progress'} - ${Math.round(percentage)}% complete`}
        </span>
      </div>
    </div>
  );
};
