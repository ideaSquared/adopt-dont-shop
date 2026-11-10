import React, { useRef } from 'react';
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

  // The wrapper toggles the input itself, so it needs the input whether or not the caller
  // passed a ref.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const handleContainerClick = (event: React.MouseEvent) => {
    // Clicks on the input or its label already toggle it natively.
    const target = event.target;
    const togglesNatively =
      target === inputRef.current || (target instanceof Element && target.closest('label'));
    if (!disabled && !togglesNatively) {
      inputRef.current?.click();
    }
  };

  const handleContainerKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
      event.preventDefault();
      inputRef.current?.click();
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
          ref={setInputRef}
          id={inputId}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          required={required}
          aria-required={required ? true : undefined}
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
