import React from 'react';
import clsx from 'clsx';

import * as styles from './ErrorState.css';

export type ErrorStateSize = 'sm' | 'md' | 'lg';

export type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
  size?: ErrorStateSize;
  className?: string;
  'data-testid'?: string;
};

export const ErrorState = ({
  title = 'Something went wrong',
  message,
  onRetry,
  icon,
  size = 'md',
  className,
  'data-testid': testId,
}: ErrorStateProps) => {
  return (
    <div className={clsx(styles.container({ size }), className)} data-testid={testId} role='alert'>
      {icon && <div className={clsx(styles.iconContainer[size], styles.iconColor)}>{icon}</div>}

      <h3 className={styles.title({ size })}>{title}</h3>

      {message && <p className={styles.message({ size })}>{message}</p>}

      {onRetry && (
        <button className={styles.retryButton} onClick={onRetry} type='button'>
          Try again
        </button>
      )}
    </div>
  );
};
