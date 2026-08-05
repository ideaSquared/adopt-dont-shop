import React from 'react';
import clsx from 'clsx';

import * as styles from './ErrorState.css';

export type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  'data-testid'?: string;
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
  'data-testid': testId,
}) => {
  return (
    <div
      className={clsx(styles.container, className)}
      data-testid={testId}
      role='alert'
      aria-live='assertive'
    >
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button type='button' className={styles.retryButton} onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
};
