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
      height: ${({ theme }) => theme.spacing[8]};
      padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
      font-size: ${({ theme }) => theme.typography.size.sm};
    `,
    md: css`
      height: ${({ theme }) => theme.spacing[10]};
      padding: ${({ theme }) => theme.spacing[2.5]} ${({ theme }) => theme.spacing[3]};
      font-size: ${({ theme }) => theme.typography.size.base};
    `,
    lg: css`
      height: ${({ theme }) => theme.spacing[12]};
      padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
      font-size: ${({ theme }) => theme.typography.size.lg};
    `,
  };
  return sizes[size];
};

const getVariantStyles = (variant: TextInputVariant, theme: any) => {
  const variants = {
    default: css`
      background: ${theme.background.secondary};
      border: 1px solid ${theme.border.color.primary};
      border-radius: ${theme.border.radius.lg};
    `,
    filled: css`
      background: ${theme.background.tertiary};
      border: 1px solid transparent;
      border-radius: ${theme.border.radius.lg};
    `,
    underlined: css`
      background: transparent;
      border: none;
      border-bottom: 2px solid ${theme.border.color.primary};
      border-radius: 0;
      padding-left: 0;
      padding-right: 0;
    `,
  };
  return variants[variant];
};

const getStateStyles = (state: TextInputState, theme: any) => {
  const states = {
    default: css`
      border-color: ${theme.border.color.primary};

      &:hover:not(:disabled) {
        border-color: ${theme.border.color.secondary};
      }

      &:focus {
        outline: none;
        border-color: ${theme.colors.primary[500]};
        box-shadow: ${theme.shadows.focusPrimary};
      }
    `,
    error: css`
      border-color: ${theme.colors.semantic.error[300]};

      &:hover:not(:disabled) {
        border-color: ${theme.colors.semantic.error[400]};
      }

      &:focus {
        outline: none;
        border-color: ${theme.colors.semantic.error[500]};
        box-shadow: ${theme.shadows.focusError};
      }
    `,
    success: css`
      border-color: ${theme.colors.semantic.success[300]};

      &:hover:not(:disabled) {
        border-color: ${theme.colors.semantic.success[400]};
      }

      &:focus {
        outline: none;
        border-color: ${theme.colors.semantic.success[500]};
        box-shadow: ${theme.shadows.focusSuccess};
      }
    `,
    warning: css`
      border-color: ${theme.colors.semantic.warning[300]};

      &:hover:not(:disabled) {
        border-color: ${theme.colors.semantic.warning[400]};
      }

      &:focus {
        outline: none;
        border-color: ${theme.colors.semantic.warning[500]};
        box-shadow: ${theme.shadows.focusWarning};
      }
    `,
  };
  return states[state];
};

const Container = styled.div<{ $fullWidth: boolean }>`
  display: inline-flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1.5]};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const Label = styled.label<{ $required: boolean; $disabled: boolean }>`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme, $disabled }) => ($disabled ? theme.text.disabled : theme.text.primary)};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};

  ${({ $required }) =>
    $required &&
    css`
      &::after {
        content: ' *';
        color: ${({ theme }) => theme.colors.semantic.error[500]};
      }
    `}
`;

const InputWrapper = styled.div<{
  $size: TextInputSize;
  $variant: TextInputVariant;
  $state: TextInputState;
  $disabled: boolean;
  $hasLeftIcon: boolean;
  $hasRightIcon: boolean;
  $hasLeftAddon: boolean;
  $hasRightAddon: boolean;
}>`
  position: relative;
  display: flex;
  align-items: center;
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ $size }) => getSizeStyles($size)}
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  ${({ $state, theme }) => getStateStyles($state, theme)}

  ${({ $disabled, theme }) =>
    $disabled &&
    css`
      opacity: 0.6;
      cursor: not-allowed;
      background: ${theme.background.disabled};
    `}

  ${({ $hasLeftAddon, $hasRightAddon, theme }) => {
    if ($hasLeftAddon && $hasRightAddon) {
      return css`
        border-radius: 0;
      `;
    }
    if ($hasLeftAddon) {
      return css`
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-left: none;
      `;
    }
    if ($hasRightAddon) {
      return css`
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        border-right: none;
      `;
    }
    return '';
  }}
`;

const StyledInput = styled.input<{
  $size: TextInputSize;
  $hasLeftIcon: boolean;
  $hasRightIcon: boolean;
}>`
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.typography.family.sans};
  font-size: inherit;
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};

  &::placeholder {
    color: ${({ theme }) => theme.text.quaternary};
  }

  &:disabled {
    cursor: not-allowed;
    color: ${({ theme }) => theme.text.disabled};
  }

  ${({ $hasLeftIcon, theme, $size }) =>
    $hasLeftIcon &&
    css`
      padding-left: ${$size === 'sm'
        ? theme.spacing[8]
        : $size === 'lg'
          ? theme.spacing[12]
          : theme.spacing[10]};
    `}

  ${({ $hasRightIcon, theme, $size }) =>
    $hasRightIcon &&
    css`
      padding-right: ${$size === 'sm'
        ? theme.spacing[8]
        : $size === 'lg'
          ? theme.spacing[12]
          : theme.spacing[10]};
    `}
`;

