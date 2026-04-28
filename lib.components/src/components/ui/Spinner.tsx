import clsx from 'clsx';
import React from 'react';

import * as styles from './Spinner.css';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type SpinnerVariant = 'default' | 'primary' | 'secondary' | 'current';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  showLabel?: boolean;
  text?: string;
  className?: string;
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      variant = 'default',
      label = 'Loading...',
      showLabel = false,
      text,
      className = '',
      ...rest
    },
    ref
  ) => {
    return (
      <div ref={ref} className={clsx(styles.container, className)} {...rest}>
        <div className={styles.spinner({ size, variant })} role='status' aria-label={label} />
        {showLabel && <span className={styles.label}>{text || label}</span>}
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

export const DotSpinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      variant = 'default',
      label = 'Loading...',
      showLabel = false,
      text,
      className = '',
      ...rest
    },
    ref
  ) => {
    return (
      <div ref={ref} className={clsx(styles.container, className)} {...rest}>
        <div className={styles.dotContainer[size]} role='status' aria-label={label}>
          {([-0.32, -0.16, 0] as const).map(delay => (
            <div
              key={delay}
              className={styles.dot({ size, variant })}
              style={{ '--dot-delay': `${delay}s` } as React.CSSProperties}
            />
          ))}
        </div>
        {showLabel && <span className={styles.label}>{text || label}</span>}
      </div>
    );
  }
);

DotSpinner.displayName = 'DotSpinner';
