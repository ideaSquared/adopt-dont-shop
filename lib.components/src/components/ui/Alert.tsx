import clsx from 'clsx';
import React from 'react';

import * as styles from './Alert.css';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';
export type AlertSize = 'sm' | 'md' | 'lg';

export type AlertProps = {
  children: React.ReactNode;
  variant?: AlertVariant;
  size?: AlertSize;
  title?: string;
  closable?: boolean;
  onClose?: () => void;
  className?: string;
  'data-testid'?: string;
  icon?: React.ReactNode;
  showIcon?: boolean;
};

const SuccessIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z'
      clipRule='evenodd'
    />
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z'
      clipRule='evenodd'
    />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z'
      clipRule='evenodd'
    />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z'
      clipRule='evenodd'
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
  </svg>
);

const defaultIcons: Record<AlertVariant, React.ReactNode> = {
  success: <SuccessIcon />,
  error: <ErrorIcon />,
  warning: <WarningIcon />,
  info: <InfoIcon />,
};

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  size = 'md',
  title,
  closable = false,
  onClose,
  className,
  'data-testid': dataTestId,
  icon,
  showIcon = true,
}) => {
  const displayIcon = icon ?? (showIcon ? defaultIcons[variant] : null);

  return (
    <div
      className={clsx(styles.alertContainer({ variant, size }), className)}
      role='alert'
      data-testid={dataTestId}
    >
      {displayIcon && (
        <span
          className={clsx(
            styles.alertIconWrapper,
            styles.alertIconSize[size],
            styles.alertIconColor[variant]
          )}
        >
          {displayIcon}
        </span>
      )}

      <div className={styles.alertContent}>
        {title && (
          <div
            className={clsx(
              styles.alertTitleBase,
              styles.alertTitleSize[size],
              styles.alertTitleColor[variant]
            )}
          >
            {title}
          </div>
        )}
        <div className={styles.alertMessage}>{children}</div>
      </div>

      {closable && (
        <button
          className={clsx(styles.alertCloseButtonBase, styles.alertCloseButtonSize[size])}
          onClick={onClose}
          aria-label='Close alert'
          type='button'
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
};

Alert.displayName = 'Alert';
