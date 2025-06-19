import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';

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

const getSizeStyles = (size: TextInputSize) => {
  const sizes = {
    sm: css`
      height: 32px;
      padding: 0 8px;
      font-size: 14px;
    `,
    md: css`
      height: 40px;
      padding: 0 12px;
      font-size: 16px;
    `,
    lg: css`
      height: 48px;
      padding: 0 16px;
      font-size: 18px;
    `,
  };
  return sizes[size];
};

const getVariantStyles = (variant: TextInputVariant, theme: any) => {
  const variants = {
    default: css`
      border: 1px solid ${theme.colors.neutral[300]};
      background-color: ${theme.colors.neutral.white};
      border-radius: ${theme.spacing.xs};

      &:focus {
        border-color: ${theme.colors.primary.main};
        box-shadow: 0 0 0 3px ${theme.colors.primary.light}40;
      }
    `,
    filled: css`
      border: 1px solid transparent;
      background-color: ${theme.colors.neutral[100]};
      border-radius: ${theme.spacing.xs};

      &:focus {
        background-color: ${theme.colors.neutral.white};
        border-color: ${theme.colors.primary.main};
        box-shadow: 0 0 0 3px ${theme.colors.primary.light}40;
      }
    `,
    underlined: css`
      border: none;
      border-bottom: 2px solid ${theme.colors.neutral[300]};
      background-color: transparent;
      border-radius: 0;
      padding-left: 0;
      padding-right: 0;

      &:focus {
        border-bottom-color: ${theme.colors.primary.main};
        box-shadow: none;
      }
    `,
  };
  return variants[variant];
};

const getStateStyles = (state: TextInputState, theme: any) => {
  const states = {
    default: css``,
    error: css`
      border-color: ${theme.colors.semantic.error.main};
      &:focus {
        border-color: ${theme.colors.semantic.error.main};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.error.light}40;
      }
    `,
    success: css`
      border-color: ${theme.colors.semantic.success.main};
      &:focus {
        border-color: ${theme.colors.semantic.success.main};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.success.light}40;
      }
    `,
    warning: css`
      border-color: ${theme.colors.semantic.warning.main};
      &:focus {
        border-color: ${theme.colors.semantic.warning.main};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.warning.light}40;
      }
    `,
  };
  return states[state];
};

const InputContainer = styled.div<{ $fullWidth: boolean }>`
  display: ${({ $fullWidth }) => ($fullWidth ? 'block' : 'inline-block')};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const Label = styled.label<{ $required: boolean }>`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.neutral[700]};

  ${({ $required }) =>
    $required &&
    css`
      &::after {
        content: ' *';
        color: ${({ theme }) => theme.colors.semantic.error.main};
      }
    `}
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input<{
  $size: TextInputSize;
  $variant: TextInputVariant;
  $state: TextInputState;
  $hasLeftIcon: boolean;
  $hasRightIcon: boolean;
  $hasLeftAddon: boolean;
  $hasRightAddon: boolean;
}>`
  width: 100%;
  border: none;
  outline: none;
  transition: all ${({ theme }) => theme.transitions.fast};
  color: ${({ theme }) => theme.colors.neutral[900]};

  ${({ $size }) => getSizeStyles($size)}
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  ${({ $state, theme }) => getStateStyles($state, theme)}

  ${({ $hasLeftIcon, $size }) =>
    $hasLeftIcon &&
    css`
      padding-left: ${$size === 'sm' ? '32px' : $size === 'md' ? '40px' : '48px'};
    `}

  ${({ $hasRightIcon, $size }) =>
    $hasRightIcon &&
    css`
      padding-right: ${$size === 'sm' ? '32px' : $size === 'md' ? '40px' : '48px'};
    `}

  ${({ $hasLeftAddon }) =>
    $hasLeftAddon &&
    css`
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    `}

  ${({ $hasRightAddon }) =>
    $hasRightAddon &&
    css`
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    `}

  &::placeholder {
    color: ${({ theme }) => theme.colors.neutral[400]};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.neutral[400]};
    cursor: not-allowed;
  }
`;

const IconWrapper = styled.div<{
  $position: 'left' | 'right';
  $size: TextInputSize;
}>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.neutral[400]};
  pointer-events: none;
  z-index: 1;

  ${({ $position, $size }) =>
    $position === 'left'
      ? css`
          left: ${$size === 'sm' ? '8px' : $size === 'md' ? '12px' : '16px'};
        `
      : css`
          right: ${$size === 'sm' ? '8px' : $size === 'md' ? '12px' : '16px'};
        `}
`;

const Addon = styled.div<{
  $position: 'left' | 'right';
  $size: TextInputSize;
  $variant: TextInputVariant;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.neutral[100]};
  border: 1px solid ${({ theme }) => theme.colors.neutral[300]};
  color: ${({ theme }) => theme.colors.neutral[600]};
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: 0 ${({ theme }) => theme.spacing.sm};
  white-space: nowrap;

  ${({ $size }) => getSizeStyles($size)}

  ${({ $position }) =>
    $position === 'left'
      ? css`
          border-right: none;
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        `
      : css`
          border-left: none;
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        `}

  ${({ $variant }) =>
    $variant === 'underlined' &&
    css`
      border: none;
      border-bottom: 2px solid ${({ theme }) => theme.colors.neutral[300]};
      background-color: transparent;
      border-radius: 0;
    `}
`;

const HelperText = styled.div<{ $state: TextInputState }>`
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme, $state }) =>
    $state === 'error'
      ? theme.colors.semantic.error.main
      : $state === 'success'
        ? theme.colors.semantic.success.main
        : $state === 'warning'
          ? theme.colors.semantic.warning.main
          : theme.colors.neutral[600]};
`;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      placeholder,
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
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveState = error ? 'error' : state;
    const effectiveHelperText = error || helperText;

    return (
      <InputContainer $fullWidth={fullWidth} className={className}>
        {label && (
          <Label htmlFor={inputId} $required={required}>
            {label}
          </Label>
        )}
        <InputWrapper>
          {leftAddon && (
            <Addon $position='left' $size={size} $variant={variant}>
              {leftAddon}
            </Addon>
          )}

          <div style={{ position: 'relative', flex: 1 }}>
            {leftIcon && (
              <IconWrapper $position='left' $size={size}>
                {leftIcon}
              </IconWrapper>
            )}

            <StyledInput
              ref={ref}
              id={inputId}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              readOnly={readOnly}
              $size={size}
              $variant={variant}
              $state={effectiveState}
              $hasLeftIcon={!!leftIcon}
              $hasRightIcon={!!rightIcon}
              $hasLeftAddon={!!leftAddon}
              $hasRightAddon={!!rightAddon}
              data-testid={dataTestId}
              {...props}
            />

            {rightIcon && (
              <IconWrapper $position='right' $size={size}>
                {rightIcon}
              </IconWrapper>
            )}
          </div>

          {rightAddon && (
            <Addon $position='right' $size={size} $variant={variant}>
              {rightAddon}
            </Addon>
          )}
        </InputWrapper>

        {effectiveHelperText && (
          <HelperText $state={effectiveState}>{effectiveHelperText}</HelperText>
        )}
      </InputContainer>
    );
  }
);

