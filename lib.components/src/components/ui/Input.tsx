import React, { useId } from 'react';
import styled from 'styled-components';
import { InputProps } from '../../types';

interface StyledInputWrapperProps {
  $hasError: boolean;
  $variant: 'default' | 'success' | 'error';
  $size: 'sm' | 'md' | 'lg';
  $isFullWidth: boolean;
}

const InputWrapper = styled.div<{ $isFullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  width: ${props => (props.$isFullWidth ? '100%' : 'auto')};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const InputLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.text.primary};
`;

const RequiredIndicator = styled.span`
  color: ${({ theme }) => theme.text.error};
  margin-left: ${({ theme }) => theme.spacing.xs};
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  width: 100%;
`;

const StyledInput = styled.input<StyledInputWrapperProps>`
  width: 100%;
  background-color: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.text.primary};
  border: ${({ theme }) => theme.border.width.thin} solid
    ${({ theme, $hasError, $variant }) => {
      if ($hasError || $variant === 'error') return theme.border.color.error;
      if ($variant === 'success') return theme.colors.semantic.success[500];
      return theme.border.color.secondary;
    }};
  border-radius: ${({ theme }) => theme.border.radius.md};
  outline: none;
  transition: all ${({ theme }) => theme.transitions.fast};
  font-family: ${({ theme }) => theme.typography.family.sans};

  &:focus {
    border-color: ${({ theme, $hasError, $variant }) => {
      if ($hasError || $variant === 'error') return theme.border.color.error;
      if ($variant === 'success') return theme.colors.semantic.success[500];
      return theme.border.color.focus;
    }};
    box-shadow: 0 0 0 2px
      ${({ theme, $hasError, $variant }) => {
        if ($hasError || $variant === 'error') return `${theme.background.error}40`;
        if ($variant === 'success') return `${theme.colors.semantic.success[500]}40`;
        return `${theme.background.secondary}40`;
      }};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.background.disabled};
    cursor: not-allowed;
    opacity: 0.6;
  }

  &::placeholder {
    color: ${({ theme }) => theme.text.secondary};
  }

  /* Apply size styles */
  ${({ $size, theme }) => {
    switch ($size) {
      case 'sm':
        return `
          padding: ${theme.spacing.xs} ${theme.spacing.sm};
          font-size: ${theme.typography.size.sm};
        `;
      case 'lg':
        return `
          padding: ${theme.spacing.sm} ${theme.spacing.md};
          font-size: ${theme.typography.size.lg};
        `;
      default:
        return `
          padding: ${theme.spacing.sm} ${theme.spacing.md};
          font-size: ${theme.typography.size.base};
        `;
    }
  }}

  /* Make room for icons if present */
  ${({ theme }) => `
    &.has-start-icon {
      padding-left: ${theme.spacing.xl};
    }
    
    &.has-end-icon {
      padding-right: ${theme.spacing.xl};
    }
  `}
`;

const IconWrapper = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: ${({ theme }) => theme.text.secondary};
`;

const StartIconWrapper = styled(IconWrapper)`
  left: ${({ theme }) => theme.spacing.sm};
`;

const EndIconWrapper = styled(IconWrapper)`
  right: ${({ theme }) => theme.spacing.sm};
`;

const HelperText = styled.p<{ $hasError: boolean }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  margin-top: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme, $hasError }) => ($hasError ? theme.text.error : theme.text.secondary)};
`;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
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
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hasError = !!error;
    const helpText = error || helperText;
    const helperId = helpText ? `${inputId}-helper` : undefined;

    // Determine the actual variant - error takes precedence
    const actualVariant = hasError ? 'error' : variant;

    const startIconClass = startIcon ? 'has-start-icon' : '';
    const endIconClass = endIcon ? 'has-end-icon' : '';

    return (
      <InputWrapper $isFullWidth={isFullWidth}>
        {label && (
          <InputLabel htmlFor={inputId}>
            {label}
            {required && <RequiredIndicator>*</RequiredIndicator>}
          </InputLabel>
        )}

        <InputContainer>
          {startIcon && <StartIconWrapper>{startIcon}</StartIconWrapper>}

          <StyledInput
            id={inputId}
            ref={ref}
            $hasError={hasError}
            $variant={actualVariant}
            $size={size}
            $isFullWidth={isFullWidth}
            className={`${className} ${startIconClass} ${endIconClass}`.trim()}
            aria-invalid={hasError}
            aria-describedby={helperId}
            required={required}
            {...props}
          />

          {endIcon && <EndIconWrapper>{endIcon}</EndIconWrapper>}
        </InputContainer>

        {helpText && (
          <HelperText id={helperId} $hasError={hasError}>
            {helpText}
          </HelperText>
        )}
      </InputWrapper>
    );
  }
);

Input.displayName = 'Input';
