import clsx from 'clsx';
import React from 'react';

import * as styles from './Badge.css';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'outline'
  | 'count';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  removable?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
  icon?: React.ReactNode;
  rounded?: boolean;
  dot?: boolean;
  max?: number;
};

const CloseIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
  </svg>
);

const clampCount = (children: React.ReactNode, max: number | undefined): React.ReactNode => {
  if (max === undefined) {
    return children;
  }
  const numeric =
    typeof children === 'number'
      ? children
      : typeof children === 'string' && /^-?\d+$/.test(children.trim())
        ? Number(children)
        : null;
  if (numeric === null) {
    return children;
  }
  return numeric > max ? `${max}+` : String(numeric);
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  removable = false,
  onRemove,
  disabled = false,
  className,
  'data-testid': dataTestId,
  icon,
  rounded = false,
  dot = false,
  max,
}) => {
  const handleRemove = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (onRemove && !disabled) {
      onRemove();
    }
  };

  const displayChildren = clampCount(children, max);

  return (
    <span
      className={clsx(styles.badge({ size, variant, rounded, disabled, dot }), className)}
      data-testid={dataTestId}
      role='status'
      aria-label={typeof displayChildren === 'string' ? displayChildren : undefined}
    >
      {icon && <span className={styles.iconContainer[size]}>{icon}</span>}

      {displayChildren !== undefined && displayChildren !== null && displayChildren !== '' && (
        <span>{displayChildren}</span>
      )}

      {removable && (
        <button
          className={styles.removeButton({ size })}
          onClick={handleRemove}
          disabled={disabled}
          aria-label='Remove badge'
          type='button'
        >
          <CloseIcon />
        </button>
      )}
    </span>
  );
};

Badge.displayName = 'Badge';
