import React, { forwardRef } from 'react';
import styled, { css, DefaultTheme } from 'styled-components';

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

const getSizeStyles = (size: CheckboxSize) => {
  const sizes = {
    sm: css`
      width: 16px;
      height: 16px;
    `,
    md: css`
      width: 20px;
      height: 20px;
    `,
    lg: css`
      width: 24px;
      height: 24px;
    `,
  };
  return sizes[size];
};

//

const getStateStyles = (state: CheckboxState, theme: DefaultTheme) => {
  const states = {
    default: css`
      border-color: ${theme.colors.neutral[300]};
      &:focus {
        border-color: ${theme.colors.primary[500]};
        box-shadow: 0 0 0 3px ${theme.colors.primary[100]}40;
      }
      &:checked {
        background-color: ${theme.colors.primary[500]};
        border-color: ${theme.colors.primary[500]};
      }
    `,
    error: css`
      border-color: ${theme.colors.semantic.error[500]};
      &:focus {
        border-color: ${theme.colors.semantic.error[500]};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.error[100]}40;
      }
      &:checked {
        background-color: ${theme.colors.semantic.error[500]};
        border-color: ${theme.colors.semantic.error[500]};
      }
    `,
    success: css`
      border-color: ${theme.colors.semantic.success[500]};
      &:focus {
        border-color: ${theme.colors.semantic.success[500]};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.success[100]}40;
      }
      &:checked {
        background-color: ${theme.colors.semantic.success[500]};
        border-color: ${theme.colors.semantic.success[500]};
      }
    `,
    warning: css`
      border-color: ${theme.colors.semantic.warning[500]};
      &:focus {
        border-color: ${theme.colors.semantic.warning[500]};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.warning[100]}40;
      }
      &:checked {
        background-color: ${theme.colors.semantic.warning[500]};
        border-color: ${theme.colors.semantic.warning[500]};
      }
    `,
  };
  return states[state];
};

const Container = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;

  &:hover input:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary[500]};
  }
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
`;

const StyledCheckbox = styled.div<{
  $size: CheckboxSize;
  $state: CheckboxState;
  $checked: boolean;
  $indeterminate: boolean;
  $disabled: boolean;
}>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid;
  border-radius: ${({ theme }) => theme.spacing.xs};
  background-color: ${({ theme }) => theme.colors.neutral[50]};
  transition: all ${({ theme }) => theme.transitions.fast};
  flex-shrink: 0;
  margin-top: 2px; /* Align with first line of text */

  ${({ $size }) => getSizeStyles($size)}
  ${({ $state, theme }) => getStateStyles($state, theme)}

  ${({ $disabled, theme }) =>
    $disabled &&
    css`
      background-color: ${theme.colors.neutral[100]};
      border-color: ${theme.colors.neutral[200]};
      cursor: not-allowed;

      &:checked {
        background-color: ${theme.colors.neutral[300]};
        border-color: ${theme.colors.neutral[300]};
      }
    `}

  ${({ $checked, $indeterminate }) =>
    ($checked || $indeterminate) &&
    css`
      border-color: currentColor;
    `}
`;

const CheckIcon = styled.div<{
  $checked: boolean;
  $indeterminate: boolean;
  $size: CheckboxSize;
}>`
  color: white;
  opacity: ${({ $checked, $indeterminate }) => ($checked || $indeterminate ? 1 : 0)};
  transition: opacity ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => ($size === 'sm' ? '10px' : $size === 'md' ? '12px' : '14px')};
  font-weight: bold;

  &::before {
    content: ${({ $indeterminate }) => ($indeterminate ? '"−"' : '"✓"')};
  }
`;

const LabelContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  flex: 1;
`;

const Label = styled.label<{ $disabled: boolean; $required: boolean }>`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.neutral[400] : theme.colors.neutral[900]};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};

  ${({ $required }) =>
    $required &&
    css`
      &::after {
        content: ' *';
        color: ${({ theme }) => theme.colors.semantic.error[500]};
      }
    `}
`;

const Description = styled.p<{ $disabled: boolean }>`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.neutral[300] : theme.colors.neutral[600]};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const HelperText = styled.div<{ $state: CheckboxState }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme, $state }) =>
    $state === 'error'
      ? theme.colors.semantic.error[500]
      : $state === 'success'
        ? theme.colors.semantic.success[500]
        : $state === 'warning'
          ? theme.colors.semantic.warning[500]
          : theme.colors.neutral[600]};
`;

const CheckboxInputComponent = forwardRef<HTMLInputElement, CheckboxInputProps>(
  (
    {
      label,
      checked,
      defaultChecked,
      indeterminate = false,
      size = 'md',
      state = 'default',
      disabled = false,
      required = false,
      error,
      helperText,
      description,
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
    const effectiveHelperText = error || helperText;
    const isChecked = checked || defaultChecked || false;

    const handleContainerClick = () => {
      if (!disabled && ref && 'current' in ref && ref.current) {
        ref.current.click();
      }
    };

    return (
      <Container className={className}>
        <CheckboxContainer onClick={handleContainerClick}>
          <HiddenCheckbox
            ref={ref}
            id={inputId}
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            required={required}
            data-testid={dataTestId}
            onChange={onChange}
            {...props}
          />

          <StyledCheckbox
            $size={size}
            $state={effectiveState}
            $checked={isChecked}
            $indeterminate={indeterminate}
            $disabled={disabled}
          >
            <CheckIcon $checked={isChecked} $indeterminate={indeterminate} $size={size} />
          </StyledCheckbox>

          {(label || description) && (
            <LabelContainer>
              {label && (
                <Label htmlFor={inputId} $disabled={disabled} $required={required}>
                  {label}
                </Label>
              )}
              {description && <Description $disabled={disabled}>{description}</Description>}
            </LabelContainer>
          )}
        </CheckboxContainer>

        {effectiveHelperText && (
          <HelperText $state={effectiveState}>{effectiveHelperText}</HelperText>
        )}
      </Container>
    );
  }
);
CheckboxInputComponent.displayName = 'CheckboxInput';
export const CheckboxInput = CheckboxInputComponent;
