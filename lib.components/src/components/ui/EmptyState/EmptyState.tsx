import React from 'react';
import clsx from 'clsx';

import * as styles from './EmptyState.css';

export type EmptyStateSize = 'sm' | 'md' | 'lg';
export type EmptyStateVariant = 'default' | 'error' | 'search' | 'loading';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  image?: string;
  size?: EmptyStateSize;
  variant?: EmptyStateVariant;
  actions?: EmptyStateAction[];
  className?: string;
  'data-testid'?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  image,
  size = 'md',
  variant = 'default',
  actions = [],
  className,
  'data-testid': testId,
}) => {
  return (
    <div
      className={clsx(styles.container({ size }), className)}
      data-testid={testId}
      role='status'
      aria-live='polite'
    >
      {image ? (
        <img src={image} alt='' className={styles.image} />
      ) : (
        <div className={clsx(styles.iconContainer[size], styles.iconColor[variant])}>
          {icon}
        </div>
      )}

      <h3 className={styles.title({ size, variant })}>{title}</h3>

      {description && (
        <p className={styles.description({ size, variant })}>{description}</p>
      )}

      {actions.length > 0 && (
        <div className={styles.actionContainer}>
          {actions.map((action, index) => (
            <button
              key={index}
              className={styles.actionButton({ variant: action.variant ?? 'primary' })}
              onClick={action.onClick}
              disabled={action.disabled}
              type='button'
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
