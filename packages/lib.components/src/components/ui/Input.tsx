import clsx from 'clsx';
import { useId } from 'react';

import { InputProps } from '../../types';
import * as styles from './Input.css';

export const Input = ({
  className = '',
  label,
  error,
  helperText,
  id,
  required = false,
  isFullWidth = true,
  size = 'md',
  variant = 'default',
  startIcon,
  endIcon,
  ref,
  ...props
}: InputProps) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hasError = !!error;
  const helpText = error || helperText;
  const helperId = helpText ? `${inputId}-helper` : undefined;
  const actualVariant = hasError ? 'error' : variant;

  return (
    <div className={styles.inputWrapper({ isFullWidth })}>
      {label && (
        <label className={styles.inputLabel} htmlFor={inputId}>
          {label}
          {required && <span className={styles.requiredIndicator}>*</span>}
        </label>
      )}

      <div className={styles.inputContainer}>
        {startIcon && <div className={styles.startIconWrapper}>{startIcon}</div>}

        <input
          id={inputId}
          ref={ref}
          className={clsx(
            styles.styledInput({
              variant: actualVariant,
              size,
              hasStartIcon: !!startIcon,
              hasEndIcon: !!endIcon,
            }),
            className
          )}
          aria-invalid={hasError}
          aria-describedby={helperId}
          required={required}
          {...props}
        />

        {endIcon && <div className={styles.endIconWrapper}>{endIcon}</div>}
      </div>

      {helpText && (
        <p id={helperId} className={styles.helperText({ hasError })}>
          {helpText}
        </p>
      )}
    </div>
  );
};
