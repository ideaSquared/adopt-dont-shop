import { forwardRef } from 'react';
import clsx from 'clsx';

import {
  radioContainer,
  groupLabel,
  radioGroup,
  radioOptionContainer,
  hiddenRadio,
  styledRadio,
  styledRadioSizes,
  optionLabel,
  helperText,
} from './RadioInput.css';

export type RadioInputSize = 'sm' | 'md' | 'lg';
export type RadioInputState = 'default' | 'error' | 'success' | 'warning';

export type RadioOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type RadioInputProps = {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  size?: RadioInputSize;
  state?: RadioInputState;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
  direction?: 'horizontal' | 'vertical';
  fullWidth?: boolean;
  className?: string;
  'data-testid'?: string;
  onChange?: (value: string) => void;
};

export const RadioInput = forwardRef<HTMLInputElement, RadioInputProps>(
  (
    {
      name,
      options,
      value,
      defaultValue,
      size = 'md',
      state = 'default',
      disabled = false,
      required = false,
      label,
      error,
      helperText: helperTextProp,
      direction = 'vertical',
      fullWidth = false,
      className,
      'data-testid': testId,
      onChange,
      ...props
    },
    ref
  ) => {
    const handleChange = (optionValue: string) => {
      if (onChange) {
        onChange(optionValue);
      }
    };

    const finalState = error ? 'error' : state;
    const finalHelperText = error || helperTextProp;

    return (
      <div
        className={clsx(radioContainer({ fullWidth }), className)}
        data-testid={testId}
      >
        {label && (
          <label className={groupLabel({ required })}>{label}</label>
        )}

        <div className={radioGroup[direction]}>
          {options.map((option, index) => {
            const isOptionDisabled = disabled || option.disabled || false;
            const isChecked = value === option.value;

            return (
              <label
                key={option.value}
                className={radioOptionContainer({ disabled: isOptionDisabled })}
              >
                <input
                  type='radio'
                  ref={index === 0 ? ref : undefined}
                  name={name}
                  value={option.value}
                  {...(value !== undefined
                    ? { checked: isChecked }
                    : { defaultChecked: defaultValue === option.value })}
                  disabled={isOptionDisabled}
                  required={required}
                  onChange={() => handleChange(option.value)}
                  className={hiddenRadio}
                  {...props}
                />
                <div
                  className={clsx(
                    styledRadio({ state: finalState, checked: isChecked, disabled: isOptionDisabled }),
                    styledRadioSizes[size]
                  )}
                />
                <span className={optionLabel}>{option.label}</span>
              </label>
            );
          })}
        </div>

        {finalHelperText && (
          <div className={helperText[finalState]}>{finalHelperText}</div>
        )}
      </div>
    );
  }
);

RadioInput.displayName = 'RadioInput';
