import React from 'react';
import clsx from 'clsx';

import {
  container,
  checkboxContainer,
  hiddenCheckbox,
  styledCheckboxSizes,
  styledCheckbox,
  checkIcon,
  checkIconSizes,
  labelContainer,
  label,
  description,
  helperText,
} from './CheckboxInput.css';

export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxState = 'default' | 'error' | 'success' | 'warning';

export type CheckboxInputProps = {
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  size?: CheckboxSize;
  state?: CheckboxState;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  description?: string;
  className?: string;
  'data-testid'?: string;
  ref?: React.Ref<HTMLInputElement>;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>;

export const CheckboxInput = ({
  label: labelText,
  checked,
  defaultChecked,
  indeterminate = false,
  size = 'md',
  state = 'default',
  disabled = false,
  required = false,
  error,
  helperText: helperTextProp,
  description: descriptionText,
  className,
  'data-testid': dataTestId,
  id,
  onChange,
  ref,
  ...props
}: CheckboxInputProps) => {
  const inputId = id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;
  const effectiveState = error ? 'error' : state;
  const effectiveHelperText = error || helperTextProp;
  const isChecked = checked || defaultChecked || false;

  const handleContainerClick = () => {
    if (!disabled && ref && typeof ref === 'object' && 'current' in ref && ref.current) {
      ref.current.click();
    }
  };

  const handleContainerKeyDown = (event: React.KeyboardEvent) => {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      !disabled &&
      ref &&
      typeof ref === 'object' &&
      'current' in ref &&
      ref.current
    ) {
      event.preventDefault();
      ref.current.click();
    }
  };

  return (
    <div className={clsx(container, className)}>
      <div
        className={checkboxContainer}
        onClick={handleContainerClick}
        onKeyDown={handleContainerKeyDown}
        role='button'
        tabIndex={disabled ? -1 : 0}
      >
        <input
          type='checkbox'
          ref={ref}
          id={inputId}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          required={required}
          data-testid={dataTestId}
          onChange={onChange}
          className={hiddenCheckbox}
          {...props}
        />

        <div
          className={clsx(
            styledCheckbox({ state: effectiveState, checked: isChecked, disabled }),
            styledCheckboxSizes[size]
          )}
        >
          <span
            className={clsx(
              checkIcon({ visible: isChecked || indeterminate }),
              checkIconSizes[size]
            )}
          >
            {indeterminate ? '−' : '✓'}
          </span>
        </div>

        {(labelText || descriptionText) && (
          <div className={labelContainer}>
            {labelText && (
              <label htmlFor={inputId} className={label({ disabled, required })}>
                {labelText}
              </label>
            )}
            {descriptionText && <p className={description({ disabled })}>{descriptionText}</p>}
          </div>
        )}
      </div>

      {effectiveHelperText && (
        <div className={helperText[effectiveState]}>{effectiveHelperText}</div>
      )}
    </div>
  );
};