const IconContainer = styled.div<{
  $position: 'left' | 'right';
  $size: TextInputSize;
}>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.text.tertiary};
  pointer-events: none;
  z-index: 1;

  ${({ $position, $size, theme }) => {
    const spacing =
      $size === 'sm' ? theme.spacing[3] : $size === 'lg' ? theme.spacing[4] : theme.spacing[3];
    return $position === 'left'
      ? css`
          left: ${spacing};
        `
      : css`
          right: ${spacing};
        `;
  }}

  svg {
    width: ${({ $size }) => ($size === 'sm' ? '16px' : $size === 'lg' ? '20px' : '18px')};
    height: ${({ $size }) => ($size === 'sm' ? '16px' : $size === 'lg' ? '20px' : '18px')};
  }
`;

const Addon = styled.div<{
  $position: 'left' | 'right';
  $size: TextInputSize;
  $variant: TextInputVariant;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.background.tertiary};
  border: 1px solid ${({ theme }) => theme.border.color.primary};
  color: ${({ theme }) => theme.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  white-space: nowrap;

  ${({ $size, theme }) => {
    const styles = getSizeStyles($size);
    return css`
      ${styles}
      padding-left: ${theme.spacing[3]};
      padding-right: ${theme.spacing[3]};
    `;
  }}

  ${({ $position, $variant, theme }) => {
    if ($variant === 'underlined') {
      return css`
        background: transparent;
        border: none;
        border-bottom: 2px solid ${theme.border.color.primary};
        border-radius: 0;
      `;
    }

    return $position === 'left'
      ? css`
          border-top-left-radius: ${theme.border.radius.lg};
          border-bottom-left-radius: ${theme.border.radius.lg};
          border-right: none;
        `
      : css`
          border-top-right-radius: ${theme.border.radius.lg};
          border-bottom-right-radius: ${theme.border.radius.lg};
          border-left: none;
        `;
  }}
`;

const AddonGroup = styled.div`
  display: flex;
  align-items: stretch;
  width: 100%;
`;

const HelperText = styled.div<{ $state: TextInputState }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  color: ${({ theme, $state }) => {
    switch ($state) {
      case 'error':
        return theme.colors.semantic.error[600];
      case 'success':
        return theme.colors.semantic.success[600];
      case 'warning':
        return theme.colors.semantic.warning[600];
      default:
        return theme.text.tertiary;
    }
  }};
`;

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

    const input = (
      <StyledInput
        ref={ref}
        id={inputId}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        data-testid={dataTestId}
        $size={size}
        $hasLeftIcon={!!leftIcon}
        $hasRightIcon={!!rightIcon}
        aria-invalid={effectiveState === 'error'}
        aria-describedby={effectiveHelperText ? `${inputId}-helper` : undefined}
        {...props}
      />
    );

    const inputWithIcons = (
      <InputWrapper
        $size={size}
        $variant={variant}
        $state={effectiveState}
        $disabled={disabled}
        $hasLeftIcon={!!leftIcon}
        $hasRightIcon={!!rightIcon}
        $hasLeftAddon={!!leftAddon}
        $hasRightAddon={!!rightAddon}
      >
        {leftIcon && (
          <IconContainer $position='left' $size={size}>
            {leftIcon}
          </IconContainer>
        )}
        {input}
        {rightIcon && (
          <IconContainer $position='right' $size={size}>
            {rightIcon}
          </IconContainer>
        )}
      </InputWrapper>
    );

    const inputWithAddons =
      leftAddon || rightAddon ? (
        <AddonGroup>
          {leftAddon && (
            <Addon $position='left' $size={size} $variant={variant}>
              {leftAddon}
            </Addon>
          )}
          {inputWithIcons}
          {rightAddon && (
            <Addon $position='right' $size={size} $variant={variant}>
              {rightAddon}
            </Addon>
          )}
        </AddonGroup>
      ) : (
        inputWithIcons
      );

    return (
      <Container className={className} $fullWidth={fullWidth}>
        {label && (
          <Label htmlFor={inputId} $required={required} $disabled={disabled}>
            {label}
          </Label>
        )}
        {inputWithAddons}
        {effectiveHelperText && (
          <HelperText $state={effectiveState} id={`${inputId}-helper`}>
            {effectiveHelperText}
          </HelperText>
        )}
      </Container>
    );
  }
);

TextInput.displayName = 'TextInput';
