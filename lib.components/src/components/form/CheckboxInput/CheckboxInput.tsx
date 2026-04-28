import React, { forwardRef } from 'react';
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
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>;

const CheckboxInputComponent = forwardRef<HTMLInputElement, CheckboxInputProps>(
  (
    {
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
      ...props
    },
    ref
  ) => {
    const inputId = id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveState = error ? 'error' : state;
    const effectiveHelperText = error || helperTextProp;
    const isChecked = checked || defaultChecked || false;

    const handleContainerClick = () => {
      if (!disabled && ref && 'current' in ref && ref.current) {
        ref.current.click();
      }
    };

    return (
      <div className={clsx(container, className)}>
        <div className={checkboxContainer} onClick={handleContainerClick}>
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
  }
);

CheckboxInputComponent.displayName = 'CheckboxInput';
export const CheckboxInput = CheckboxInputComponent;
