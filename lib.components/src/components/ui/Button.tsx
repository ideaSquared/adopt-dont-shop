import clsx from 'clsx';
import React from 'react';

import { ButtonProps } from '../../types';
import * as styles from './Button.css';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isFullWidth = false,
      isRounded = false,
      disabled = false,
      children,
      startIcon,
      endIcon,
      leftIcon,
      rightIcon,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const effectiveStartIcon = startIcon ?? leftIcon;
    const effectiveEndIcon = endIcon ?? rightIcon;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading || disabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    return (
      <button
        ref={ref}
        className={clsx(
          styles.button({
            variant,
            size,
            isLoading,
            isFullWidth,
            isRounded,
            hasStartIcon: !!effectiveStartIcon,
            hasEndIcon: !!effectiveEndIcon,
          }),
          className
        )}
        disabled={disabled || isLoading}
        onClick={handleClick}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        type='button'
        {...props}
      >
        {effectiveStartIcon && !isLoading && (
          <span className={styles.iconContainer}>{effectiveStartIcon}</span>
        )}
        {children}
        {effectiveEndIcon && !isLoading && (
          <span className={styles.iconContainer}>{effectiveEndIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
