import React, { forwardRef } from 'react';
import clsx from 'clsx';

import * as styles from './TextInput.css';

export type TextInputSize = 'sm' | 'md' | 'lg';
export type TextInputVariant = 'default' | 'filled' | 'underlined';
export type TextInputState = 'default' | 'error' | 'success' | 'warning';

export type TextInputProps = {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  size?: TextInputSize;
  variant?: TextInputVariant;
  state?: TextInputState;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  'data-testid'?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      placeholder,
      value,
      defaultValue,
      size = 'md',
      variant = 'default',
      state = 'default',
      disabled = false,
      required = false,
      readOnly = false,
      error,
      helperText,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      fullWidth = false,
      className,
      'data-testid': dataTestId,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `text-input-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveState = error ? 'error' : state;
    const effectiveHelperText = error || helperText;

    const inputEl = (
      <input
        ref={ref}
        id={inputId}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        data-testid={dataTestId}
        aria-invalid={effectiveState === 'error'}
        aria-describedby={effectiveHelperText ? `${inputId}-helper` : undefined}
        className={styles.input({
          size,
          hasLeftIcon: !!leftIcon,
          hasRightIcon: !!rightIcon,
        })}
        {...props}
      />
    );

    const inputWithIcons = (
      <div
        className={styles.inputWrapper({
          size,
          variant,
          state: effectiveState,
          disabled,
          hasLeftAddon: !!leftAddon,
          hasRightAddon: !!rightAddon,
        })}
      >
        {leftIcon && (
          <div className={styles.iconContainer({ position: 'left', size })}>
            {leftIcon}
          </div>
        )}
        {inputEl}
        {rightIcon && (
          <div className={styles.iconContainer({ position: 'right', size })}>
            {rightIcon}
          </div>
        )}
      </div>
    );

    const inputWithAddons =
      leftAddon || rightAddon ? (
        <div className={styles.addonGroup}>
          {leftAddon && (
            <div className={styles.addon({ position: 'left', size, variant })}>
              {leftAddon}
            </div>
          )}
          {inputWithIcons}
          {rightAddon && (
            <div className={styles.addon({ position: 'right', size, variant })}>
              {rightAddon}
            </div>
          )}
        </div>
      ) : (
        inputWithIcons
      );

    return (
      <div className={clsx(styles.container({ fullWidth }), className)}>
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              styles.label,
              required && styles.labelRequired,
              disabled && styles.labelDisabled
            )}
          >
            {label}
          </label>
        )}
        {inputWithAddons}
        {effectiveHelperText && (
          <div
            className={styles.helperText({ state: effectiveState })}
            id={`${inputId}-helper`}
          >
            {effectiveHelperText}
          </div>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
